'use client';

/**
 * @fileoverview DndCanvas Component
 * 
 * Main canvas component for rendering and interacting with sticky notes.
 * Implements drag-and-drop, pan, zoom, and viewport culling for optimal performance.
 * 
 * Key Features:
 * - HTML/CSS-based rendering (replaced Konva.js for better performance)
 * - @dnd-kit for drag-and-drop functionality
 * - Direct DOM manipulation for smooth 60fps pan/zoom on mobile
 * - Viewport culling to only render visible notes
 * - Incremental z-index system for dragged notes
 * - Text selection support (double-click to edit)
 * 
 * Performance Optimizations:
 * - Viewport culling with dynamic padding
 * - React.memo for note components
 * - Direct DOM transforms during gestures (bypasses React render cycle)
 * - requestAnimationFrame throttling for pan/hover updates
 * - GPU acceleration with will-change CSS property
 * 
 * @module components/ui/dnd-canvas
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useAuth } from '@/components/providers/auth-provider';
import { API_URL } from '@/lib/api-config';
import { DraggableNote, type Note } from './draggable-note';
import { getNotePosition, NOTE_WIDTH, NOTE_HEIGHT } from '@/lib/note-utils';

/**
 * Props for the DndCanvas component
 */
interface DndCanvasProps {
  /** Callback when a note is selected (double-clicked) for editing */
  onNoteSelect?: (note: Note | null) => void;
  /** Callback when a note is clicked (single-clicked) for viewing */
  onNoteView?: (note: Note | null) => void;
  /** ID of the currently selected note */
  selectedNoteId?: string | null;
  /** Key to trigger a refresh of notes from the API */
  refreshKey?: number;
}


