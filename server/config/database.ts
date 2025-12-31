import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

// Load .env file in development (production uses platform env vars)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

let prismaInstance: PrismaClient | null = null;
let poolInstance: Pool | null = null;

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    poolInstance = new Pool({ connectionString });
    const adapter = new PrismaPg(poolInstance);

    prismaInstance = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaInstance;
}

async function connectDatabase(): Promise<void> {
  try {
    const client = getPrismaClient();
    await client.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function disconnectDatabase(): Promise<void> {
  try {
    if (prismaInstance) {
      await prismaInstance.$disconnect();
      prismaInstance = null;
    }
    if (poolInstance) {
      await poolInstance.end();
      poolInstance = null;
    }
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Database disconnection error:', error);
  }
}

process.on('SIGINT', disconnectDatabase);
process.on('SIGTERM', disconnectDatabase);

const prisma = getPrismaClient();

export { prisma, connectDatabase, disconnectDatabase };
export default prisma;

