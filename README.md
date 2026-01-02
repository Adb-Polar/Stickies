# Stickies - Interactive Bulletin Board

A full-stack web application for creating and managing interactive sticky notes on a shared canvas. Built with Next.js, Express.js, PostgreSQL, and Redis, featuring real-time collaboration with Socket.io.

## Overview

Stickies is an interactive bulletin board where users can create, edit, and delete colorful sticky notes on a canvas. The application features:

- **Interactive Canvas**: Pan and zoom functionality with HTML/CSS and @dnd-kit
- **Drag and Drop**: Smooth note dragging with @dnd-kit for optimal performance
- **Note Management**: Create, edit, delete notes with color customization
- **Note Viewing**: Detailed note view modal with floating action buttons
- **User Authentication**: JWT-based auth with user profiles
- **Real-time Updates**: Socket.io for live collaboration
- **Performance Optimized**: Viewport culling, memoization, direct DOM manipulation, and efficient rendering
- **Mobile Support**: Touch gestures for pan and zoom with smooth performance
- **Responsive Design**: Mobile-first design with Figma-based UI components
- **Security**: Input validation, authorization checks, SQL injection protection
- **Modular Architecture**: Shared utilities and reusable components

### Key Features

- **Note CRUD Operations**: Create, Read, Update, Delete notes with full authorization
- **Note Viewing**: Single-click to view notes in detail modal with slide-up animation
- **Color Customization**: 8 pastel colors to choose from
- **User Authorization**: Users can only edit/delete their own notes
- **Admin Privileges**: Admins can delete any note
- **Position Persistence**: Notes maintain positions across sessions
- **Text Selection**: Double-click to edit, single-click to view/select text
- **Elevated Notes**: Dragged notes stay on top for better visibility
- **Smooth Interactions**: Optimized for mobile with hundreds of notes
- **Bottom Navigation**: Main navigation bar with profile, actions, and add note buttons
- **Figma Design System**: All modals and UI components match Figma designs
- **Responsive Modals**: Mobile and desktop optimized modal sizes

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
│   ├── page.tsx           # Home page (orchestrates app)
│   └── globals.css        # Global styles and animations
├── components/            # React components
│   ├── hooks/             # Custom React hooks
│   │   └── use-socket.ts  # Socket.io client hook
│   ├── providers/         # React context providers
│   │   └── auth-provider.tsx  # Authentication context
│   └── ui/                # UI components
│       ├── dnd-canvas.tsx      # Main canvas component (drag, pan, zoom)
│       ├── draggable-note.tsx  # Individual draggable note component
│       ├── note-creator.tsx    # Note creation modal
│       ├── note-editor.tsx     # Note editing modal
│       ├── note-view.tsx       # Note viewing modal
│       ├── auth-form.tsx       # Login/signup form
│       ├── bottom-nav.tsx      # Bottom navigation bar
│       ├── profile-modal.tsx   # User profile modal
│       ├── delete-prompt-modal.tsx  # Delete confirmation modal
│       └── sticky-note.tsx     # Legacy component (unused)
├── lib/                   # Shared utilities
│   ├── api-config.ts      # API configuration
│   └── note-utils.ts      # Note utilities (colors, constants, positioning)
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

## Code Documentation

### Architecture Overview

The application follows a **component-based architecture** with clear separation of concerns:

- **Frontend**: Next.js 16 with React 19, using client components for interactivity
- **Backend**: Express.js REST API with JWT authentication
- **Real-time**: Socket.io for live collaboration
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for session management

### Key Components

#### 1. `app/page.tsx` - Main Page Component

**Purpose**: Orchestrates the entire application, managing authentication state and modal visibility.

**Key Responsibilities**:
- Manages authentication modal (login/signup)
- Handles note selection state
- Coordinates note creation and editing modals
- Lazy loads modals for better performance

**Key State**:
- `showAuthModal`: Controls authentication modal visibility
- `selectedNote`: Currently selected note for editing
- `refreshKey`: Triggers canvas refresh when notes are created/updated/deleted

**Usage**:
```typescript
<DndCanvas
  onNoteSelect={setSelectedNote}
  selectedNoteId={selectedNote?.id || null}
  refreshKey={refreshKey}
/>
```

---

#### 2. `components/ui/dnd-canvas.tsx` - Canvas Component

**Purpose**: Main canvas component that renders and manages all sticky notes with drag-and-drop, pan, and zoom functionality.

