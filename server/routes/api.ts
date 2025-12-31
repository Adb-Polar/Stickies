import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../config/database';
import authRoutes from './auth';

const router = Router();

interface AuthenticatedRequest extends Request {
  userId?: string;
}

router.use('/auth', authRoutes);

router.get('/test', authenticateToken, (req: AuthenticatedRequest, res) => {
  res.json({ message: 'API is working', userId: req.userId });
});

router.get('/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: String(error) });
  }
});

export default router;

