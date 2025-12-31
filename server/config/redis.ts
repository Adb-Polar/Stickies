import { createClient, RedisClientType } from 'redis';

const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}) as RedisClientType;

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

async function connectRedis(): Promise<void> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('Redis connected successfully');
    }
  } catch (error) {
    console.error('Redis connection error:', error);
    throw error;
  }
}

async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('Redis disconnected successfully');
    }
  } catch (error) {
    console.error('Redis disconnection error:', error);
  }
}

process.on('SIGINT', disconnectRedis);
process.on('SIGTERM', disconnectRedis);

export { redisClient, connectRedis, disconnectRedis };
export default redisClient;

