export enum JobStatus {
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

export enum ImageJobType {
    THUMBNAIL = 'thumbnail',
    // RESIZE = 'resize',
    // CROP = 'crop',
    // WATERMARK = 'watermark',
}

export interface ImageJobOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
}

export interface ImageJob {
    userId: string;
    originalImagePath: string;
    resultImageUrl?: string;
    jobType: ImageJobType;
    options: ImageJobOptions;
    status: JobStatus;
    progress: number;
    error?: string;
    createdAt?: Date;
    updatedAt?: Date;
    originalFilename?: string;
  }