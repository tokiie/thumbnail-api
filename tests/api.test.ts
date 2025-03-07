import request from 'supertest';
import { app } from '../src/app';
import { QueueService } from '../src/services/QueueService';
import ImageJobModel from '../src/models/ImageJob';
import { JobStatus } from '../src/types';
import path from 'path';
import fs from 'fs';

describe('API Endpoints', () => {
  const testUserId = 'test-user-123';
  const testImagePath = path.join(__dirname, 'test-image.jpg');
  const testUploadsDir = path.join(__dirname, '../../uploads/test');

  beforeAll(() => {
    // Create test uploads directory if it doesn't exist
    if (!fs.existsSync(testUploadsDir)) {
      fs.mkdirSync(testUploadsDir, { recursive: true });
    }
    // Create a test image file
    fs.writeFileSync(testImagePath, 'test image content');
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    if (fs.existsSync(testUploadsDir)) {
      fs.rmSync(testUploadsDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // Clear the database before each test
    await ImageJobModel.deleteMany({});
  });

  describe('POST /api/image-processing/jobs', () => {
    it('should create a new image processing job', async () => {
      const mockJobId = 'mock-job-id';
      (QueueService.addJob as jest.Mock).mockResolvedValue(mockJobId);

      const response = await request(app)
        .post('/api/image-processing/jobs')
        .field('userId', testUserId)
        .field('options', JSON.stringify({ width: 100, height: 100 }))
        .attach('image', testImagePath);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body.status).toBe(JobStatus.PROCESSING);
      expect(response.body.originalFilename).toBe('test-image.jpg');
      expect(QueueService.addJob).toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/image-processing/jobs')
        .field('options', JSON.stringify({ width: 100, height: 100 }));

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/image-processing/jobs')
        .field('userId', testUserId)
        .field('options', JSON.stringify({ width: 100, height: 100 }));

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No file uploaded');
    });
  });

  describe('GET /api/image-processing/jobs/:jobId', () => {
    it('should return job status for existing job', async () => {
      const mockJob = await ImageJobModel.create({
        userId: testUserId,
        originalImagePath: testImagePath,
        originalFilename: 'test-image.jpg',
        jobType: 'thumbnail',
        status: JobStatus.PROCESSING,
        progress: 50
      });

      const mockQueueStatus = { status: 'active', progress: 50 };
      (QueueService.getJobStatus as jest.Mock).mockResolvedValue(mockQueueStatus);

      const response = await request(app)
        .get(`/api/image-processing/jobs/${mockJob._id}`);

      expect(response.status).toBe(200);
      expect(response.body.jobId).toBe(mockJob._id.toString());
      expect(response.body.status).toBe(JobStatus.PROCESSING);
      expect(response.body.queueInfo).toEqual(mockQueueStatus);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/image-processing/jobs/507f1f77bcf86cd799439011'); // Valid ObjectId format but non-existent

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Job not found');
    });
  });

  describe('GET /api/image-processing/users/:userId/jobs', () => {
    beforeEach(async () => {
      // Create test jobs
      await ImageJobModel.create([
        {
          userId: testUserId,
          originalImagePath: testImagePath,
          originalFilename: 'test-image-1.jpg',
          jobType: 'thumbnail',
          status: JobStatus.COMPLETED,
          progress: 100
        },
        {
          userId: testUserId,
          originalImagePath: testImagePath,
          originalFilename: 'test-image-2.jpg',
          jobType: 'thumbnail',
          status: JobStatus.PROCESSING,
          progress: 50
        }
      ]);
    });

    it('should return all jobs for a user', async () => {
      const response = await request(app)
        .get(`/api/image-processing/users/${testUserId}/jobs`);

      expect(response.status).toBe(200);
      expect(response.body.jobs).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter jobs by status', async () => {
      const response = await request(app)
        .get(`/api/image-processing/users/${testUserId}/jobs?status=completed`);

      expect(response.status).toBe(200);
      expect(response.body.jobs).toHaveLength(1);
      expect(response.body.jobs[0].status).toBe(JobStatus.COMPLETED);
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get(`/api/image-processing/users/${testUserId}/jobs?limit=1&page=1`);

      expect(response.status).toBe(200);
      expect(response.body.jobs).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.total).toBe(2);
    });
  });
});