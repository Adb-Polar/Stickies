# Stickies - Interactive Bulletin Board

A full-stack web application for creating and managing interactive sticky notes on a shared canvas. Built with modern web technologies, featuring real-time collaboration, smooth drag-and-drop interactions, and optimized performance for handling hundreds of notes.

## Overview

Stickies is an interactive digital bulletin board where users can create, edit, and organize colorful sticky notes on an infinite canvas. The application provides a collaborative space where multiple users can interact with notes in real-time, with smooth pan and zoom capabilities, intuitive drag-and-drop functionality, and a responsive design that works seamlessly on both desktop and mobile devices.

### Core Concept

Think of Stickies as a digital whiteboard where each note is a sticky note that can be:
- **Created** with custom content and colors
- **Positioned** anywhere on the canvas by dragging
- **Viewed** in detail with a dedicated modal
- **Edited** by the note's creator or administrators
- **Deleted** with proper authorization checks
- **Shared** in real-time with other users via WebSocket connections

The canvas supports infinite panning and zooming, allowing users to organize notes across a vast workspace. Notes maintain their positions across sessions, creating a persistent collaborative environment.

---

## Features

### User Interface

- **Interactive Canvas**: Infinite canvas with smooth pan and zoom functionality
- **Drag and Drop**: Intuitive note dragging with visual feedback
- **Note Management**: Full CRUD operations (Create, Read, Update, Delete)
- **Color Customization**: Multiple color options for visual organization
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Modal System**: Clean, accessible modals for note creation, editing, and viewing
- **Bottom Navigation**: Easy access to profile, actions, and note creation

### User Experience

- **Smooth Interactions**: 60fps performance even with hundreds of notes
- **Touch Gestures**: Full support for mobile touch interactions (pan, pinch-zoom)
- **Text Selection**: Double-click to edit, single-click to view or select text
- **Visual Feedback**: Hover states, selection indicators, and smooth animations
- **Authorization**: Users can only edit/delete their own notes (admins have elevated privileges)
- **Real-time Updates**: Live synchronization across all connected clients

### Performance

- **Viewport Culling**: Only renders notes visible in the viewport
- **Direct DOM Manipulation**: Smooth pan/zoom using GPU-accelerated transforms
- **Memoization**: Optimized React components to prevent unnecessary re-renders
- **Efficient Rendering**: Smart z-index management and incremental updates
- **Mobile Optimized**: Touch gesture handling with minimal lag

### Security

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Content length limits and data sanitization
- **Authorization Checks**: Ownership verification for edit/delete operations
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **XSS Protection**: React's built-in escaping mechanisms

---

## Tech Stack

### Frontend

- **Next.js 16**: React framework with App Router
- **React 19**: Latest React with modern hooks and features
- **@dnd-kit**: Performant drag-and-drop library
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type-safe development

### Backend

- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **Socket.io**: Real-time bidirectional communication
- **Prisma**: Modern database ORM
- **PostgreSQL**: Relational database
- **Redis**: In-memory data store for caching

### Development Tools

- **Docker**: Containerization for databases
- **Jest**: Testing framework
- **ESLint**: Code linting
- **TypeScript**: Static type checking

---

## Getting Started

### Prerequisites

Before installing, ensure you have:

