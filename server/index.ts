import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';

dotenv.config();

const app = express();
const httpServer = createServer(app);
// CORS configuration - different behavior for development vs production
const corsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  // Production: Strict CORS - only allow explicit FRONTEND_URL
  if (isProduction) {
    if (!origin || origin === frontendUrl) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin in production: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
    return;
  }
  
  // Development: Allow localhost, 127.0.0.1, and network IPs
  const allowedOrigins = [
    frontendUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  
  // Allow any IP address on port 3000 for development (mobile/network access)
  if (origin && /^http:\/\/\d+\.\d+\.\d+\.\d+:3000$/.test(origin)) {
    callback(null, true);
    return;
  }
  
  // Allow exact matches
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Stickies API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
import apiRoutes from './routes/api';
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: {
      root: 'GET /',
      health: 'GET /health',
      api: 'GET /api',
    },
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    await connectRedis();
    // Bind to 0.0.0.0 to allow network access (for mobile/remote devices)
    // In production, this should be behind a reverse proxy (nginx, etc.)
    const host = '0.0.0.0';
    httpServer.listen(PORT, host, () => {
      console.log(`Server running on port ${PORT}`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Accessible at http://localhost:${PORT}`);
        console.log(`Network access: http://<your-ip>:${PORT}`);
      } else {
        console.log(`Production server listening on ${host}:${PORT}`);
        console.log('Ensure FRONTEND_URL and CORS are properly configured');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdownServer(): Promise<void> {
  console.log('Shutting down server...');
  httpServer.close(async () => {
    await disconnectDatabase();
    await disconnectRedis();
    io.close(() => {
      console.log('Server shut down complete');
      process.exit(0);
    });
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  process.on('SIGINT', shutdownServer);
  process.on('SIGTERM', shutdownServer);
  startServer();
}

export { app, io, httpServer };

