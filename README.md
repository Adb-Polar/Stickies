# Stickies - Interactive Bulletin Board

A full-stack web application for creating and managing interactive sticky notes on a shared canvas. Built with Next.js, Express.js, PostgreSQL, and Redis, featuring real-time collaboration with Socket.io.

## Overview

Stickies is an interactive bulletin board where users can create, edit, and delete colorful sticky notes on a canvas. The application features:

- **Interactive Canvas**: Pan and zoom functionality with HTML/CSS and @dnd-kit
- **Drag and Drop**: Smooth note dragging with @dnd-kit for optimal performance
- **Note Management**: Create, edit, delete notes with color customization
- **User Authentication**: JWT-based auth with user profiles
- **Real-time Updates**: Socket.io for live collaboration
- **Performance Optimized**: Viewport culling, memoization, direct DOM manipulation, and efficient rendering
- **Mobile Support**: Touch gestures for pan and zoom with smooth performance
- **Security**: Input validation, authorization checks, SQL injection protection

### Key Features

- **Note CRUD Operations**: Create, Read, Update, Delete notes with full authorization
- **Color Customization**: 8 pastel colors to choose from
- **User Authorization**: Users can only edit/delete their own notes
- **Admin Privileges**: Admins can delete any note
- **Position Persistence**: Notes maintain positions across sessions
- **Text Selection**: Double-click to edit, single-click to select and copy text
- **Elevated Notes**: Dragged notes stay on top for better visibility
- **Smooth Interactions**: Optimized for mobile with hundreds of notes

### Performance Features

- **Viewport Culling**: Only renders notes visible in viewport with dynamic padding
- **Memoization**: React.memo for components, useMemo for calculations
- **Direct DOM Manipulation**: Canvas transforms applied directly during gestures for 60fps performance
- **Throttled Updates**: RequestAnimationFrame for smooth interactions
- **Mobile Optimized**: Touch gesture support with optimized pinch zoom
- **Incremental Z-Index**: Smart z-index management without arbitrary high values

### Security Features

- **Input Validation**: Content length limits (5000 chars), color whitelist
- **Authorization**: JWT-based auth with ownership checks
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **XSS Protection**: React's automatic escaping, no dangerous HTML
- **CORS Configuration**: Strict in production, flexible in development

### Production Ready

- **Environment Detection**: Auto-detects network IP for mobile access in dev
- **Production Mode**: Requires explicit API URL configuration
- **CORS Security**: Strict origin checking in production
- **Error Handling**: Comprehensive error handling and user feedback

## Table of Contents

