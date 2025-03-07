import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';

const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|tiff/i;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', 'original');

        fs.access(uploadPath, fs.constants.F_OK, (err) => {
            if (err) {
                fs.mkdir(uploadPath, { recursive: true }, (mkdirErr) => {
                    if (mkdirErr) {
                        return cb(mkdirErr, "");
                    }
                    cb(null, uploadPath);
                });
            } else {
                cb(null, uploadPath);
            }
        });
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    }

    cb(new Error(`Invalid file format: ${file.mimetype}. Only JPEG, JPG,PNG, GIF, WebP, BMP, and TIFF are allowed.`));
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

export const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                error: 'File upload error',
                details: err.message
            });
        } else if (err) {
            return res.status(400).json({
                error: 'Upload failed',
                details: err.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded or unsupported file format'
            });
        }

        next();
    });
};