import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { config } from '../config';

const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);

export class StorageService {
  async uploadFile(sourcePath: string, destinationKey: string): Promise<string> {
    const targetDir = path.join(config.uploadsDir, path.dirname(destinationKey));
    await mkdir(targetDir, { recursive: true });

    const destPath = path.join(config.uploadsDir, destinationKey);
    await copyFile(sourcePath, destPath);

    return `${config.baseUrl}/uploads/${destinationKey}`;
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(config.uploadsDir, key);
    if (fs.existsSync(filePath)) {
      await promisify(fs.unlink)(filePath);
    }
  }
}