- [Prerequisites](#prerequisites)
- [First-Time Installation](#first-time-installation)
- [First-Time Usage](#first-time-usage)
- [Daily Usage](#daily-usage)
- [Shutting Down](#shutting-down)
- [Troubleshooting](#troubleshooting)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Production Deployment](#production-deployment)

---

## Prerequisites

Before installing, ensure you have:

- **Node.js 20+** - [Download here](https://nodejs.org/)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
  - Required for running PostgreSQL and Redis databases locally
- **Git** - For cloning the repository (if applicable)

Verify installations:

```bash
node --version    # Should be v20 or higher
docker --version  # Should show Docker version
npm --version     # Should show npm version
```

---

## First-Time Installation

Follow these steps to set up the project on your machine for the first time.

### Step 1: Install Dependencies

```bash
npm install
```

This installs all required packages (Next.js, Express, Prisma, Socket.io, etc.).

**Expected output:** Dependencies will be installed. This may take 1-2 minutes.

### Step 2: Create Environment File

Create a `.env` file in the project root with the following content:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/stickies?schema=public"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# Server Configuration
PORT=3001
FRONTEND_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Security
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
```

**Note:** 
- Replace `your-super-secret-jwt-key-change-this-in-production` with a strong random string for production
- The database port is `5435` (not 5432) as configured in docker-compose.yml

### Step 3: Start Docker Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

**Expected output:**
```
Creating stickies-postgres ... done
Creating stickies-redis    ... done
```

**Verify services are running:**
```bash
docker-compose ps
```

You should see both `stickies-postgres` and `stickies-redis` with status "Up".

### Step 4: Set Up Database

Generate Prisma Client and create database tables:

```bash
npm run prisma:generate
npm run prisma:migrate
```

**Expected output:**
- `prisma:generate` - Creates Prisma Client types
- `prisma:migrate` - Creates database tables (User, Note, Reaction)

**First migration prompt:** When running `prisma:migrate` for the first time, you'll be asked to name the migration. Press Enter to accept the default name or type a custom name.

### Step 5: Verify Installation

Run a quick test to ensure everything is set up correctly:

```bash
npm run test
```

**Expected output:** Tests should pass. If any fail, check the [Troubleshooting](#troubleshooting) section.

---

## First-Time Usage

After completing the installation, start the application:

### Option 1: Run Both Servers Together (Recommended)

```bash
npm run dev:all
```

This starts both the frontend (Next.js) and backend (Express) servers in one command.

**Expected output:**
```
[0] - ready started server on 0.0.0.0:3000
[1] - Server running on port 3001
[1] - Database connected successfully
[1] - Redis connected successfully
```

### Option 2: Run Servers Separately

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
npm run dev:server
```

### Access the Application

Once both servers are running:

- **Frontend:** Open [http://localhost:3000](http://localhost:3000) in your browser
- **Backend API:** Available at [http://localhost:3001](http://localhost:3001)
- **Health Check:** [http://localhost:3001/health](http://localhost:3001/health)

**What you should see:**
- An interactive canvas with drag-and-drop support
- A connection status indicator in the top-right corner showing "Socket: connected"
- Sticky notes on the canvas that you can drag, zoom, and interact with

---

## Daily Usage

After the first-time setup, starting the app is simple:

### Quick Start

1. **Start Docker services** (if not already running):
   ```bash
   docker-compose up -d
   ```

2. **Start the application:**
   ```bash
   npm run dev:all
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Check if Docker Services Are Running

```bash
docker-compose ps
```

If services are not running, start them:
```bash
docker-compose up -d
```

### Check if Ports Are Available

If you get port conflicts:

- **Port 3000** (Frontend) - Change in `package.json` scripts or use `PORT=3000 npm run dev`
- **Port 3001** (Backend) - Change `PORT` in `.env` file
- **Port 5435** (PostgreSQL) - Change in `docker-compose.yml`
- **Port 6379** (Redis) - Change in `docker-compose.yml`

---

## Shutting Down

### Graceful Shutdown

**If running `npm run dev:all`:**
- Press `Ctrl+C` in the terminal
- Wait for "Server shut down complete" message

**If running servers separately:**
- Press `Ctrl+C` in each terminal window

### Stop Docker Services

To stop PostgreSQL and Redis:

```bash
docker-compose down
```

**To stop and remove all data** (⚠️ This deletes your database):
```bash
docker-compose down -v
```

**Note:** The `-v` flag removes volumes, deleting all stored data. Only use this if you want to start fresh.

### Keep Docker Running (Recommended)

For daily development, you can keep Docker services running in the background. They use minimal resources when idle. Only stop them if you need to free up system resources.

---

## Troubleshooting

### Problem: "Cannot connect to database"

**Solution:**
1. Check if Docker services are running:
   ```bash
   docker-compose ps
   ```
2. If not running, start them:
   ```bash
   docker-compose up -d
   ```
3. Wait 10-15 seconds for services to fully start
4. Verify database connection:
   ```bash
   docker-compose exec postgres pg_isready -U postgres
   ```

### Problem: "Port already in use"

**Solution:**
1. Find what's using the port:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # Mac/Linux
   lsof -i :3000
   ```
2. Kill the process or change the port in `.env` file

### Problem: "Prisma Client not generated"

**Solution:**
```bash
npm run prisma:generate
```

### Problem: "Database migration failed"

**Solution:**
1. Check if Docker PostgreSQL is running
2. Verify `DATABASE_URL` in `.env` matches docker-compose port (5435)
3. Reset database (⚠️ Deletes all data):
   ```bash
   docker-compose down -v
   docker-compose up -d
   npm run prisma:migrate
   ```

### Problem: "Socket.io connection failed"

**Solution:**
1. Verify backend server is running on port 3001
2. Check `NEXT_PUBLIC_API_URL` in `.env` matches backend URL
3. Check browser console for CORS errors
4. Verify `FRONTEND_URL` in backend matches frontend URL

### Problem: "Redis connection error"

**Solution:**
1. Check if Redis container is running:
   ```bash
   docker-compose ps
   ```
2. Restart Redis:
   ```bash
   docker-compose restart redis
   ```
3. Verify Redis is accessible:
   ```bash
   docker-compose exec redis redis-cli ping
   ```
   Should return: `PONG`

### Problem: "Tests failing"

**Solution:**
1. Ensure Docker services are running
2. Check `DATABASE_URL` and `REDIS_URL` in environment
3. Run tests with verbose output:
   ```bash
   npm run test -- --verbose
   ```

### Reset Everything (Nuclear Option)

If nothing works and you want to start completely fresh:

```bash
# Stop everything
docker-compose down -v

# Remove node_modules
rm -rf node_modules

# Remove Prisma generated files
rm -rf node_modules/.prisma

# Reinstall
npm install

# Start Docker
docker-compose up -d

# Regenerate and migrate
npm run prisma:generate
npm run prisma:migrate
```

---

## Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js frontend server (port 3000) |
| `npm run dev:server` | Start Express backend server (port 3001) |
| `npm run dev:all` | Start both servers concurrently |

### Production

| Command | Description |
|---------|-------------|
| `npm run build` | Build Next.js app for production |
| `npm run start` | Start production Next.js server |
| `npm run start:server` | Start production Express server |

### Database

| Command | Description |
|---------|-------------|
| `npm run prisma:generate` | Generate Prisma Client types |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio (database GUI) |

### Testing

| Command | Description |
|---------|-------------|
| `npm run test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate test coverage report |

### Code Quality

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint |

### Docker

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start Docker services in background |
| `docker-compose down` | Stop Docker services |
| `docker-compose ps` | Check service status |
| `docker-compose logs -f` | View service logs |

---

## Project Structure

```
stickies/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── hooks/             # Custom React hooks
│   │   └── use-socket.ts  # Socket.io client hook
│   └── ui/                # UI components
│       ├── dnd-canvas.tsx
│       └── sticky-note.tsx
├── server/                # Express backend
│   ├── config/            # Configuration
│   │   ├── database.ts    # Prisma client
│   │   └── redis.ts       # Redis client
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts        # JWT authentication
│   │   └── upload.ts      # File upload handling
│   ├── routes/            # API routes
│   │   └── api.ts         # Main API endpoints
│   ├── utils/             # Utility functions
│   │   ├── image-processor.ts
│   │   ├── jwt.ts
│   │   └── password.ts
│   └── index.ts           # Server entry point
├── prisma/                # Prisma configuration
│   └── schema.prisma      # Database schema
├── __tests__/             # Test files
│   ├── setup.ts           # Test setup/teardown
│   └── server/            # Server tests
├── docker-compose.yml     # Docker services
├── Dockerfile             # Production Docker image
└── jest.config.ts         # Jest configuration
```

---

## Tech Stack

### Tech Stack

- **Frontend:** Next.js 16, React 19, **@dnd-kit**, Tailwind CSS
- **Backend:** Node.js, Express.js, Socket.io
- **Database:** PostgreSQL 16, Prisma ORM
- **Caching:** Redis 7
- **Authentication:** JWT, Bcrypt
- **Security:** Helmet, CORS
- **Testing:** Jest, Supertest
- **Drag & Drop:** @dnd-kit/core for performant drag-and-drop

---

## Additional Resources

### Database Management

View and edit your database using Prisma Studio:

```bash
npm run prisma:studio
```

Opens a web interface at `http://localhost:5555`

### API Endpoints

- `GET /` - Server info
- `GET /health` - Health check
- `GET /api/health` - API health with database status
- `GET /api/test` - Test endpoint (requires authentication)

### Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `PORT` | Backend server port | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` |
| `JWT_SECRET` | Secret for JWT tokens | Required |
| `NODE_ENV` | Environment mode | `development` |

---

## Production Deployment

### Environment Variables

**Frontend (Next.js):**
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com  # Must be set explicitly
```

**Backend (Express):**
```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com  # Your frontend domain (for CORS)
DATABASE_URL=postgresql://...         # Production database
REDIS_URL=redis://...                 # Production Redis
JWT_SECRET=...                        # Strong secret key (use: openssl rand -base64 32)
```

### Production Features

- **Strict CORS**: Only allows `FRONTEND_URL` in production
- **API URL Required**: Throws error if `NEXT_PUBLIC_API_URL` is missing
- **Network Binding**: Server listens on `0.0.0.0` (should use reverse proxy)
- **HTTPS Required**: Use HTTPS in production for secure cookies and WebSocket

### Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `NEXT_PUBLIC_API_URL` to production API URL
- [ ] Set `FRONTEND_URL` to production frontend URL
- [ ] Use HTTPS (required for production)
- [ ] Configure reverse proxy (nginx, Cloudflare, etc.)
- [ ] Set up production database (PostgreSQL)
- [ ] Set up Redis for caching
- [ ] Use strong `JWT_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] Test CORS with production URLs
- [ ] Verify API endpoints are accessible

### Mobile/Network Access (Development)

The application automatically detects network IP addresses for mobile access:
- Access from mobile: `http://<your-computer-ip>:3000`
- Backend automatically adjusts API URL to match hostname
- CORS allows network IPs in development mode

---

## License

Private project
