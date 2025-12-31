import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from 'redis';

let prisma: PrismaClient;
let redisClient: ReturnType<typeof createClient>;

beforeAll(async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({
    adapter,
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

