import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);
const unlink = promisify(fs.unlink);

export async function cleanupTempFiles(directory: string): Promise<void> {
  try {
    if (fs.existsSync(directory)) {
      const files = fs.readdirSync(directory);

      for (const file of files) {
        await unlink(path.join(directory, file));
      }

      fs.rmdirSync(directory);
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
}

export async function ensureDirectoryExists(directory: string): Promise<void> {
  if (!fs.existsSync(directory)) {
    await mkdir(directory, { recursive: true });
  }
}