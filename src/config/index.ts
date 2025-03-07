import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/image-processing-api',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads'),
  tempDir: process.env.TEMP_DIR || path.join(__dirname, '../../temp'),
  startWorker: 'true',
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY) || 5
};