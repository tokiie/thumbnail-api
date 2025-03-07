import request from 'supertest';
import { app } from '../src/app';
import path from 'path';

describe('File Validation Tests', () => {
  const testImagesDir = path.join(__dirname, 'images');
  const validUserId = 'test-user-123';

  describe('Valid File Formats', () => {
    it('should accept JPEG files', async () => {
      const response = await request(app)
        .post('/api/image-processing/jobs')
        .field('userId', validUserId)
        .attach('image', path.join(testImagesDir, 'test_image.jpg'));

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body.status).toBe('processing');
    });

    it('should accept PNG files', async () => {
      const response = await request(app)
        .post('/api/image-processing/jobs')
        .field('userId', validUserId)
        .attach('image', path.join(testImagesDir, 'test_image_1MB.png'));

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body.status).toBe('processing');
    });

    it('should accept GIF files', async () => {
      const response = await request(app)
        .post('/api/image-processing/jobs')
        .field('userId', validUserId)
        .attach('image', path.join(testImagesDir, 'test_image_500kB.gif'));

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body.status).toBe('processing');
    });

    it('should accept WebP files', async () => {
      const response = await request(app)
        .post('/api/image-processing/jobs')
        .field('userId', validUserId)
        .attach('image', path.join(testImagesDir, 'test_image_500kB.webp'));

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body.status).toBe('processing');
    });
  });

  describe('Invalid File Formats', () => {
    it('should reject SVG files', async () => {
      try {
        const response = await request(app)
          .post('/api/image-processing/jobs')
          .field('userId', validUserId)
          .attach('image', path.join(testImagesDir, 'test_image.svg'));

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Invalid file format');
      } catch (error: any) {
        // If the connection is reset, the test should still pass
        // as we're expecting the SVG to be rejected
        expect(error.code).toMatch(/ECONNRESET|EPIPE/);
      }
    });
  });

  describe('File Size Limits', () => {
    it('should accept files under 1MB', async () => {
      const response = await request(app)
        .post('/api/image-processing/jobs')
        .field('userId', validUserId)
        .attach('image', path.join(testImagesDir, 'test_image_500kB.webp'));

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('jobId');
    });

    it('should accept files around 1MB', async () => {
      const response = await request(app)
        .post('/api/image-processing/jobs')
        .field('userId', validUserId)
        .attach('image', path.join(testImagesDir, 'test_image_1MB.png'));

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('jobId');
    });
  });

  describe('Missing or Invalid Fields', () => {
    it('should reject requests without image file', async () => {
      const response = await request(app)
        .post('/api/image-processing/jobs')
        .field('userId', validUserId);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should reject requests without userId', async () => {
      const response = await request(app)
        .post('/api/image-processing/jobs')
        .attach('image', path.join(testImagesDir, 'test_image.jpg'));

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Missing required fields');
    });
  });
});