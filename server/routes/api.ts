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

router.get('/notes', async (req: Request, res: Response) => {
  try {
    const notes = await prisma.note.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    res.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/notes', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { content, color, width, height } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const MAX_CONTENT_LENGTH = 5000; // Reasonable limit to prevent abuse while allowing long notes
    if (content.length > MAX_CONTENT_LENGTH) {
      res.status(400).json({ error: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters` });
      return;
    }

    const pastelColors = [
      '#eebea8',
      '#aad1fa',
      '#f6cca4',
      '#eeddb1',
      '#faefad',
      '#ccaf9d',
      '#bbfce6',
      '#b3b0f7',
    ];

    const validColor = color && pastelColors.includes(color) ? color : '#faefad';
    const validWidth = typeof width === 'number' && width > 0 ? width : 108;
    const validHeight = typeof height === 'number' && height > 0 ? height : 108;

    const note = await prisma.note.create({
      data: {
        content: content.trim(),
        color: validColor,
        x: 0,
        y: 0,
        width: validWidth,
        height: validHeight,
        userId: req.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    res.status(201).json({ note });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/notes/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { content, color, width, height } = req.body;

    const existingNote = await prisma.note.findUnique({
      where: { id },
    });

    if (!existingNote) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (existingNote.userId !== req.userId && !user.isAdmin) {
      res.status(403).json({ error: 'Forbidden: You can only edit your own notes' });
      return;
    }

    const pastelColors = [
      '#eebea8',
      '#aad1fa',
      '#f6cca4',
      '#eeddb1',
      '#faefad',
      '#ccaf9d',
      '#bbfce6',
      '#b3b0f7',
    ];

    const updateData: {
      content?: string;
      color?: string;
      width?: number;
      height?: number;
    } = {};

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        res.status(400).json({ error: 'Content cannot be empty' });
        return;
      }
      const MAX_CONTENT_LENGTH = 5000; // Reasonable limit to prevent abuse while allowing long notes
      if (content.length > MAX_CONTENT_LENGTH) {
        res.status(400).json({ error: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters` });
        return;
      }
      updateData.content = content.trim();
    }

    if (color !== undefined) {
      updateData.color = pastelColors.includes(color) ? color : existingNote.color;
    }

    if (width !== undefined && typeof width === 'number' && width > 0) {
      updateData.width = width;
    }

    if (height !== undefined && typeof height === 'number' && height > 0) {
      updateData.height = height;
    }

    const note = await prisma.note.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    res.json({ note });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/notes/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const existingNote = await prisma.note.findUnique({
      where: { id },
    });

    if (!existingNote) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (existingNote.userId !== req.userId && !user.isAdmin) {
      res.status(403).json({ error: 'Forbidden: You can only delete your own notes' });
      return;
    }

    await prisma.note.delete({
      where: { id },
    });

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

