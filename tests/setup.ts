import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';

// Create test uploads directory
const testUploadsDir = path.join(__dirname, '../../uploads/test');
if (!fs.existsSync(testUploadsDir)) {
  fs.mkdirSync(testUploadsDir, { recursive: true });
}

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}, 10000);

afterAll(async () => {
  if (mongoServer) {
    await mongoose.disconnect();
    await mongoServer.stop();
  }

  if (fs.existsSync(testUploadsDir)) {
    fs.rmSync(testUploadsDir, { recursive: true, force: true });
  }
});

jest.mock('../src/services/QueueService', () => ({
  QueueService: {
    addJob: jest.fn(),
    getJobStatus: jest.fn(),
  },
}));

// Reset mocks and database before each test
beforeEach(async () => {
  jest.clearAllMocks();
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});