import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { logger } from '../config/logger';

interface ProcessImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'tiff';
}

interface ProcessImageResult {
  path: string;
  url: string;
}

export async function processImage(
  imagePath: string,
  options: ProcessImageOptions = {}
): Promise<ProcessImageResult> {
  logger.info('Processing image', { imagePath, options });

  try {
    const {
      width = 200,
      height = 200,
      quality = 80,
      format = 'jpeg'
    } = options;

    // Ensure the uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const processedDir = path.join(uploadsDir, 'processed');
    if (!fs.existsSync(processedDir)) {
      logger.debug('Creating processed directory', { dir: processedDir });
      fs.mkdirSync(processedDir, { recursive: true });
    }

    // Generate output filename
    const originalName = path.basename(imagePath, path.extname(imagePath));
    const outputFilename = `${originalName}_${width}x${height}.${format}`;
    const outputPath = path.join(processedDir, outputFilename);

    logger.debug('Processing image with sharp', {
      input: imagePath,
      output: outputPath,
      width,
      height,
      quality,
      format
    });

    // Process the image
    await sharp(imagePath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .toFormat(format, { quality })
      .toFile(outputPath);

    logger.info('Image processed successfully', { outputPath });

    // Generate URL (this should be configurable based on your setup)
    const url = `/uploads/processed/${outputFilename}`;

    return {
      path: outputPath,
      url
    };
  } catch (error) {
    logger.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
}