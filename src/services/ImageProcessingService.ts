import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { ImageJobOptions, ImageJobType } from '../types';
import { error } from 'console';

export class ImageProcessingService {
  async processImage(
    inputPath: string,
    outputPath: string,
    jobType: ImageJobType,
    options: ImageJobOptions
  ): Promise<string> {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
//
    let pipeline = sharp(inputPath);

    if (jobType === ImageJobType.THUMBNAIL) {
      pipeline = pipeline.resize({
        width: options.width || parseInt(process.env.THUMBNAIL_WIDTH || '100'),
        height: options.height || parseInt(process.env.THUMBNAIL_HEIGHT || '100'),
        fit: 'cover',
        position: 'center'
      });
    } else {
      throw new Error(`Unsupported job type: ${jobType}`);
    }

    await pipeline.toFile(outputPath);

    return outputPath;
  }
}
