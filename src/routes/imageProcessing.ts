import express from 'express';
import { ImageProcessingController } from '../controllers/imageProcessingController';
import { uploadMiddleware } from '../config/multer';
import { QueueService } from '../services/QueueService';

const router = express.Router();
const controller = new ImageProcessingController(QueueService);

// Create a new job - first upload the file, then validate userId
router.post('/jobs', uploadMiddleware, controller.createJob);

// Get job status
router.get('/jobs/:jobId', controller.getJobStatus);

// Get user's jobs
router.get('/users/:userId/jobs', controller.getUserJobs);

export default router;