**Key Features**:
- **Drag & Drop**: Uses `@dnd-kit/core` for smooth note dragging
- **Pan & Zoom**: Mouse wheel zoom, touch pinch zoom, mouse/touch panning
- **Viewport Culling**: Only renders notes visible in viewport for performance
- **Z-index Management**: Incremental counter system for dragged notes
- **Note Interactions**: Single-click to view, double-click to edit

**Performance Optimizations**:
- **Direct DOM Manipulation**: During pan/zoom gestures, transforms are applied directly to DOM (bypasses React render cycle) for 60fps performance
- **Refs for Synchronous Access**: Uses `canvasScaleRef` and `canvasPositionRef` to read current values during high-frequency events
- **Viewport Culling**: Calculates visible notes with padding, only renders those
- **React.memo**: Note components are memoized to prevent unnecessary re-renders
- **requestAnimationFrame**: Throttles pan and hover updates

**Key State**:
- `notes`: Array of notes from API
- `notePositions`: Map of note IDs to their positions and rotations
- `canvasPosition`: Current pan position (x, y)
- `canvasScale`: Current zoom level
- `noteZIndices`: Map of note IDs to their z-index values

**Key Functions**:
- `handleDragStart`: Stores initial position when drag begins
- `handleDragEnd`: Updates note position and assigns new z-index
- `handleCanvasWheel`: Handles mouse wheel zoom (centered on cursor)
- `handleCanvasTouchMove`: Handles touch pan and pinch zoom (direct DOM manipulation)
- `handleNoteClick`: Handles double-click for editing
- `handleNoteView`: Handles single-click for viewing

**Interaction Zones**:
- **Header**: Draggable area (grab cursor)
- **Content**: Double-click to edit, single-click to view/select text

**Example Usage**:
```typescript
<DndCanvas
  onNoteSelect={(note) => setSelectedNote(note)}
  onNoteView={(note) => setViewedNote(note)}
  selectedNoteId={selectedNoteId}
  refreshKey={refreshKey}
/>
```

---

#### 2a. `components/ui/draggable-note.tsx` - Draggable Note Component

**Purpose**: Individual draggable note component extracted from `dnd-canvas.tsx` for better modularity.

**Key Features**:
- **Drag Functionality**: Uses `@dnd-kit/core`'s `useDraggable` hook
- **Visual States**: Normal, hovered, selected, dragging states
- **Coordinate Conversion**: Converts screen coordinates to world coordinates for proper dragging
- **Memoization**: Optimized with `React.memo` and custom comparison function

**Interaction Zones**:
- **Header**: Draggable area (grab cursor)
- **Content**: Double-click to edit, single-click to view/select text

---

#### 2b. `lib/note-utils.ts` - Note Utilities

**Purpose**: Shared utilities for note rendering, colors, and positioning.

**Exports**:
- **Constants**: `NOTE_WIDTH`, `NOTE_HEIGHT`, `HEADER_HEIGHT`, `TEXT_PADDING`, `FONT_SIZE`, `LINE_HEIGHT`, `AUTHOR_FONT_SIZE`
- **Color Functions**: `getNoteColor()`, `darkenColor()`
- **Positioning**: `getNotePosition()` - Calculates non-overlapping positions for new notes

**Usage**: Imported by all note-related components to ensure consistency.

---

#### 3. `components/ui/note-creator.tsx` - Note Creation Modal

**Purpose**: Provides UI for creating new notes matching Figma design.

**Features**:
- Modal with "Add Note" title (64px, responsive)
- Content textarea with character limit (5000 chars)
- Live note preview with current color and content
- Circular color picker buttons (31x31px) with purple borders
- Three action buttons: Close, Attach File (WIP), Add
- Responsive sizing for mobile and desktop
- Scrollable note preview (modal itself not scrollable)
- Translucent modal background with backdrop blur

**Key State**:
- `content`: Note content text
- `selectedColor`: Selected color from palette

**API Call**:
```typescript
POST /api/notes
Body: { content, color, width, height, x, y }
```

---

#### 3a. `components/ui/note-view.tsx` - Note View Modal

**Purpose**: Modal for viewing notes in detail with floating action buttons.

**Features**:
- Slide-up animation from bottom
- Note displayed with same styling as canvas (color, rotation)
- Responsive scaling (1.5x mobile, 2.2x desktop)
- Floating action buttons: Delete, Edit, Reply (WIP)
- Authorization checks (buttons only visible to authenticated users)
- Integrated delete prompt modal
- Scrollable note content area

**Key State**:
- `scale`: Responsive scale based on viewport width
- `showDeletePrompt`: Controls delete confirmation modal

**API Calls**:
```typescript
DELETE /api/notes/:id
```

