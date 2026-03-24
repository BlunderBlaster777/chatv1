import fs from 'fs';
import path from 'path';
import { config } from '../config/config';

export class StorageService {
  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(config.uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getFileUrl(filename: string): string {
    return `/api/files/${filename}`;
  }
}
