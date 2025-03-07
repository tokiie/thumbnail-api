import mongoose from 'mongoose';
import { app } from './app';
import { config } from './config';
import { createImageProcessingWorker } from './workers/workerFactory';
import { redisConnection } from './config/redis';
import { logger } from './config/logger';

mongoose.connect(config.mongoUri)
  .then(() => logger.info('✅ Connected to MongoDB'))
  .catch(err => {
    logger.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

const PORT = config.port || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});

if (config.startWorker) {
  const worker = createImageProcessingWorker(
    'image-processing',
    redisConnection,
    config.workerConcurrency || 5
  );

  logger.info('⚡ Image processing worker started');
}