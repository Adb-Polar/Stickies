import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

interface AuthRequest extends Request {
  userId?: string;
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = verifyToken(token);
    if (decoded && decoded.userId) {
      req.userId = decoded.userId;
      next();
    } else {
      res.status(403).json({ error: 'Invalid token payload' });
    }
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