---

#### 4. `components/ui/note-editor.tsx` - Note Editing Modal

**Purpose**: Provides UI for editing existing notes matching Figma design.

**Features**:
- Modal with "Edit Note" title (64px, responsive)
- Content textarea with character limit (5000 chars)
- Live note preview with author name
- Circular color picker buttons (31x31px) with purple borders
- Three action buttons: Close, Attach File (WIP), Save
- Authorization checks (users can only edit their own notes, admins can edit any)
- Responsive sizing for mobile and desktop
- Scrollable note preview (modal itself not scrollable)
- Translucent modal background with backdrop blur

**Key State**:
- `content`: Note content text
- `selectedColor`: Selected color

**API Calls**:
```typescript
PUT /api/notes/:id
Body: { content, color }
```

---

#### 5. `components/ui/bottom-nav.tsx` - Bottom Navigation Bar

**Purpose**: Main navigation bar at bottom center of screen.

**Features**:
- Fixed position at bottom center
- Three buttons: Profile (left), Middle action (palm icon), Add Note (right)
- Hides when modals are open (slide-down animation)
- Responsive design for mobile and desktop
- Only visible to authenticated users

**Key Props**:
- `onAddNote`: Opens note creator modal
- `onProfile`: Opens profile modal
- `onMiddleAction`: Placeholder for future functionality
- `isHidden`: Controls visibility with animation

---

#### 6. `components/ui/profile-modal.tsx` - Profile Modal

**Purpose**: Modal for viewing and editing user profile.

**Features**:
- "Profile" title (64px, Caveat Bold)
- Username field with person icon
- Bio field with comment icon
- Responsive sizing
- Translucent modal background

---

#### 7. `components/ui/delete-prompt-modal.tsx` - Delete Confirmation Modal

**Purpose**: Modal for confirming note deletion.

**Features**:
- "Delete this note?" title (64px)
- Warning message
- Cancel and Confirm buttons with icons
- Responsive sizing
- Translucent modal background

---

#### 8. `components/ui/auth-form.tsx` - Authentication Form

**Purpose**: Login and signup forms matching Figma design.

**Features**:
- Large titles (64px, Caveat Bold)
- Login: Username (mapped to email) and Password fields
- Signup: Username, Email, Password, Confirm password fields
- Form validation
- Responsive sizing
- Translucent modal background

---

### Data Flow

1. **Note Creation**:
   ```
   User clicks Add Note button → NoteCreator opens → User enters content/color → 
   POST /api/notes → refreshKey++ → DndCanvas refetches notes
   ```

2. **Note Viewing**:
   ```
   User single-clicks note → NoteView opens → User can view note details →
   User clicks Edit → NoteEditor opens
   User clicks Delete → DeletePromptModal opens → DELETE /api/notes/:id
   ```

3. **Note Editing**:
   ```
   User double-clicks note → NoteEditor opens → User edits → 
   PUT /api/notes/:id → refreshKey++ → DndCanvas refetches notes
   ```

4. **Note Dragging**:
   ```
   User drags note header → handleDragStart → handleDragEnd → 
   Update notePositions state → PUT /api/notes/:id (position update)
   ```

5. **Canvas Pan/Zoom**:
   ```
   User pans/zooms → Direct DOM manipulation (smooth) → 
   On gesture end → Sync refs to React state
   ```

6. **Modal Management**:
   ```
   Modal opens → BottomNav hides (slide-down) →
   Modal closes → BottomNav shows (slide-up)
   ```

---

### Performance Patterns

#### 1. Direct DOM Manipulation During Gestures

**Problem**: React's render cycle causes lag during high-frequency events (pan, zoom).

**Solution**: Apply transforms directly to DOM during gestures, sync to React state on gesture end.

```typescript
// During touch move (60fps)
canvasRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;

// On touch end (sync to React)
setCanvasPosition(canvasPositionRef.current);
setCanvasScale(canvasScaleRef.current);
```

#### 2. Viewport Culling

**Problem**: Rendering hundreds of notes causes performance issues.

**Solution**: Only render notes visible in viewport with padding.

```typescript
const visibleNotes = notes.filter(note => {
  const pos = notePositions.get(note.id);
  return isNoteVisible(pos, viewport, padding);
});
```

#### 3. Incremental Z-Index System

**Problem**: Using fixed high z-index values (like 9999) can cause instability.

**Solution**: Counter-based system where each dragged note gets an incrementing z-index.

