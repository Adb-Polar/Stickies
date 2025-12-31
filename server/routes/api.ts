import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/test', authenticateToken, (req, res) => {
  res.json({ message: 'API is working', userId: (req as any).userId });
});

export default router;

