import { Queue, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { logger } from '../config/logger';

export class QueueServiceWrapper {
  private static instance: QueueServiceWrapper;
  private queues: Map<string, Queue>;
  private isInitialized: boolean;

  private constructor() {
    this.queues = new Map();
    this.isInitialized = false;
    this.initialize();
    logger.info('QueueServiceWrapper instance created');
  }

  private initialize() {
    try {
      logger.info('Initializing QueueServiceWrapper...');
      // Test connection by creating a test queue
      const testQueue = new Queue('test', { connection: redisConnection });
      testQueue.close();
      this.isInitialized = true;
      logger.info('QueueServiceWrapper initialized successfully');
    } catch (error) {
      this.isInitialized = false;
      logger.error('Failed to initialize QueueServiceWrapper:', { error });
    }
  }

  public static getInstance(): QueueServiceWrapper {
    if (!QueueServiceWrapper.instance) {
      logger.info('Creating new QueueServiceWrapper instance');
      QueueServiceWrapper.instance = new QueueServiceWrapper();
    }
    return QueueServiceWrapper.instance;
  }

  public getQueue(queueName: string): Queue {
    logger.debug('Getting queue', { queueName });

    if (!this.isInitialized) {
      logger.error('Queue service not initialized', { queueName });
      throw new Error('Queue service not initialized. Check Redis connection.');
    }

    if (!this.queues.has(queueName)) {
      logger.info('Creating new queue', { queueName });
      try {
        const queue = new Queue(queueName, { connection: redisConnection });
        this.queues.set(queueName, queue);
        logger.info('Queue created successfully', { queueName });
      } catch (error) {
        logger.error('Failed to create queue', { queueName, error });
        throw error;
      }
    }

    return this.queues.get(queueName) as Queue;
  }

  public async addJob<T>(queueName: string, jobName: string, data: T, opts = {}): Promise<Job<T>> {
    logger.info('Adding job to queue', { queueName, jobName, data, opts });

    try {
      if (!this.isInitialized) {
        logger.error('Queue service not initialized', { queueName, jobName });
        throw new Error('Queue service not initialized. Check Redis connection.');
      }

      const queue = this.getQueue(queueName);
      const job = await queue.add(jobName, data, opts);
      logger.info('Job added successfully', { queueName, jobName, jobId: job.id });
      return job;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to add job to queue', { queueName, jobName, error: errorMessage });
      throw new Error(`Failed to add job to queue ${queueName}: ${errorMessage}`);
    }
  }

  public async getJobStatus(queueName: string, jobId: string): Promise<string | null> {
    logger.info('Getting job status', { queueName, jobId });

    try {
      if (!this.isInitialized) {
        logger.error('Queue service not initialized', { queueName, jobId });
        throw new Error('Queue service not initialized. Check Redis connection.');
      }

      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        logger.warn('Job not found', { queueName, jobId });
        return null;
      }

      const [isCompleted, isFailed, isActive, isDelayed, isWaiting] = await Promise.all([
        job.isCompleted(),
        job.isFailed(),
        job.isActive(),
        job.isDelayed(),
        job.isWaiting()
      ]);

      let status = 'unknown';
      if (isFailed) status = 'failed';
      else if (isCompleted) status = 'completed';
      else if (isActive) status = 'active';
      else if (isDelayed) status = 'delayed';
      else if (isWaiting) status = 'waiting';

      logger.info('Job status retrieved', { queueName, jobId, status });
      return status;
    } catch (error) {
      logger.error('Error getting job status', { queueName, jobId, error });
      return null;
    }
  }
}

// Export a Singleton instance of QueueServiceWrapper
export const QueueService = QueueServiceWrapper.getInstance();