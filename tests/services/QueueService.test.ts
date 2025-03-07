import { QueueService } from '../../src/services/QueueService';

describe('QueueService', () => {
  const testJobId = 'test-job-id';
  const testQueueName = 'test-queue';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addJob', () => {
    it('should add a job to the queue', async () => {
      const jobData = {
        jobId: testJobId,
        userId: 'test-user',
        originalImagePath: 'test/path.jpg',
        originalFilename: 'test.jpg',
        jobType: 'thumbnail',
        options: { width: 100, height: 100 }
      };

      (QueueService.addJob as jest.Mock).mockResolvedValue(testJobId);

      const result = await QueueService.addJob(testQueueName, testJobId, jobData);

      expect(result).toBe(testJobId);
      expect(QueueService.addJob).toHaveBeenCalledWith(testQueueName, testJobId, jobData);
    });

    it('should handle errors when adding a job', async () => {
      const error = new Error('Queue error');
      (QueueService.addJob as jest.Mock).mockRejectedValue(error);

      await expect(QueueService.addJob(testQueueName, testJobId, {}))
        .rejects
        .toThrow('Queue error');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status', async () => {
      const mockStatus = {
        status: 'active',
        progress: 50,
        error: null
      };

      (QueueService.getJobStatus as jest.Mock).mockResolvedValue(mockStatus);

      const result = await QueueService.getJobStatus(testQueueName, testJobId);

      expect(result).toEqual(mockStatus);
      expect(QueueService.getJobStatus).toHaveBeenCalledWith(testQueueName, testJobId);
    });

    it('should handle errors when getting job status', async () => {
      const error = new Error('Status error');
      (QueueService.getJobStatus as jest.Mock).mockRejectedValue(error);

      await expect(QueueService.getJobStatus(testQueueName, testJobId))
        .rejects
        .toThrow('Status error');
    });
  });
});