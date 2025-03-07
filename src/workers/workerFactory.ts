import { Worker, Queue } from 'bullmq';
import { ImageProcessingService } from '../services/ImageProcessingService';
import { StorageService } from '../services/StorageService';
import ImageJobModel from '../models/ImageJob';
import { JobStatus } from '../types';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

export async function createImageProcessingWorker(
  queueName: string,
  redisConnection: any,
  concurrency: number = 5
): Promise<Worker> {
  const imageService = new ImageProcessingService();
  const storageService = new StorageService();
  const queue = new Queue(queueName, { connection: redisConnection });

  // Find all jobs that are stuck in PROCESSING status
  const processingJobs = await ImageJobModel.find({ status: JobStatus.PROCESSING });
  console.log(`Found ${processingJobs.length} jobs in PROCESSING status that need to be retried`);

  // Re-queue these jobs
  for (const job of processingJobs) {
    console.log(`Re-queueing job ${job._id}`);
    try {
      // Add the job back to the queue with the same data
      await queue.add('process-image', {
        jobId: job._id,
        originalImagePath: job.originalImagePath,
        jobType: job.jobType,
        options: job.options,
        userId: job.userId
      }, {
        jobId: `retry-${job._id}`,
        removeOnComplete: true,
        removeOnFail: true
      });

      console.log(`Successfully re-queued job ${job._id}`);
    } catch (error) {
      console.error(`Failed to re-queue job ${job._id}:`, error);
    }
  }

  const worker = new Worker(
    queueName,
    async (job) => {
      try {
        const originalImagePath = job.data.originalImagePath;


        await ImageJobModel.findByIdAndUpdate(
          job.data.jobId,
          {
            status: JobStatus.PROCESSING,
            progress: 30,
            error: null
          }
        );


        await job.updateProgress(30);

        const tempDir = path.join(config.tempDir, job.data.jobId);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }


        const outputFileName = `${job.data.jobId}_thumbnail${path.extname(originalImagePath)}`;
        const outputPath = path.join(tempDir, outputFileName);

        await imageService.processImage(
          originalImagePath,
          outputPath,
          job.data.jobType,
          job.data.options
        );

        await job.updateProgress(70);
        await ImageJobModel.findByIdAndUpdate(
          job.data.jobId,
          { progress: 70 }
        );

        const resultImageUrl = await storageService.uploadFile(
          outputPath,
          `thumbnails/${job.data.userId}/${outputFileName}`
        );

        await job.updateProgress(100);

        await ImageJobModel.findByIdAndUpdate(
          job.data.jobId,
          {
            status: JobStatus.COMPLETED,
            resultImageUrl,
            progress: 100
          }
        );

        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          console.warn(`Failed to clean up temp directory for job ${job.data.jobId}:`, cleanupError);
        }

        return {
          jobId: job.data.jobId,
          resultImageUrl
        };
      } catch (error: any) {
        // Update job status to failed
        await ImageJobModel.findByIdAndUpdate(
          job.data.jobId,
          {
            status: JobStatus.FAILED,
            error: error.message
          }
        );

        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency,
      autorun: true,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 }
    }
  );

  worker.on('completed', async (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', async (job, error) => {
    console.error(`Job ${job?.id} failed with error: ${error.message}`);
  });

  return worker;
}