```typescript
// On drag end
const newZIndex = zIndexCounterRef.current++; // 100, 101, 102, ...
setNoteZIndices(prev => {
  const next = new Map(prev);
  next.set(noteId, newZIndex);
  return next;
});
```

#### 4. Functional State Updates

**Problem**: Stale closures in event handlers cause incorrect calculations.

**Solution**: Use functional state updates to always get latest values.

```typescript
setCanvasScale((oldScale) => {
  // oldScale is always current, not stale
  return newScale;
});
```

---

### State Management

The application uses **React hooks** for state management:

- **Local State**: `useState` for component-specific state
- **Context**: `useAuth` for authentication state (global)
- **Refs**: `useRef` for values that need synchronous access (pan/zoom)
- **Memoization**: `useMemo`, `useCallback` for performance optimization

**No global state management library** (Redux, Zustand, etc.) is used - the app is simple enough that React's built-in state management is sufficient.

---

### API Integration

All API calls use the `fetch` API with proper error handling:

```typescript
const response = await fetch(`${API_URL}/api/notes`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(data),
});
```

**Error Handling**:
- Network errors are caught and logged
- 401 errors trigger logout
- Validation errors show user-friendly messages

---

### Styling

The application uses **Tailwind CSS** for styling with custom color values:

- **Background**: `#fdfef0` (cream)
- **Font**: `Caveat` (cursive handwriting style)
- **Note Colors**: 8 pastel colors (see `NOTE_COLORS` in `lib/note-utils.ts`)

**Modal Styling**:
- Translucent background: `bg-black/40` with `backdrop-blur-sm`
- Consistent across all modals (auth, note creator, note editor, note view, profile, delete prompt)
- Responsive sizing with viewport awareness
- Slide-up animations for note view modal
- Scrollable content areas with invisible scrollbars

**Design System**:
- All modals match Figma designs
- Consistent typography (64px titles, Caveat Bold)
- Circular color picker buttons (31x31px) with purple borders
- Three-button action layouts (Close, Action, Primary)

---

### Testing

Tests are located in `__tests__/` directory:

- **Unit Tests**: Individual component and function tests
- **Integration Tests**: API endpoint tests
- **E2E Tests**: Full user flow tests (planned)

Run tests:
```bash
npm run test
```

---

### Code Style

The codebase follows these conventions:

- **TypeScript**: Strict mode enabled, explicit types
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Components**: Functional components with hooks
- **Comments**: JSDoc comments for public functions and components
- **File Structure**: One component per file, co-located with related files

---

### Common Patterns

#### 1. Lazy Loading

Modals are lazy-loaded for better initial load performance:

```typescript
const NoteCreator = lazy(() => import('@/components/ui/note-creator'));
```

#### 2. Memoization

Expensive calculations and components are memoized:

```typescript
const dimensions = useMemo(() => calculateNoteDimensions(content), [content]);
const DraggableNoteMemo = memo(DraggableNote, customComparison);
```

#### 3. Callback Optimization

Event handlers use `useCallback` to prevent unnecessary re-renders:

```typescript
const handleNoteClick = useCallback((note) => {
  // handler logic
}, [dependencies]);
```

---

### Troubleshooting Code Issues

#### Issue: Notes not updating after create/edit

**Solution**: Check that `refreshKey` is being incremented and passed to `DndCanvas`.

#### Issue: Pan/zoom feels laggy on mobile

**Solution**: Ensure direct DOM manipulation is used during gestures (check `handleCanvasTouchMove`).

#### Issue: Notes overlapping after drag

**Solution**: Verify z-index is being assigned correctly in `handleDragEnd`.

#### Issue: Zoom center jumps

**Solution**: Ensure functional state updates are used (`setCanvasScale((old) => ...)`).

---

### Future Improvements

Potential areas for enhancement:

- [ ] Virtual scrolling for very large note lists
- [ ] Undo/redo functionality
- [ ] Note grouping/categorization
- [ ] Search functionality
- [ ] Export notes as image/PDF
- [ ] Collaborative cursors (show other users' cursors)
- [ ] Note templates
- [ ] Rich text editing

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, **@dnd-kit**, Tailwind CSS
- **Icons:** lucide-react (MIT licensed)
- **Backend:** Node.js, Express.js, Socket.io
- **Database:** PostgreSQL 16, Prisma ORM
- **Caching:** Redis 7
- **Authentication:** JWT, Bcrypt
- **Security:** Helmet, CORS
- **Testing:** Jest, Supertest
- **Drag & Drop:** @dnd-kit/core for performant drag-and-drop
- **Architecture:** Modular design with shared utilities (`lib/note-utils.ts`)

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
