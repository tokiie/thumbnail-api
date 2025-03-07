import { Request, Response } from 'express';
import { ImageProcessingController } from '../../src/controllers/imageProcessingController';
import { QueueService } from '../../src/services/QueueService';
import ImageJobModel from '../../src/models/ImageJob';
import { JobStatus } from '../../src/types';
import { Readable } from 'stream';
import { Express } from 'express';

describe('ImageProcessingController', () => {
  let controller: ImageProcessingController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  const testUserId = 'test-user-123';

  beforeEach(() => {
    controller = new ImageProcessingController(QueueService);
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('createJob', () => {
    it('should create a new job successfully', async () => {
      const mockFile = {
        fieldname: 'image',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        path: 'test/path.jpg',
        destination: 'test',
        filename: 'test.jpg',
        buffer: Buffer.from('test image content'),
        stream: new Readable()
      } as Express.Multer.File;

      mockReq = {
        body: {
          userId: testUserId,
          options: { width: 100, height: 100 }
        },
        file: mockFile
      };

      const mockJobId = 'mock-job-id';
      (QueueService.addJob as jest.Mock).mockResolvedValue(mockJobId);

      await controller.createJob(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: JobStatus.PROCESSING,
          originalFilename: 'test.jpg'
        })
      );
      expect(QueueService.addJob).toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      mockReq = {
        body: {
          options: { width: 100, height: 100 }
        }
      };

      await controller.createJob(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required fields'
      });
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for existing job', async () => {
      const mockJob = await ImageJobModel.create({
        userId: testUserId,
        originalImagePath: 'test/path.jpg',
        originalFilename: 'test.jpg',
        jobType: 'thumbnail',
        status: JobStatus.PROCESSING,
        progress: 50
      });

      mockReq = {
        params: { jobId: mockJob._id.toString() }
      };

      const mockQueueStatus = { status: 'active', progress: 50 };
      (QueueService.getJobStatus as jest.Mock).mockResolvedValue(mockQueueStatus);

      await controller.getJobStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];

      // Verify the response structure and values
      expect(response).toMatchObject({
        jobId: mockJob._id.toString(),
        userId: testUserId,
        originalFilename: 'test.jpg',
        resultImageUrl: undefined,
        jobType: 'thumbnail',
        options: {},
        status: JobStatus.PROCESSING,
        progress: 50,
        error: undefined,
        queueInfo: mockQueueStatus
      });

    });
    it('should return 404 for invalid job ID', async () => {
      mockReq = {
        params: { jobId: 'invalid-id' }
      };

      await controller.getJobStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid job ID format'
      });
    });

    it('should return 404 for non-existent job', async () => {
      mockReq = {
        params: { jobId: '507f1f77bcf86cd799439011' }
      };

      await controller.getJobStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Job not found'
      });
    });
  });

  describe('getUserJobs', () => {
    beforeEach(async () => {
      await ImageJobModel.create([
        {
          userId: testUserId,
          originalImagePath: 'test/path1.jpg',
          originalFilename: 'test1.jpg',
          jobType: 'thumbnail',
          status: JobStatus.COMPLETED,
          progress: 100
        },
        {
          userId: testUserId,
          originalImagePath: 'test/path2.jpg',
          originalFilename: 'test2.jpg',
          jobType: 'thumbnail',
          status: JobStatus.PROCESSING,
          progress: 50
        }
      ]);
    });

    it('should return all jobs for a user', async () => {
      mockReq = {
        params: { userId: testUserId },
        query: {}
      };

      await controller.getUserJobs(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          jobs: expect.arrayContaining([
            expect.objectContaining({
              userId: testUserId,
              originalFilename: expect.any(String),
              jobType: 'thumbnail',
              status: expect.any(String),
              progress: expect.any(Number)
            })
          ]),
          pagination: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            pages: expect.any(Number)
          })
        })
      );
    });

    it('should filter jobs by status', async () => {
      mockReq = {
        params: { userId: testUserId },
        query: { status: 'completed' }
      };

      await controller.getUserJobs(mockReq as Request, mockRes as Response);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.jobs).toHaveLength(1);
      expect(response.jobs[0].status).toBe(JobStatus.COMPLETED);
    });

    it('should handle pagination', async () => {
      mockReq = {
        params: { userId: testUserId },
        query: { limit: '1', page: '1' }
      };

      await controller.getUserJobs(mockReq as Request, mockRes as Response);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.jobs).toHaveLength(1);
      expect(response.pagination).toEqual({
        page: 1,
        limit: 1,
        total: 2,
        pages: 2
      });
    });
  });
});