/**
 * Main canvas component for rendering and interacting with sticky notes
 * 
 * Features:
 * - Fetches notes from API and manages their positions
 * - Implements pan and zoom with mouse wheel and touch gestures
 * - Handles drag-and-drop for repositioning notes
 * - Viewport culling for performance (only renders visible notes)
 * - Manages z-index for dragged notes (incremental system)
 * 
 * Performance Optimizations:
 * - Direct DOM manipulation during pan/zoom gestures (bypasses React)
 * - Viewport culling with dynamic padding
 * - requestAnimationFrame throttling for smooth updates
 * - React.memo for note components
 * 
 * State Management:
 * - Uses refs for synchronous access during high-frequency events (pan/zoom)
 * - Syncs refs to React state on gesture end
 * - Functional state updates to avoid stale closures
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function DndCanvas({ onNoteSelect, onNoteView, selectedNoteId, refreshKey }: DndCanvasProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notePositions, setNotePositions] = useState<Map<string, { x: number; y: number; rotation: number }>>(
    new Map(),
  );
  const [noteOpacities, setNoteOpacities] = useState<Map<string, number>>(new Map());
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null);
  const [noteZIndices, setNoteZIndices] = useState<Map<string, number>>(new Map());
  const zIndexCounterRef = useRef(100);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const initializedNotesRef = useRef<Set<string>>(new Set());
  const lastTouchDistance = useRef<number | null>(null);
  const panUpdateRef = useRef<number | null>(null);
  const hoverUpdateRef = useRef<number | null>(null);
  const canvasScaleRef = useRef(canvasScale);
  const canvasPositionRef = useRef(canvasPosition);
  // Ref to track panning state for use in callbacks (avoids stale closures)
  const isPanningRef = useRef(false);
  const zoomAnimationRef = useRef<number | null>(null);
  const touchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const targetScaleRef = useRef<number | null>(null);
  const { token, user } = useAuth();

  // Keep refs in sync with state
  useEffect(() => {
    canvasScaleRef.current = canvasScale;
  }, [canvasScale]);

  useEffect(() => {
    canvasPositionRef.current = canvasPosition;
  }, [canvasPosition]);

  // Keep isPanningRef in sync with isPanning state
  useEffect(() => {
    isPanningRef.current = isPanning;
  }, [isPanning]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const fetchNotes = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/notes`, {
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        if (response.status === 401) {
          const retryResponse = await fetch(`${API_URL}/api/notes`, {
            mode: 'cors',
            credentials: 'omit',
          });
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            setNotes(retryData.notes || []);
            setIsLoading(false);
            return;
          }
        }
        const errorText = await response.text();
        console.error('Failed to fetch notes:', response.status, response.statusText, errorText);
        setNotes([]);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error: Backend API may not be running at', API_URL);
        console.error('Please ensure the backend server is running on port 3001');
      }
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes, refreshKey]);

  /**
   * Resets note initialization tracking when refreshKey changes
   * 
   * refreshKey Pattern:
   * - Incremented by parent when notes are created/updated/deleted
   * - Forces canvas to refetch notes from API
   * - Clearing initializedNotesRef allows re-initialization of positions
   * - Prevents stale position data from persisting across refreshes
   */
  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      initializedNotesRef.current.clear();
    }
  }, [refreshKey]);

  /**
   * Initializes note positions and fade-in animations
   * 
   * Position Initialization:
   * - New notes (x=0, y=0 or missing) get random non-overlapping positions
   * - Existing notes keep their positions from previous render
   * - Uses getNotePosition() utility for collision detection
   * 
   * Fade-in Animation:
   * - New notes start with opacity 0
   * - Staggered animation: each note fades in 50ms after the previous
   * - Creates a pleasant cascading effect when notes load
   * - index * 50ms delay prevents all notes from appearing simultaneously
   * 
   * Cleanup:
   * - Removes positions for notes that no longer exist
   * - Tracks initialized notes to prevent re-initialization
   */
  useEffect(() => {
    if (notes.length > 0 && containerSize.width > 0 && containerSize.height > 0) {
      setNotePositions((prevPositions) => {
        const newPositions = new Map(prevPositions);
        const newNoteIds = new Set(notes.map((n) => n.id));
        let hasNewNotes = false;

        // Build array of existing positions for collision detection
        const existingPositions = Array.from(newPositions.values()).map(p => ({ x: p.x, y: p.y }));
        
        notes.forEach((note) => {
          const existingPos = prevPositions.get(note.id);
          // Initialize position if note is new or at origin (0,0)
          if (!existingPos || (existingPos.x === 0 && existingPos.y === 0)) {
            const pos = getNotePosition(containerSize.width, containerSize.height, existingPositions, notes.length);
            newPositions.set(note.id, pos);
            existingPositions.push({ x: pos.x, y: pos.y });
            initializedNotesRef.current.add(note.id);
            hasNewNotes = true;
          } else if (!initializedNotesRef.current.has(note.id)) {
            initializedNotesRef.current.add(note.id);
          }
        });

        // Cleanup: remove positions for deleted notes
        prevPositions.forEach((_, noteId) => {
          if (!newNoteIds.has(noteId)) {
            newPositions.delete(noteId);
            initializedNotesRef.current.delete(noteId);
          }
        });

        // Set up fade-in animation for new notes
        if (hasNewNotes) {
          // Start all new notes at opacity 0
          setNoteOpacities((prev) => {
            const next = new Map(prev);
            notes.forEach((note) => {
              if (!next.has(note.id) || next.get(note.id) === undefined) {
                next.set(note.id, 0);
              }
            });
            return next;
          });

          // Staggered fade-in: each note fades in 50ms after the previous
          notes.forEach((note, index) => {
            const existingPos = prevPositions.get(note.id);
            if (!existingPos || (existingPos.x === 0 && existingPos.y === 0)) {
              setTimeout(() => {
                setNoteOpacities((prev) => {
                  const next = new Map(prev);
                  next.set(note.id, 1);
                  return next;
                });
              }, index * 50); // 50ms delay per note for cascading effect
            }
          });
        }

        return newPositions;
      });
    }
  }, [notes, containerSize.width, containerSize.height, refreshKey]);

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        const sizeChanged = Math.abs(containerSize.width - containerWidth) > 100 || 
                           Math.abs(containerSize.height - containerHeight) > 100;
        
        setContainerSize({
          width: containerWidth,
          height: containerHeight,
        });
        
        if (sizeChanged && (containerSize.width > 0 || containerSize.height > 0)) {
          setCanvasPosition({ x: 0, y: 0 });
          setCanvasScale(1);
          setIsPanning(false);
        }
      }
    }

    updateSize();
    
    const container = containerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(container);
    }
    
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [containerSize.width, containerSize.height]);

  /**
   * Handles note click (single-click) to open view modal
   */
  const handleNoteView = useCallback(
    (note: Note) => {
      if (onNoteView) {
        onNoteView(note);
      }
    },
    [onNoteView],
  );

  /**
   * Handles note click (double-click) to open editor
   * Only allows editing if user owns the note or is an admin
   */
  const handleNoteClick = useCallback(
    (note: Note) => {
      if (onNoteSelect && token && user) {
        const canEdit = user.id === note.userId || user.isAdmin;
        if (canEdit) {
          onNoteSelect(note);
        }
      }
    },
    [onNoteSelect, token, user],
  );

  /**
   * Handles drag start event
   * Stores the initial position and sets the active note ID
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const noteId = event.active.id as string;
    setActiveId(noteId);
    const position = notePositions.get(noteId);
    if (position) {
      setDragStartPosition({ x: position.x, y: position.y });
    }
    setHoveredNoteId(null);
  }, [notePositions]);

  /**
   * Handles drag end event
   * Updates note position and assigns a new z-index to keep it elevated
   * Uses incremental counter approach (not fixed high values like 9999)
   * 
   * Coordinate conversion: delta is in screen pixels, divide by canvasScale
   * to convert to world coordinates (same as dragOffset calculation above)
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    const noteId = active.id as string;
    
    if (dragStartPosition && delta) {
      // Convert delta from screen coordinates to world coordinates
      const newX = dragStartPosition.x + delta.x / canvasScale;
      const newY = dragStartPosition.y + delta.y / canvasScale;
      
      setNotePositions((prev) => {
        const next = new Map(prev);
        const currentPos = prev.get(noteId);
        if (currentPos) {
          next.set(noteId, {
            ...currentPos,
            x: newX,
            y: newY,
          });
        }
        return next;
      });
      
      // Assign a new z-index to keep this note on top (incremental counter approach)
      const newZIndex = zIndexCounterRef.current++;
      setNoteZIndices((prev) => {
        const next = new Map(prev);
        next.set(noteId, newZIndex);
        return next;
      });
    }
    
    setActiveId(null);
    setDragStartPosition(null);
  }, [canvasScale, dragStartPosition]);

  /**
   * Handles mouse down on canvas for panning
   * Syncs refs from state before starting pan to avoid stale values
   */
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-background')) {
      // Sync refs from state before panning (in case state was updated)
      canvasPositionRef.current = canvasPosition;
      canvasScaleRef.current = canvasScale;
      setIsPanning(true);
      setPanStart({
        x: e.clientX - canvasPositionRef.current.x,
        y: e.clientY - canvasPositionRef.current.y,
      });
    }
  }, [canvasPosition, canvasScale]);

  /**
   * Handles mouse move for panning
   * Uses direct DOM manipulation for smooth 60fps performance
   * Throttled with requestAnimationFrame
   */
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      if (panUpdateRef.current !== null) {
        cancelAnimationFrame(panUpdateRef.current);
      }
      panUpdateRef.current = requestAnimationFrame(() => {
        // Check if panning is still active using ref (avoids stale closure)
        // This prevents updates after mouse up
        if (!isPanningRef.current) {
          panUpdateRef.current = null;
          return;
        }
        
        const newPos = {
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        };
        
        // Update refs immediately
        canvasPositionRef.current = newPos;
        
        // Apply transform directly to DOM using transform3d for GPU acceleration
        if (canvasRef.current) {
          const currentScale = canvasScaleRef.current;
          // Use transform3d for GPU acceleration (hardware acceleration)
          canvasRef.current.style.transform = `translate3d(${newPos.x}px, ${newPos.y}px, 0) scale3d(${currentScale}, ${currentScale}, 1)`;
        }
        
        // Update background position directly for smooth infinite tiling during pan
        if (backgroundRef.current) {
          backgroundRef.current.style.backgroundPosition = `${newPos.x}px ${newPos.y}px`;
        }
        
        // CRITICAL: Don't update state during move - only update refs and DOM
        // State updates are queued and can fire after mouse up, causing teleport
        // We'll sync to state only on mouse up using flushSync
        panUpdateRef.current = null;
      });
    }
  }, [isPanning, panStart]);

  const handleCanvasMouseUp = useCallback(() => {
    // CRITICAL: Cancel any pending animation frames FIRST
    if (panUpdateRef.current !== null) {
      cancelAnimationFrame(panUpdateRef.current);
      panUpdateRef.current = null;
    }
    
    // Get final values from refs (these are the actual current DOM positions)
    const finalPos = canvasPositionRef.current;
    
    // Reset panning state FIRST (before state updates)
    setIsPanning(false);
    
    // CRITICAL: Use flushSync to update state synchronously before next paint
    // This ensures React re-renders immediately with correct values
    // and prevents the "teleport" effect where canvas moves after mouse release
    flushSync(() => {
      setCanvasPosition(finalPos);
    });
    
    // Ensure DOM transform matches state after flushSync
    // This is a safety check in case React's render didn't apply it correctly
    if (canvasRef.current) {
      const finalScale = canvasScaleRef.current;
      canvasRef.current.style.transform = `translate3d(${finalPos.x}px, ${finalPos.y}px, 0) scale3d(${finalScale}, ${finalScale}, 1)`;
    }
    
    // Sync background position to match final state
    if (backgroundRef.current) {
      backgroundRef.current.style.backgroundPosition = `${finalPos.x}px ${finalPos.y}px`;
    }
  }, []);

  /**
   * Handles mouse wheel for zooming
   * Zooms centered on the mouse cursor position (the point under cursor stays fixed)
   * 
   * Zoom Algorithm:
   * 1. Get mouse position in screen coordinates
   * 2. Convert to world coordinates using OLD scale
   * 3. Calculate NEW scale (10% per scroll step, clamped 0.5x - 3x)
   * 4. Calculate NEW pan position so the world point stays under mouse cursor
   * 
   * Why this works:
   * - World coordinates are independent of zoom level
   * - By keeping the world point under the cursor, zoom feels natural
   * - Formula: newPan = mouseScreen - (worldPoint * newScale)
   * 
   * Example:
   * - Mouse at screen (100, 100), zoom 1x, pan (0, 0)
   * - World point = (100, 100)
   * - Zoom to 2x: newPan = (100, 100) - (100, 100) * 2 = (-100, -100)
   * - World point (100, 100) now at screen (100, 100) ✓
   * 
   * Uses refs for synchronous access to avoid stale closures
   */
  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    // Prevent zooming while dragging a note to avoid glitchy behavior
    if (activeId) return;
    
    e.preventDefault();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Use refs to get current values synchronously (avoids stale closures)
    const oldScale = canvasScaleRef.current;
    const oldPos = canvasPositionRef.current;
    
    // Zoom factor: 10% per scroll step
    const scaleBy = 1.1;
    const newScale = e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    // Clamp zoom between 0.5x (zoomed out) and 3x (zoomed in)
    const clampedScale = Math.max(0.5, Math.min(3, newScale));
    
    // Convert mouse position to world coordinates using OLD scale
    // World coordinates are independent of zoom level
    const worldX = (mouseX - oldPos.x) / oldScale;
    const worldY = (mouseY - oldPos.y) / oldScale;
    
    // Calculate new pan position so the world point stays under the mouse with NEW scale
    // This keeps the zoom centered on the cursor
    const newPos = {
      x: mouseX - worldX * clampedScale,
      y: mouseY - worldY * clampedScale,
    };
    
    // Cancel any pending zoom animation to prevent jitter
    if (zoomAnimationRef.current !== null) {
      cancelAnimationFrame(zoomAnimationRef.current);
    }
    
    // Throttle zoom updates to animation frames for smooth performance
    // This prevents jitter during rapid wheel scrolling
    zoomAnimationRef.current = requestAnimationFrame(() => {
      // Update refs immediately for synchronous access
      canvasScaleRef.current = clampedScale;
      canvasPositionRef.current = newPos;
      
      // Apply transform directly to DOM using transform3d for GPU acceleration
      if (canvasRef.current) {
        canvasRef.current.style.transform = `translate3d(${newPos.x}px, ${newPos.y}px, 0) scale3d(${clampedScale}, ${clampedScale}, 1)`;
      }
      
      // Update background position directly for smooth infinite tiling during zoom
      // Use screen coordinates directly for consistent visual speed at all zoom levels
      if (backgroundRef.current) {
        backgroundRef.current.style.backgroundPosition = `${newPos.x}px ${newPos.y}px`;
      }
      
      // Update both states together (scale and position must update atomically)
      setCanvasScale(clampedScale);
      setCanvasPosition(newPos);
      
      zoomAnimationRef.current = null;
    });
  }, [activeId]);

  /**
   * Handles touch start for pan and pinch zoom
   * Detects single touch (pan) vs two touches (pinch zoom)
   * 
   * Performance optimizations:
   * - Prevents default browser behavior to avoid scrolling/rubber banding
   * - Syncs refs before gesture starts to avoid stale values
   * - Cancels any ongoing animations for smooth transitions
   */
  const handleCanvasTouchStart = useCallback((e: React.TouchEvent) => {
    // Prevent default browser gestures (scrolling, rubber banding)
    // This is critical for smooth touch interactions
    if (e.touches.length === 2 || (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-background'))) {
      e.preventDefault();
    }
    if (e.touches.length === 2) {
      // Sync current state to refs before starting new zoom
      canvasScaleRef.current = canvasScale;
      canvasPositionRef.current = canvasPosition;
      
      // Cancel any ongoing zoom animation
      if (zoomAnimationRef.current !== null) {
        cancelAnimationFrame(zoomAnimationRef.current);
        zoomAnimationRef.current = null;
      }
      const touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      lastTouchDistance.current = Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y);
      touchCenterRef.current = null;
      targetScaleRef.current = null;
    } else if (e.touches.length === 1 && (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-background'))) {
      // Sync refs from state before panning (in case state was updated)
      canvasPositionRef.current = canvasPosition;
      canvasScaleRef.current = canvasScale;
      setIsPanning(true);
      setPanStart({
        x: e.touches[0].clientX - canvasPositionRef.current.x,
        y: e.touches[0].clientY - canvasPositionRef.current.y,
      });
    }
  }, [canvasPosition, canvasScale]);

  /**
   * Handles touch move for pan and pinch zoom
   * Uses direct DOM manipulation during gesture for smooth 60fps performance
   * 
   * Performance Strategy:
   * - Direct DOM manipulation bypasses React render cycle during gesture
   * - Prevents "rubberband" effect on mobile (laggy scrolling)
   * - Updates refs immediately for synchronous access
   * - Syncs to React state on gesture end (for other components)
   * 
   * Two-finger Pinch Zoom:
   * - Calculates distance between two touches
   * - Scales based on distance change from initial pinch
   * - Centers zoom on midpoint between touches
   * - Uses requestAnimationFrame for smooth updates
   * 
   * Single-finger Pan:
   * - Updates canvas position based on touch movement
   * - Uses requestAnimationFrame to throttle updates
   * - Applies transform directly to DOM element
   */
  const handleCanvasTouchMove = useCallback((e: React.TouchEvent) => {
    // Prevent zooming while dragging a note to avoid glitchy behavior
    if (activeId && e.touches.length === 2) {
      e.preventDefault();
      return;
    }
    
    // Always prevent default to avoid browser scrolling/rubber banding
    // This is critical for smooth touch interactions
    if (e.touches.length === 2 || isPanning) {
      e.preventDefault();
    }
    
    if (e.touches.length === 2) {
      const touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const distance = Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y);
      
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = (touch1.x + touch2.x) / 2 - rect.left;
      const centerY = (touch1.y + touch2.y) / 2 - rect.top;
      
      if (lastTouchDistance.current !== null) {
        const scaleBy = distance / lastTouchDistance.current;
        const oldScale = canvasScaleRef.current;
        const newScale = oldScale * scaleBy;
        const clampedScale = Math.max(0.5, Math.min(3, newScale));
        
        // Store target values for smooth animation
        touchCenterRef.current = { x: centerX, y: centerY };
        targetScaleRef.current = clampedScale;
        lastTouchDistance.current = distance;
        
        // Apply zoom directly to DOM without React state updates for smoother performance
        if (canvasRef.current) {
          const oldScale = canvasScaleRef.current;
          const oldPos = canvasPositionRef.current;
          
          // Convert center position to world coordinates using OLD scale
          const worldX = (centerX - oldPos.x) / oldScale;
          const worldY = (centerY - oldPos.y) / oldScale;
          
          // Calculate new position so the world point stays under the center with NEW scale
          const newPos = {
            x: centerX - worldX * clampedScale,
            y: centerY - worldY * clampedScale,
          };
          
          // Update refs immediately
          canvasScaleRef.current = clampedScale;
          canvasPositionRef.current = newPos;
          
          // Apply transform directly to DOM using transform3d for GPU acceleration
          // This bypasses React render cycle for smooth 60fps performance
          canvasRef.current.style.transform = `translate3d(${newPos.x}px, ${newPos.y}px, 0) scale3d(${clampedScale}, ${clampedScale}, 1)`;
          
          // Update background position directly for smooth infinite tiling during pinch zoom
          // Use screen coordinates directly for consistent visual speed at all zoom levels
          if (backgroundRef.current) {
            backgroundRef.current.style.backgroundPosition = `${newPos.x}px ${newPos.y}px`;
          }
        }
      } else {
        lastTouchDistance.current = distance;
      }
    } else if (isPanning && e.touches.length === 1) {
      // Prevent default to avoid browser scrolling/rubber banding
      e.preventDefault();
      
      if (panUpdateRef.current !== null) {
        cancelAnimationFrame(panUpdateRef.current);
      }
      panUpdateRef.current = requestAnimationFrame(() => {
        // Check if panning is still active using ref (avoids stale closure)
        // This prevents updates after touch end - fixes "teleport" issue
        if (!isPanningRef.current) {
          panUpdateRef.current = null;
          return;
        }
        
        const newPos = {
          x: e.touches[0].clientX - panStart.x,
          y: e.touches[0].clientY - panStart.y,
        };
        
        // Update refs immediately
        canvasPositionRef.current = newPos;
        
        // Apply transform directly to DOM using transform3d for GPU acceleration
        if (canvasRef.current) {
          const currentScale = canvasScaleRef.current;
          canvasRef.current.style.transform = `translate3d(${newPos.x}px, ${newPos.y}px, 0) scale3d(${currentScale}, ${currentScale}, 1)`;
        }
        
        // Update background position directly for smooth infinite tiling during pan
        if (backgroundRef.current) {
          backgroundRef.current.style.backgroundPosition = `${newPos.x}px ${newPos.y}px`;
        }
        
        // CRITICAL: Don't update state during move - only update refs and DOM
        // State updates are queued and can fire after touch end, causing teleport
        // We'll sync to state only on touch end using flushSync
        panUpdateRef.current = null;
      });
    }
  }, [isPanning, panStart, activeId]);

  /**
   * Handles touch end
   * Syncs refs back to React state after gesture completes
   * 
   * Cleanup:
   * - Cancels any pending animation frames
   * - Resets touch tracking state
   * - Syncs final values to React state for other components
   */
  const handleCanvasTouchEnd = useCallback((e: React.TouchEvent) => {
    // Prevent default to avoid any browser gestures (scrolling, rubber banding)
    // Only prevent if we were actually panning/zooming
    if (isPanning || lastTouchDistance.current !== null) {
      e.preventDefault();
    }
    
    // CRITICAL: Cancel any pending animation frames FIRST
    // This prevents the "teleport" effect where the canvas continues moving
    // after finger lift and then snaps back
    if (panUpdateRef.current !== null) {
      cancelAnimationFrame(panUpdateRef.current);
      panUpdateRef.current = null;
    }
    if (zoomAnimationRef.current !== null) {
      cancelAnimationFrame(zoomAnimationRef.current);
      zoomAnimationRef.current = null;
    }
    
    // Get final values from refs (these are the actual current DOM positions)
    const finalScale = canvasScaleRef.current;
    const finalPos = canvasPositionRef.current;
    
    // Reset panning state FIRST (before state updates)
    setIsPanning(false);
    lastTouchDistance.current = null;
    touchCenterRef.current = null;
    targetScaleRef.current = null;
    
    // CRITICAL: Use flushSync to update state synchronously before next paint
    // This ensures React re-renders immediately with correct values
    // and prevents the "teleport" effect where canvas moves after finger lift
    flushSync(() => {
      setCanvasScale(finalScale);
      setCanvasPosition(finalPos);
    });
    
    // Ensure DOM transform matches state after flushSync
    // This is a safety check in case React's render didn't apply it correctly
    if (canvasRef.current) {
      canvasRef.current.style.transform = `translate3d(${finalPos.x}px, ${finalPos.y}px, 0) scale3d(${finalScale}, ${finalScale}, 1)`;
    }
    
    // Sync background position to match final state
    if (backgroundRef.current) {
      backgroundRef.current.style.backgroundPosition = `${finalPos.x}px ${finalPos.y}px`;
    }
  }, [isPanning]);

  /**
   * Calculates which notes are visible in the viewport for viewport culling
   * 
   * Viewport Culling Strategy:
   * 1. Convert screen viewport to world coordinates (accounting for pan and zoom)
   * 2. Add dynamic padding that scales with zoom level (more padding when zoomed in)
   * 3. Filter notes using AABB (Axis-Aligned Bounding Box) collision detection
   * 
   * Why dynamic padding?
   * - When zoomed in, notes move faster across screen, so we need more padding
   * - Prevents notes from popping in/out at viewport edges during pan
   * - Minimum 200px padding ensures smooth scrolling experience
   * 
   * Coordinate System:
   * - Screen coordinates: pixels relative to viewport (0,0 at top-left)
   * - World coordinates: pixels in the infinite canvas space
   * - Conversion: world = (screen - pan) / scale
   */
  const visibleNotes = useMemo(() => {
    if (notes.length === 0 || containerSize.width === 0 || containerSize.height === 0) {
      return notes;
    }

    // Convert screen viewport to world coordinates
    // Negative because pan moves canvas in opposite direction
    const worldLeft = -canvasPosition.x / canvasScale;
    const worldTop = -canvasPosition.y / canvasScale;
    const worldRight = worldLeft + containerSize.width / canvasScale;
    const worldBottom = worldTop + containerSize.height / canvasScale;

    // Dynamic padding: scales with zoom (more padding when zoomed in)
    // Significantly increased padding to prevent notes from popping in/out during pan
    // Formula: base padding (500px) + zoom-based padding (250px per scale unit)
    // This gives us: 500px at 1x zoom, 750px at 2x zoom, 1000px at 3x zoom
    // Larger padding means notes appear/disappear further off-screen, reducing visible pop-in
    // The increased padding trades some performance for smoother visual experience
    const padding = Math.max(500, 250 * canvasScale);
    const paddedLeft = worldLeft - padding;
    const paddedTop = worldTop - padding;
    const paddedRight = worldRight + padding;
    const paddedBottom = worldBottom + padding;

    // AABB collision detection: note is visible if it overlaps with padded viewport
    return notes.filter((note) => {
      const position = notePositions.get(note.id);
      if (!position) return true; // Render if position not yet calculated

      const noteRight = position.x + NOTE_WIDTH;
      const noteBottom = position.y + NOTE_HEIGHT;

      // Check if note's bounding box overlaps with padded viewport
      return (
        position.x < paddedRight &&
        noteRight > paddedLeft &&
        position.y < paddedBottom &&
        noteBottom > paddedTop
      );
    });
  }, [notes, notePositions, canvasPosition, canvasScale, containerSize]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-background')) {
      if (onNoteSelect && !activeId) {
        onNoteSelect(null);
      }
    }
  }, [onNoteSelect, activeId]);

  const createHoverHandlers = useCallback((noteId: string) => {
    return {
      onMouseEnter: () => {
        if (!activeId && hoverUpdateRef.current === null) {
          hoverUpdateRef.current = requestAnimationFrame(() => {
            setHoveredNoteId(noteId);
            hoverUpdateRef.current = null;
          });
        }
      },
      onMouseLeave: () => {
        if (!activeId && hoverUpdateRef.current === null) {
          hoverUpdateRef.current = requestAnimationFrame(() => {
            setHoveredNoteId(null);
            hoverUpdateRef.current = null;
          });
        }
      },
    };
  }, [activeId]);

  if (isLoading) {
    return (
      <div ref={containerRef} className="w-full h-full bg-[#fdfef0] flex items-center justify-center">
        <div className="text-[#171c28]" style={{ fontFamily: 'Caveat, cursive', fontSize: '18px' }}>Loading notes...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#fdfef0] relative overflow-hidden"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onWheel={handleCanvasWheel}
      onTouchStart={handleCanvasTouchStart}
      onTouchMove={handleCanvasTouchMove}
      onTouchEnd={handleCanvasTouchEnd}
      onClick={handleCanvasClick}
      style={{ 
        cursor: isPanning ? 'move' : 'default', 
        touchAction: 'none', // Prevents browser touch gestures (pinch zoom, pan, etc.)
        WebkitUserSelect: 'none', // Prevents text selection during panning
        userSelect: 'none', // Prevents text selection during panning
        WebkitTouchCallout: 'none', // Prevents iOS callout menu
      }}
    >
      {/* Infinite tiled background texture layer - fixed position, updates background-position */}
      {/* This approach is more performant: background is not transformed, only background-position updates */}
      {/* Background position is calculated to move with canvas transform, creating infinite tiling effect */}
      <div
        ref={backgroundRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          // Fixed position - covers entire container, doesn't transform
          // Background position updates based on canvas transform to create infinite movement
          // Position is updated directly via DOM during gestures for smooth 60fps performance
          backgroundImage: 'url(/watercolor-paper.webp)',
          backgroundRepeat: 'repeat',
          // Keep background-size constant - pattern size stays the same regardless of zoom
          // This ensures consistent visual appearance at all zoom levels
          backgroundSize: 'auto',
          // Use screen coordinates directly for background position
          // This makes background move at consistent visual speed (screen pixels) at all zoom levels
          // The background moves with the canvas at the same screen-space speed regardless of zoom
          backgroundPosition: `${canvasPosition.x}px ${canvasPosition.y}px`,
          // Use background-blend-mode to colorize white texture to match #fdfef0
          // Multiply blend: white (1,1,1) * #fdfef0 = #fdfef0
          // This is more performant than mix-blend-mode as it only affects the background
          backgroundColor: '#fdfef0',
          backgroundBlendMode: 'multiply',
          // Ensure background is behind canvas and notes
          zIndex: 0,
          // GPU acceleration for smooth background-position updates
          willChange: isPanning || activeId ? 'background-position' : 'auto',
          backfaceVisibility: 'hidden',
        }}
      />
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={canvasRef}
          className="canvas-background absolute inset-0"
          style={{
            // Use transform3d for GPU acceleration (hardware acceleration)
            // This ensures smooth 60fps performance during pan/zoom
            transform: `translate3d(${canvasPosition.x}px, ${canvasPosition.y}px, 0) scale3d(${canvasScale}, ${canvasScale}, 1)`,
            transformOrigin: '0 0',
            // will-change hints browser to optimize for transforms
            // Only set during active gestures to avoid unnecessary optimization
            willChange: isPanning || activeId ? 'transform' : 'auto',
            // Backface visibility optimization for 3D transforms
            backfaceVisibility: 'hidden',
            // Force GPU layer creation for smoother animations
            WebkitTransform: `translate3d(${canvasPosition.x}px, ${canvasPosition.y}px, 0) scale3d(${canvasScale}, ${canvasScale}, 1)`,
            // Ensure canvas is above background
            zIndex: 1,
            // Prevent text selection during panning
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
        >
          {visibleNotes.map((note) => {
            const position = notePositions.get(note.id) || { x: 0, y: 0, rotation: 0 };
            const opacity = noteOpacities.get(note.id) ?? 1;
            const isSelected = selectedNoteId === note.id;
            const isHovered = hoveredNoteId === note.id;
            const isDragging = activeId === note.id;
            const noteZIndex = noteZIndices.get(note.id) || (isSelected ? 10 : isHovered ? 5 : 1);
            const hoverHandlers = createHoverHandlers(note.id);

            return (
              <DraggableNote
                key={note.id}
                note={note}
                position={position}
                opacity={opacity}
                isSelected={isSelected}
                isHovered={isHovered}
                onNoteClick={handleNoteClick}
                onNoteView={handleNoteView}
                onMouseEnter={hoverHandlers.onMouseEnter}
                onMouseLeave={hoverHandlers.onMouseLeave}
                canvasScale={canvasScale}
                isDragging={isDragging}
                zIndex={noteZIndex}
                isPanning={isPanning}
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}

