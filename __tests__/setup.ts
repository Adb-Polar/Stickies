import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

let prisma: PrismaClient;
let redisClient: ReturnType<typeof createClient>;

beforeAll(async () => {
  prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });
  await prisma.$connect();

  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
});

afterEach(async () => {
  if (prisma) {
    await prisma.reaction.deleteMany();
    await prisma.note.deleteMany();
    await prisma.user.deleteMany();
  }
});

export { prisma, redisClient };

