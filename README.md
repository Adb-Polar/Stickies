# Stickies - PERN Stack Application

A full-stack application built with PostgreSQL, Express.js, React (Next.js), and Node.js, featuring real-time updates with Socket.io and interactive canvas elements with react-konva.

## Tech Stack

### Frontend
- **Next.js** - React framework for UI and API routes
- **react-konva** - Canvas library for interactive elements (drags, doodles, images)
- **Tailwind CSS** - Styling framework

### Backend
- **Node.js** - Runtime environment
- **Express.js** - API server
- **Socket.io** - Real-time communication

### Database
- **PostgreSQL** - Structured data storage
- **Prisma** - ORM for type-safe queries and migrations

### Additional Tools
- **Redis** - Caching and Socket.io scaling
- **Multer/Sharp** - Image handling and processing
- **JWT/Bcrypt** - Authentication and password hashing
- **Helmet** - Security headers

### Dev Tools
- **Docker** - Local development environments
- **Jest** - Testing framework
- **Postman** - API verification (external tool)

## Prerequisites

- Node.js 20+ 
- Docker and Docker Compose (for local databases)
- PostgreSQL (if not using Docker)
- Redis (if not using Docker)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Backend server port (default: 3001)

### 3. Start Docker Services (PostgreSQL & Redis)

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379

### 4. Set Up Database

Generate Prisma Client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. Run Development Servers

**Option 1: Run both frontend and backend together**
```bash
npm run dev:all
```

**Option 2: Run separately**

Terminal 1 - Frontend:
```bash
npm run dev
```

Terminal 2 - Backend:
```bash
npm run dev:server
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run dev:server` - Start Express backend server
- `npm run dev:all` - Run both frontend and backend concurrently
- `npm run build` - Build Next.js application for production
- `npm run start` - Start production Next.js server
- `npm run start:server` - Start production Express server
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run lint` - Run ESLint

## Project Structure

```
stickies/
├── app/                    # Next.js app directory (routes/pages)
├── components/             # React components
│   └── ui/                # UI components
├── server/                 # Express backend
│   ├── config/            # Configuration files
│   │   ├── database.ts    # Prisma client
│   │   └── redis.ts       # Redis client
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts        # JWT authentication
│   │   └── upload.ts      # File upload handling
│   ├── routes/            # API routes
│   │   └── api.ts         # Main API routes
│   ├── utils/             # Utility functions
│   │   ├── image-processor.ts
│   │   ├── jwt.ts
│   │   └── password.ts
│   └── index.ts           # Express server entry point
├── prisma/                 # Prisma configuration
│   └── schema.prisma      # Database schema
├── __tests__/             # Test files
├── docker-compose.yml     # Docker services configuration
├── Dockerfile             # Production Docker image
└── jest.config.ts         # Jest configuration
```

## Testing

Run tests with Jest:

```bash
npm run test
```

## Database Management

Access Prisma Studio to view and edit your database:

```bash
npm run prisma:studio
```

## Docker

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables

3. Run database migrations:
```bash
npm run prisma:migrate
```

4. Start the production server:
```bash
npm run start
npm run start:server
```

## API Documentation

The backend API is available at `http://localhost:3001/api`

- `GET /health` - Health check endpoint
- `GET /api/test` - Test endpoint (requires authentication)

## Security

- JWT tokens for authentication
- Bcrypt for password hashing
- Helmet for secure HTTP headers
- CORS configured for frontend origin

## License

Private project