- **Node.js 20+** - [Download here](https://nodejs.org/)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Git** - For version control (if applicable)

Verify installations:

```bash
node --version    # Should be v20 or higher
docker --version  # Should show Docker version
npm --version     # Should show npm version
```

### Installation

#### Step 1: Install Dependencies

```bash
npm install
```

This installs all required packages. This may take 1-2 minutes.

#### Step 2: Create Environment File

Create a `.env` file in the project root:

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

**Important**: Replace `your-super-secret-jwt-key-change-this-in-production` with a strong random string for production. You can generate one using:

```bash
openssl rand -base64 32
```

#### Step 3: Start Docker Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

Verify services are running:

```bash
docker-compose ps
```

You should see both `stickies-postgres` and `stickies-redis` with status "Up".

#### Step 4: Set Up Database

Generate Prisma Client and create database tables:

```bash
npm run prisma:generate
npm run prisma:migrate
```

When running `prisma:migrate` for the first time, you'll be asked to name the migration. Press Enter to accept the default name or type a custom name.

#### Step 5: Start the Application

Run both frontend and backend servers:

```bash
npm run dev:all
```

This starts:
- Frontend server on `http://localhost:3000`
- Backend server on `http://localhost:3001`

**Expected output:**
```
[0] - ready started server on 0.0.0.0:3000
[1] - Server running on port 3001
[1] - Database connected successfully
[1] - Redis connected successfully
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the application.

---

## Usage

### Daily Development

After the first-time setup, starting the app is simple:

1. **Start Docker services** (if not already running):
   ```bash
   docker-compose up -d
   ```

2. **Start the application**:
   ```bash
   npm run dev:all
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Running Servers Separately

If you prefer to run servers in separate terminals:

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
npm run dev:server
```

### Shutting Down

**Stop the application:**
- Press `Ctrl+C` in the terminal running `npm run dev:all`

**Stop Docker services:**
```bash
docker-compose down
```

**Stop and remove all data** (⚠️ This deletes your database):
```bash
docker-compose down -v
```

---

## Project Structure

```
stickies/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page (main orchestrator)
│   └── globals.css        # Global styles and animations
├── components/            # React components
│   ├── hooks/             # Custom React hooks
│   │   └── use-socket.ts  # Socket.io client hook
│   ├── providers/         # React context providers
│   │   └── auth-provider.tsx  # Authentication context
│   └── ui/                # UI components
│       ├── dnd-canvas.tsx      # Main canvas component
│       ├── draggable-note.tsx  # Individual draggable note
│       ├── note-creator.tsx    # Note creation modal
│       ├── note-editor.tsx     # Note editing modal
│       ├── note-view.tsx       # Note viewing modal
│       ├── auth-form.tsx       # Login/signup form
│       ├── bottom-nav.tsx      # Bottom navigation bar
│       ├── profile-modal.tsx   # User profile modal
│       └── delete-prompt-modal.tsx  # Delete confirmation
├── lib/                   # Shared utilities
│   ├── api-config.ts      # API configuration
│   └── note-utils.ts      # Note utilities (colors, constants)
├── server/                # Express backend
│   ├── config/            # Configuration
│   │   ├── database.ts     # Prisma client
│   │   └── redis.ts        # Redis client
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts         # JWT authentication
│   │   └── upload.ts       # File upload handling
│   ├── routes/            # API routes
│   │   ├── api.ts          # Main API endpoints
│   │   └── auth.ts         # Authentication routes
│   ├── utils/             # Utility functions
│   │   ├── image-processor.ts
│   │   ├── jwt.ts
│   │   └── password.ts
│   └── index.ts           # Server entry point
├── prisma/                # Prisma configuration
│   └── schema.prisma      # Database schema
├── __tests__/             # Test files
├── docker-compose.yml     # Docker services
└── package.json           # Dependencies and scripts
```

---

## Architecture

### Component Architecture

The application follows a **component-based architecture** with clear separation of concerns:

- **Frontend**: Next.js with React, using client components for interactivity
- **Backend**: Express.js REST API with JWT authentication
- **Real-time**: Socket.io for live collaboration
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for session management

### Key Components

#### Canvas Component (`dnd-canvas.tsx`)

The main canvas component that renders and manages all sticky notes. Key features:

- **Drag & Drop**: Uses `@dnd-kit/core` for smooth note dragging
- **Pan & Zoom**: Mouse wheel zoom, touch pinch zoom, mouse/touch panning
- **Viewport Culling**: Only renders notes visible in viewport for performance
- **Z-index Management**: Incremental counter system for dragged notes
- **Note Interactions**: Single-click to view, double-click to edit

**Performance Optimizations:**
- Direct DOM manipulation during pan/zoom gestures (bypasses React render cycle)
- Refs for synchronous access during high-frequency events
- Viewport culling with dynamic padding
- React.memo for component memoization
- requestAnimationFrame throttling

#### Note Components

- **DraggableNote**: Individual draggable note component with visual states
- **NoteCreator**: Modal for creating new notes
- **NoteEditor**: Modal for editing existing notes
- **NoteView**: Modal for viewing notes in detail

#### Modal System

All modals follow a consistent design pattern:
- Translucent background with backdrop blur
- Responsive sizing for mobile and desktop
- Smooth animations
- Proper focus management

### Data Flow

1. **Note Creation**: User creates note → API call → Canvas refresh
2. **Note Viewing**: User clicks note → Modal opens → User can view/edit/delete
3. **Note Editing**: User edits note → API call → Canvas refresh
4. **Note Dragging**: User drags note → Position update → API call
5. **Canvas Pan/Zoom**: Direct DOM manipulation → State sync on gesture end
6. **Real-time Updates**: Socket.io broadcasts changes to all clients

### State Management

The application uses React hooks for state management:

- **Local State**: `useState` for component-specific state
- **Context**: `useAuth` for authentication state (global)
- **Refs**: `useRef` for values that need synchronous access (pan/zoom)
- **Memoization**: `useMemo`, `useCallback` for performance optimization

No global state management library (Redux, Zustand, etc.) is used - React's built-in state management is sufficient for this application.

### Performance Patterns

#### Direct DOM Manipulation

During high-frequency events (pan, zoom), transforms are applied directly to the DOM to bypass React's render cycle for smooth 60fps performance.

#### Viewport Culling

Only notes visible in the viewport (with padding) are rendered, significantly improving performance with large numbers of notes.

#### Incremental Z-Index

A counter-based system where each dragged note gets an incrementing z-index, avoiding arbitrary high values.

#### Functional State Updates

Uses functional state updates to avoid stale closures in event handlers.

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

## Troubleshooting

### Database Connection Issues

**Problem**: "Cannot connect to database"

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

### Port Conflicts

**Problem**: "Port already in use"

**Solution:**
1. Find what's using the port:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # Mac/Linux
   lsof -i :3000
   ```
2. Kill the process or change the port in `.env` file

### Prisma Issues

**Problem**: "Prisma Client not generated"

**Solution:**
```bash
npm run prisma:generate
```

**Problem**: "Database migration failed"

**Solution:**
1. Check if Docker PostgreSQL is running
2. Verify `DATABASE_URL` in `.env` matches docker-compose port (5435)
3. Reset database (⚠️ Deletes all data):
   ```bash
   docker-compose down -v
   docker-compose up -d
   npm run prisma:migrate
   ```

### Socket.io Connection Issues

**Problem**: "Socket.io connection failed"

**Solution:**
1. Verify backend server is running on port 3001
2. Check `NEXT_PUBLIC_API_URL` in `.env` matches backend URL
3. Check browser console for CORS errors
4. Verify `FRONTEND_URL` in backend matches frontend URL

### Redis Connection Issues

**Problem**: "Redis connection error"

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

### Complete Reset

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

## Production Deployment

### Environment Variables

**Frontend (Next.js):**
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

**Backend (Express):**
```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com
DATABASE_URL=postgresql://...         # Production database
REDIS_URL=redis://...                 # Production Redis
JWT_SECRET=...                        # Strong secret key
```

### Production Features

- **Strict CORS**: Only allows `FRONTEND_URL` in production
- **API URL Required**: Throws error if `NEXT_PUBLIC_API_URL` is missing
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

## Code Style

The codebase follows these conventions:

- **TypeScript**: Strict mode enabled, explicit types
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Components**: Functional components with hooks
- **Comments**: JSDoc comments for public functions and components
- **File Structure**: One component per file, co-located with related files

---

## License

Private project
