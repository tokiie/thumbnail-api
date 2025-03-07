import multer from 'multer';
import path from 'path';
import { config } from './index';
import fs from 'fs';

const tempUploadsDir = path.join(config.tempDir, 'uploads');
if (!fs.existsSync(tempUploadsDir)) {
  fs.mkdirSync(tempUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const allowedExtensions = new RegExp(
  process.env.SUPPORTED_IMAGE_FORMATS?.split(',')
    .map(ext => ext.trim())
    .join('|') || 'jpeg|jpg|png|gif|webp|bmp|tiff',
  'i'
);

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedExtensions.test(file.mimetype);

  //check if file does not exist
  if (!file) {
    return cb(new Error('No file uploaded'));
  }

  // check if the file size is too large
  if (file.size > parseInt(process.env.MAX_FILE_SIZE || '10485760')) {
    return cb(new Error('File too large'));
  }

  if (extname && mimetype) {
    return cb(null, true);
  }

  cb(new Error(`Invalid file format: ${file.mimetype}. Allowed formats: ${process.env.SUPPORTED_IMAGE_FORMATS || 'jpeg, jpg, png, gif, webp, bmp, tiff'}.`));
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // Default to 10MB if not set
  }
});

export const uploadMiddleware = (req: any, res: any, next: any) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large'
        });
      }
      return res.status(400).json({
        error: err.message
      });
    } else if (err) {
      return res.status(400).json({
        error: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    next();
  });
};