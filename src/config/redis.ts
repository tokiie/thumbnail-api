import { ConnectionOptions } from 'bullmq';
import { config } from './index';

export const redisConnection: ConnectionOptions = {
  host: new URL(config.redisUrl).hostname,
  password: new URL(config.redisUrl).password || undefined
};