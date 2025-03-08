# Image Processing API

A proof of concept for an asynchronous image processing API built with Node.js, Express, and TypeScript.

## Features

- Asynchronous image processing using BullMQ
- MongoDB for job storage
- Redis for job queue management
- File upload handling with Multer
- Image processing with Sharp
- Docker support for easy deployment

## Prerequisites

- Node.js (v20 or higher)
- MongoDB
- Redis
- Docker (optional)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/tokiie/image-processing-api.git
cd image-processing-api
```

2. Install dependencies:
```bash
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit the `.env` file with your configuration values.

## Running the Application

### Development Mode

1. Start Redis and MongoDB (if running locally)
2. Run the development server:
```bash
yarn dev
```

### Docker Deployment

Build and run with Docker Compose:
```bash
docker-compose up --build
```

## API Endpoints

### Create Image Processing Job

```http
POST /api/image-processing/jobs
Content-Type: multipart/form-data

file: <image_file>
userId: <user_id>
```

Response:
```json
{
  "jobId": "uuid-string",
  "status": "pending",
  "createdAt": "2024-03-07T12:00:00Z"
}
```

### Get Job Status

```http
GET /api/image-processing/jobs/:jobId
```

Response:
```json
{
  "jobId": "uuid-string",
  "status": "completed",
  "result": {
    "thumbnailUrl": "/uploads/thumbnail-uuid.jpg",
    "processedAt": "2024-03-07T12:01:00Z"
  }
}
```

### Get User's Jobs

```http
GET /api/image-processing/users/:userId/jobs
```

Response:
```json
{
  "jobs": [
    {
      "jobId": "uuid-string",
      "status": "completed",
      "result": {
        "thumbnailUrl": "/uploads/thumbnail-uuid.jpg"
      }
    }
  ]
}
```

## Technical Architecture

The application uses a queue-based architecture to handle image processing asynchronously:

1. **API Server**: Handles HTTP requests and file uploads
2. **Queue**: Manages job processing with BullMQ and Redis
3. **Worker**: Processes images asynchronously using Sharp
4. **Storage**: MongoDB for jobs and filesystem for images

## Potential Enhancements

- User authentication and authorization system
- Additional image processing options (resize, crop, filters)
- Webhook notifications for job completion
- Job expiration and cleanup
- Rate limiting and request validation
- API documentation with Swagger/OpenAPI

## License

Inchallah