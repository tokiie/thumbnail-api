import { Request, Response } from 'express';
import { QueueServiceWrapper } from '../services/QueueService';
import ImageJobModel from '../models/ImageJob';
import { ImageJobType, JobStatus } from '../types';
import mongoose from 'mongoose';
import { logger } from '../config/logger';

export class ImageProcessingController {
  private queueServiceInstance: QueueServiceWrapper;

  constructor(queueService: QueueServiceWrapper) {
    this.queueServiceInstance = queueService;
    // Bind methods to maintain 'this' context
    this.createJob = this.createJob.bind(this);
    this.getJobStatus = this.getJobStatus.bind(this);
    this.getUserJobs = this.getUserJobs.bind(this);
    logger.info('ImageProcessingController initialized');
  }

  async createJob(req: Request, res: Response): Promise<void> {
    logger.info('Creating new image processing job', {
      userId: req.body.userId,
      filename: req.file?.originalname,
      options: req.body.options
    });

    try {
      const { userId, options = {} } = req.body;

      if (!userId) {
        logger.warn('Missing userId in request');
        res.status(400).json({
          error: 'Missing required fields'
        });
        return;
      }

      if (!req.file) {
        logger.warn('No file uploaded in request');
        res.status(400).json({
          error: 'No file uploaded'
        });
        return;
      }

      logger.debug('Creating image job record', {
        userId,
        filename: req.file.originalname,
        path: req.file.path
      });

      const imageJob = new ImageJobModel({
        userId,
        originalImagePath: req.file.path,
        originalFilename: req.file.originalname,
        jobType: ImageJobType.THUMBNAIL,
        options: options || {},
        status: JobStatus.PROCESSING,
        progress: 0
      });

      await imageJob.save();
      logger.info('Image job record created', { jobId: imageJob._id });

      logger.debug('Adding job to queue', {
        jobId: imageJob._id,
        queueName: 'image-processing',
        jobType: 'thumbnail'
      });

      const jobId = await this.queueServiceInstance.addJob('image-processing', 'thumbnail', {
        jobId: imageJob._id.toString(),
        originalImagePath: req.file.path,
        userId,
        jobType: ImageJobType.THUMBNAIL,
        options
      });

      logger.info('Job successfully queued', { jobId: imageJob._id });

      res.status(201).json({
        jobId: imageJob._id,
        status: JobStatus.PROCESSING,
        originalFilename: req.file.originalname
      });
    } catch (error) {
      logger.error('Error creating job:', error);
      res.status(500).json({
        error: 'Failed to create job',
        status: 500
      });
    }
  }

  async getJobStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    logger.info('Getting job status', { jobId });

    try {
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        logger.warn('Invalid job ID format', { jobId });
        res.status(404).json({ error: 'Invalid job ID format' });
        return;
      }

      const job = await ImageJobModel.findById(jobId);

      if (!job) {
        logger.warn('Job not found', { jobId });
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      logger.debug('Fetching queue status', { jobId });
      // Handle both the instance method and static method for testing
      const getJobStatusMethod = this.queueServiceInstance.getJobStatus || this.queueServiceInstance;

      const queueStatus = await getJobStatusMethod('image-processing', jobId);
      logger.info('Job status retrieved', { jobId, status: job.status, queueStatus });

      res.status(200).json({
        jobId: job._id.toString(),
        userId: job.userId,
        originalFilename: job.originalFilename,
        resultImageUrl: job.resultImageUrl,
        jobType: job.jobType,
        options: job.options,
        status: job.status,
        progress: job.progress,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        queueInfo: queueStatus
      });
    } catch (error: any) {
      logger.error('Error getting job status:', { jobId, error });
      res.status(500).json({ error: 'Failed to get job status', message: error.message });
    }
  }

  async getUserJobs(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const { status, limit = '20', page = '1' } = req.query || {};

    logger.info('Getting user jobs', { userId, status, limit, page });

    try {
      const skip = (Number(page) - 1) * Number(limit);

      const query: any = { userId };
      if (status && Object.values(JobStatus).includes(status as JobStatus)) {
        query.status = status;
      }

      logger.debug('Querying jobs with parameters', { query, skip, limit });

      const jobs = await ImageJobModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await ImageJobModel.countDocuments(query);

      logger.info('User jobs retrieved', {
        userId,
        jobCount: jobs.length,
        totalJobs: total,
        page: Number(page),
        limit: Number(limit)
      });

      res.status(200).json({
        jobs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      logger.error('Error getting user jobs:', { userId, error });
      res.status(500).json({ error: 'Failed to get user jobs', message: error.message });
    }
  }
}
