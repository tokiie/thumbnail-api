import express, { NextFunction, Request, Response } from 'express';
import imageProcessingRoutes from './routes/imageProcessing';
import { config } from './config';
import { logger } from './config/logger';

export const app = express();

app.use((req: Request, res: Response, next: NextFunction) => {
  logger.httpRequest(req);
  next();
});

app.use(express.json());

app.use('/uploads', express.static(config.uploadsDir));

app.use('/api/image-processing', imageProcessingRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.errorWithStack(err, 'Error in request handler');

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: err.message || 'Internal Server Error',
    status: 500
  });
});