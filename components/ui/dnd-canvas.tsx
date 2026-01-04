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
 * - react-zoom-pan-pinch for smooth pan/zoom gestures
 * - react-use-gesture for intelligent gesture routing and conflict resolution
 * - Viewport culling to only render visible notes
 * - Incremental z-index system for dragged notes
 * - Text selection support (double-click to edit)
 * - Simultaneous actions: drag notes while panning/zooming canvas
 * 
 * Performance Optimizations:
 * - Viewport culling with dynamic padding
 * - React.memo for note components
 * - requestAnimationFrame throttling for hover updates
 * - GPU acceleration with will-change CSS property
 * - Optimized integration between react-zoom-pan-pinch, @dnd-kit, and react-use-gesture
 * - Smart gesture routing prevents conflicts and enables simultaneous interactions
 * 
 * @module components/ui/dnd-canvas
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useGesture } from '@use-gesture/react';
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
 * - Uses react-zoom-pan-pinch for pan and zoom with mouse wheel and touch gestures
 * - Handles drag-and-drop for repositioning notes with @dnd-kit
 * - Viewport culling for performance (only renders visible notes)
 * - Manages z-index for dragged notes (incremental system)
 * 
 * Performance Optimizations:
 * - Viewport culling with dynamic padding
 * - requestAnimationFrame throttling for hover updates
 * - React.memo for note components
 * - Optimized integration between react-zoom-pan-pinch and @dnd-kit
 * 
 * State Management:
 * - Uses react-zoom-pan-pinch for transform state management
 * - Syncs transform state for coordinate calculations
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null);
  const [noteZIndices, setNoteZIndices] = useState<Map<string, number>>(new Map());
  const [isMultiTouch, setIsMultiTouch] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const zIndexCounterRef = useRef(100);
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const initializedNotesRef = useRef<Set<string>>(new Set());
  const hoverUpdateRef = useRef<number | null>(null);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const transformUpdateRef = useRef<number | null>(null);
  const backgroundUpdateRef = useRef<number | null>(null);
  const hasCenteredRef = useRef(false);
  const gestureStateRef = useRef({ touchCount: 0, isPinching: false });
  const dragCancelledRef = useRef(false);
  const isMultiTouchRef = useRef(false);
  const pendingNoteDragRef = useRef<string | null>(null);
  const pendingDragTimeoutRef = useRef<number | null>(null);
  const initialTouchTargetRef = useRef<HTMLElement | null>(null);
  const { token, user } = useAuth();
  
  // Keep ref in sync with state
  useEffect(() => {
    isMultiTouchRef.current = isMultiTouch;
  }, [isMultiTouch]);
  
  const handleTransformChange = useCallback((ref: ReactZoomPanPinchRef) => {
    if (transformUpdateRef.current !== null) {
      cancelAnimationFrame(transformUpdateRef.current);
    }
    
    transformUpdateRef.current = requestAnimationFrame(() => {
      const { state } = ref;
      // react-zoom-pan-pinch provides scale and position in screen coordinates
      setCanvasScale(state.scale);
      setCanvasPosition({ x: state.positionX, y: state.positionY });
      transformUpdateRef.current = null;
    });
  }, []);

  /**
   * Gesture routing with react-use-gesture
   * Detects touch count and routes gestures appropriately:
   * - 1 touch on background = canvas pan (via react-zoom-pan-pinch)
   * - 1 touch on note = note drag (via @dnd-kit)
   * - 2+ touches = canvas pan/zoom (via react-zoom-pan-pinch)
   * 
   * Key improvements:
   * - Only detects gestures on background, not on notes (prevents conflicts)
   * - Checks touch target to distinguish note drag from canvas pan
   * - Allows wheel zoom while dragging on PC
   */
  const backgroundRefForGesture = useRef<HTMLDivElement>(null);
  
  /**
   * Immediate touch event listener to detect multi-touch and note touches before sensor activation
   * This prevents note drag from starting when multi-touch is detected
   * Also prevents canvas pan when touch starts on a note by blocking events from reaching react-zoom-pan-pinch
   * 
   * Uses capture phase with stopPropagation to stop events at the source
   */
  useEffect(() => {
    /**
     * Intercept touchstart in capture phase to prevent react-zoom-pan-pinch from receiving events
     * when touch starts on a note. This is the earliest possible interception point.
     * Uses stopPropagation (not preventDefault) to allow @dnd-kit to still work
     * 
     * Optimized: Early returns, minimal DOM queries, ref-based state
     */
    const handleTouchStartCapture = (event: TouchEvent) => {
      // Early return for multi-touch (handled elsewhere)
      if (event.touches.length !== 1) {
        return;
      }
      
      const target = event.target as HTMLElement;
      // Fast check: if target has the attribute, it's a note (or child of note)
      if (!target.hasAttribute('data-draggable-note') && !target.closest('[data-draggable-note]')) {
        return;
      }
      
      const noteElement = target.closest('[data-draggable-note]');
      if (!noteElement) {
        return;
      }
      
      // Store that we're waiting for note drag
      const noteId = noteElement.getAttribute('data-draggable-note');
      if (noteId) {
        pendingNoteDragRef.current = noteId;
        initialTouchTargetRef.current = target;
        
        // Store initial transform state (only if available)
        const transform = transformRef.current;
        if (transform) {
          const state = transform.state;
          initialTransformRef.current = {
            x: state.positionX,
            y: state.positionY,
            scale: state.scale,
          };
        }
        
        // Stop propagation to prevent react-zoom-pan-pinch from processing
        // This prevents panning while still allowing @dnd-kit to handle the drag
        event.stopPropagation();
      }
    };

    /**
     * Intercept touchmove in capture phase BEFORE react-zoom-pan-pinch processes it
     * This prevents panning when touch started on a note
     * 
     * Optimized: Fast ref check, early return
     */
    const handleTouchMoveCapture = (event: TouchEvent) => {
      // Fast check: if we're waiting for note drag activation, prevent panning
      // Use refs for immediate access without state updates
      if (pendingNoteDragRef.current !== null && !activeId) {
        // Prevent the event from reaching react-zoom-pan-pinch
        // This stops panning while still allowing @dnd-kit to track the touch
        event.stopPropagation();
        event.preventDefault();
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touchCount = event.touches.length;
      gestureStateRef.current.touchCount = touchCount;
      
      // Store initial touch target for later reference
      const target = event.target as HTMLElement;
      if (!initialTouchTargetRef.current) {
        initialTouchTargetRef.current = target;
      }
      
      // Check if touch started on a note element
      const noteElement = target.closest('[data-draggable-note]');
      const noteId = noteElement?.getAttribute('data-draggable-note') || null;
      
      // Immediately update multi-touch state
      if (touchCount > 1) {
        setIsMultiTouch(true);
        // Cancel any active drag immediately
        if (activeId) {
          dragCancelledRef.current = true;
          setActiveId(null);
          setDragStartPosition(null);
        }
        // Clear pending note drag
        pendingNoteDragRef.current = null;
        initialTouchTargetRef.current = null;
        initialTransformRef.current = null;
        if (pendingDragTimeoutRef.current !== null) {
          clearTimeout(pendingDragTimeoutRef.current);
          pendingDragTimeoutRef.current = null;
        }
      } else if (noteId) {
        // Single touch on a note - already handled in capture phase
        setIsPanning(false);
        
        // Set timeout to re-enable panning if drag doesn't activate
        if (pendingDragTimeoutRef.current !== null) {
          clearTimeout(pendingDragTimeoutRef.current);
        }
        pendingDragTimeoutRef.current = window.setTimeout(() => {
          // If drag hasn't started after activation delay + buffer, re-enable panning
          if (pendingNoteDragRef.current === noteId && !activeId) {
            pendingNoteDragRef.current = null;
            initialTouchTargetRef.current = null;
            initialTransformRef.current = null;
            setIsPanning(false);
          }
          pendingDragTimeoutRef.current = null;
        }, 150); // Slightly longer than activation delay (100ms) to account for tolerance
      } else {
        // Single touch on background - allow panning
        pendingNoteDragRef.current = null;
        initialTouchTargetRef.current = null;
        initialTransformRef.current = null;
        if (pendingDragTimeoutRef.current !== null) {
          clearTimeout(pendingDragTimeoutRef.current);
          pendingDragTimeoutRef.current = null;
        }
      }
    };
    
    /**
     * Intercept touchmove in capture phase to prevent panning when touch started on a note
     * This runs before react-zoom-pan-pinch processes the event
     */
    const handleTouchMove = (event: TouchEvent) => {
      // If initial touch was on a note and we're waiting for drag activation, prevent panning
      if (pendingNoteDragRef.current !== null && !activeId) {
        // Stop propagation and prevent default to prevent react-zoom-pan-pinch from processing
        event.stopPropagation();
        event.preventDefault();
      }
    };
    
    const handleTouchEnd = () => {
      // Reset touch count when all touches end
      gestureStateRef.current.touchCount = 0;
      setIsMultiTouch(false);
      
      // Clear pending drag timeout
      if (pendingDragTimeoutRef.current !== null) {
        clearTimeout(pendingDragTimeoutRef.current);
        pendingDragTimeoutRef.current = null;
      }
      
      // Clear pending note drag if drag didn't start
      if (pendingNoteDragRef.current && !activeId) {
        pendingNoteDragRef.current = null;
      }
      
      // Clear initial touch target and transform
      initialTouchTargetRef.current = null;
      initialTransformRef.current = null;
    };
    
    const container = containerRef.current;
    if (container) {
      // CRITICAL: Use capture phase on touchstart AND touchmove to intercept BEFORE react-zoom-pan-pinch
      // touchstart capture: stops propagation to prevent react-zoom-pan-pinch from initiating pan
      // touchmove capture: stops propagation to prevent react-zoom-pan-pinch from continuing pan
      // Both use stopPropagation (not preventDefault) to allow @dnd-kit to still work
      container.addEventListener('touchstart', handleTouchStartCapture, { passive: true, capture: true });
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMoveCapture, { passive: false, capture: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false, capture: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
      container.addEventListener('touchcancel', handleTouchEnd, { passive: true });
      
      return () => {
        container.removeEventListener('touchstart', handleTouchStartCapture, { capture: true });
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMoveCapture, { capture: true });
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('touchcancel', handleTouchEnd);
        if (pendingDragTimeoutRef.current !== null) {
          clearTimeout(pendingDragTimeoutRef.current);
        }
      };
    }
  }, [activeId]);
  
  useGesture(
    {
      onDrag: ({ first, active, event, touches, target }) => {
        // Only handle gestures on background, not on notes
        const element = target as HTMLElement;
        if (element && (element.closest('[data-draggable-note]') || element.closest('[role="button"]'))) {
          return; // Ignore gestures on notes - let @dnd-kit handle them
        }
        
        // Detect touch count from native event
        let touchCount = 1;
        if (event && 'touches' in event && event.touches) {
          touchCount = event.touches.length;
        } else if (touches !== undefined) {
          touchCount = touches;
        }
        
        gestureStateRef.current.touchCount = touchCount;
        
        if (first) {
          const isMulti = touchCount > 1;
          setIsMultiTouch(isMulti);
          // If multi-touch starts, cancel any active note drag to allow canvas pan
          if (isMulti && activeId) {
            setActiveId(null);
            setDragStartPosition(null);
          }
        }
        
        if (active) {
          setIsPanning(touchCount > 1);
        } else {
          setIsPanning(false);
          if (touchCount <= 1) {
            setIsMultiTouch(false);
          }
        }
      },
      onPinch: ({ first, active }) => {
        if (first) {
          gestureStateRef.current.isPinching = true;
          setIsMultiTouch(true);
          // Cancel note drag when pinch starts to prioritize zoom
          if (activeId) {
            setActiveId(null);
            setDragStartPosition(null);
          }
        }
        
        if (!active) {
          gestureStateRef.current.isPinching = false;
          setIsMultiTouch(false);
        }
      },
    },
    {
      target: backgroundRefForGesture,
      drag: {
        threshold: 5,
        pointer: { touch: true, mouse: false },
        filterTaps: true,
      },
      pinch: {
        threshold: 0,
      },
    }
  );

  /**
   * Bypass activation constraint if multi-touch is detected
   * This prevents drag from starting when user is trying to pan/zoom
   * Uses refs to avoid recreating callback on every state change
   */
  const bypassTouchActivation = useCallback((props: { event: Event; activeNode: unknown; options: unknown }) => {
    const { event } = props;
    
    // Only check touch events
    if (!(event instanceof TouchEvent)) {
      return false; // Don't bypass for non-touch events
    }
    
    // If multi-touch, bypass activation (prevent drag)
    if (event.touches.length > 1) {
      return true; // Bypass = prevent activation
    }
    
    // Check if multi-touch was detected by gesture handler or touch listener
    if (gestureStateRef.current.touchCount > 1 || isMultiTouchRef.current) {
      return true; // Bypass = prevent activation
    }
    
    return false; // Don't bypass = allow activation
  }, []);

  /**
   * Optimized sensor configuration
   * - PointerSensor: Fast activation for mouse (10px threshold)
   * - TouchSensor: Smart activation with multi-touch detection
   *   - Uses bypassActivationConstraint to prevent drag on multi-touch
   *   - Standard delay and tolerance for single touch
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
      bypassActivationConstraint: bypassTouchActivation,
    })
  );

  // Store initial transform state when touch starts on note
  const initialTransformRef = useRef<{ x: number; y: number; scale: number } | null>(null);

  /**
   * Handles panning - continuously prevents panning if touch started on a note
   * This is called by react-zoom-pan-pinch during panning
   * 
   * Optimized: Direct transform reset (react-zoom-pan-pinch handles batching internally)
   * This is a backup safety measure - the capture phase handlers should prevent most panning
   */
  const handlePanning = useCallback((ref: ReactZoomPanPinchRef, event: TouchEvent | MouseEvent) => {
    // Fast check: if touch started on a note and we're waiting for drag activation, prevent panning
    if (pendingNoteDragRef.current !== null && !activeId && event instanceof TouchEvent) {
      // Restore to initial position to prevent any panning
      // react-zoom-pan-pinch handles batching internally, so direct call is safe
      const initialTransform = initialTransformRef.current;
      if (initialTransform) {
        ref.setTransform(
          initialTransform.x,
          initialTransform.y,
          initialTransform.scale
        );
      }
    }
  }, [activeId]);

  /**
   * Handles panning start - stores initial transform and prevents panning if touch started on a note
   * This is called by react-zoom-pan-pinch when panning starts
   */
  const handlePanningStart = useCallback((ref: ReactZoomPanPinchRef, event: TouchEvent | MouseEvent) => {
    // Store initial transform state
    const currentState = ref.state;
    initialTransformRef.current = {
      x: currentState.positionX,
      y: currentState.positionY,
      scale: currentState.scale,
    };

    // If touch started on a note and we're waiting for drag activation, prevent panning
    if (pendingNoteDragRef.current !== null && !activeId && event instanceof TouchEvent) {
      // Immediately reset to prevent any panning
      ref.setTransform(
        initialTransformRef.current.x,
        initialTransformRef.current.y,
        initialTransformRef.current.scale
      );
    }
  }, [activeId]);

  /**
   * Panning configuration
   * - Disabled when dragging a note with single touch (prevents canvas pan during note drag)
   * - Disabled when touch starts on a note (prevents panning before drag activates)
   * - Enabled during multi-touch to allow simultaneous pan while dragging
   * - On PC, mouse pan is handled separately and doesn't conflict with note drag
   * - Uses shouldCancelOnMultiTouch to prevent conflicts
   */
  const panningConfig = useMemo(() => {
    // Disable panning if:
    // 1. Actively dragging a note (single touch)
    // 2. Touch started on a note (waiting for drag activation)
    const isPendingNoteDrag = pendingNoteDragRef.current !== null;
    const shouldDisable = (!!activeId && !isMultiTouch) || isPendingNoteDrag;
    
    return {
      disabled: shouldDisable,
      velocityDisabled: false,
      allowLeftClickPan: true,
      allowMiddleClickPan: false,
      allowRightClickPan: false,
      shouldCancelOnMultiTouch: false, // Don't cancel on multi-touch (we handle it)
    };
  }, [activeId, isMultiTouch]);

  /**
   * Wheel configuration
   * - Always enabled for wheel events (mouse wheel, trackpad)
   * - Allows zoom while dragging on PC (common UX pattern)
   */
  const wheelConfig = useMemo(() => ({
    step: 0.1,
    disabled: false, // Always allow wheel zoom
    wheelDisabled: false,
    touchPadDisabled: false,
  }), []);

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
          // Reset transform via react-zoom-pan-pinch
          if (transformRef.current) {
            transformRef.current.resetTransform();
          }
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
   * Prevents drag start if multi-touch is detected (should pan canvas instead)
   * Uses refs to avoid recreating callback on every state change
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    // Prevent drag if multi-touch is active (should pan/zoom canvas instead)
    if (isMultiTouchRef.current || gestureStateRef.current.touchCount > 1) {
      return;
    }
    
    // Reset cancellation flag
    dragCancelledRef.current = false;
    
    const noteId = event.active.id as string;
    
    // Clear pending drag timeout since drag activated
    if (pendingDragTimeoutRef.current !== null) {
      clearTimeout(pendingDragTimeoutRef.current);
      pendingDragTimeoutRef.current = null;
    }
    
    // Clear pending note drag ref
    if (pendingNoteDragRef.current === noteId) {
      pendingNoteDragRef.current = null;
      initialTouchTargetRef.current = null;
      initialTransformRef.current = null;
    }
    
    setActiveId(noteId);
    const position = notePositions.get(noteId);
    if (position) {
      setDragStartPosition({ x: position.x, y: position.y });
    }
    setHoveredNoteId(null);
    // Disable panning only for single-touch drags (mobile)
    setIsPanning(false);
  }, [notePositions]);

  /**
   * Handles drag move event
   * Checks for multi-touch during drag and cancels if detected
   * Uses refs to avoid recreating callback on every state change
   */
  const handleDragMove = useCallback(() => {
    // Check if multi-touch is detected during drag
    if (isMultiTouchRef.current || gestureStateRef.current.touchCount > 1) {
      // Mark drag as cancelled to prevent visual updates
      dragCancelledRef.current = true;
      // Cancel the drag by resetting state
      // @dnd-kit will handle the cancellation when it detects touch change
      setActiveId(null);
      setDragStartPosition(null);
    }
  }, []);

  /**
   * Handles drag cancel event
   * Called when drag is canceled (e.g., by multi-touch or ESC key)
   */
  const handleDragCancel = useCallback(() => {
    dragCancelledRef.current = false;
    setActiveId(null);
    setDragStartPosition(null);
  }, []);

  /**
   * Handles drag end event
   * Updates note position and assigns a new z-index to keep it elevated
   * Uses incremental counter approach (not fixed high values like 9999)
   * 
   * Coordinate conversion: delta is in screen pixels, divide by canvasScale
   * to convert to world coordinates (accounting for react-zoom-pan-pinch transform)
   * 
   * If multi-touch is detected, cancels the drag without updating position
   * Uses refs to avoid recreating callback on every state change
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    const noteId = active.id as string;
    
    // If drag was cancelled or multi-touch is active, don't update position
    if (dragCancelledRef.current || isMultiTouchRef.current || gestureStateRef.current.touchCount > 1) {
      dragCancelledRef.current = false;
      setActiveId(null);
      setDragStartPosition(null);
      return;
    }
    
    if (dragStartPosition && delta && (delta.x !== 0 || delta.y !== 0)) {
      // Convert delta from screen coordinates to world coordinates
      // react-zoom-pan-pinch handles the transform, so we just need to divide by scale
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
    
    dragCancelledRef.current = false;
    setActiveId(null);
    setDragStartPosition(null);
  }, [canvasScale, dragStartPosition]);

  /**
   * Updates background position and size based on current transform
   * Throttled with requestAnimationFrame to avoid excessive DOM updates during pan/zoom
   */
  useEffect(() => {
    if (backgroundUpdateRef.current !== null) {
      cancelAnimationFrame(backgroundUpdateRef.current);
    }
    
    backgroundUpdateRef.current = requestAnimationFrame(() => {
      if (backgroundRef.current) {
        backgroundRef.current.style.backgroundPosition = `${canvasPosition.x}px ${canvasPosition.y}px`;
        backgroundRef.current.style.backgroundSize = `${100 * canvasScale}%`;
      }
      backgroundUpdateRef.current = null;
    });
    
    return () => {
      if (backgroundUpdateRef.current !== null) {
        cancelAnimationFrame(backgroundUpdateRef.current);
      }
    };
  }, [canvasPosition.x, canvasPosition.y, canvasScale]);

  // Center view on notes when they're loaded (only once)
  useEffect(() => {
    if (
      !hasCenteredRef.current &&
      transformRef.current &&
      notes.length > 0 &&
      notePositions.size > 0 &&
      containerSize.width > 0 &&
      containerSize.height > 0
    ) {
      const positions = Array.from(notePositions.values());
      if (positions.length > 0) {
        const currentState = transformRef.current.state;
        // Only center if still at initial position
        if (currentState.positionX === 0 && currentState.positionY === 0 && currentState.scale === 1) {
          const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
          const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
          
          // Center view on average note position
          transformRef.current.setTransform(
            -avgX + containerSize.width / 2,
            -avgY + containerSize.height / 2,
            1
          );
          
          hasCenteredRef.current = true;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.length, notePositions.size, containerSize.width, containerSize.height]);

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

    // Use state values (updated by handleTransformChange) for coordinate calculation
    // react-zoom-pan-pinch coordinate system:
    // - positionX/positionY are the transform offset in screen pixels
    // - When you pan right, positionX increases (positive)
    // - Content moves left, so viewport sees content at (-positionX/scale, -positionY/scale) in world space
    // - Viewport size in world space = containerSize / scale
    const worldLeft = -canvasPosition.x / canvasScale;
    const worldTop = -canvasPosition.y / canvasScale;
    const worldRight = worldLeft + containerSize.width / canvasScale;
    const worldBottom = worldTop + containerSize.height / canvasScale;

    // Dynamic padding: scales with zoom (more padding when zoomed in)
    // Base padding of 500px ensures notes are visible before entering viewport
    // Additional padding scales with zoom (200px per scale unit)
    const worldPadding = 500 + (200 * canvasScale);
    
    const paddedLeft = worldLeft - worldPadding;
    const paddedTop = worldTop - worldPadding;
    const paddedRight = worldRight + worldPadding;
    const paddedBottom = worldBottom + worldPadding;

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
  }, [notes, notePositions, containerSize, canvasPosition, canvasScale]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only handle clicks on the background, not on notes
    const target = e.target as HTMLElement;
    if (target === e.currentTarget || target.classList.contains('canvas-background') || target.classList.contains('react-transform-component')) {
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
      className="w-full h-full bg-[#fdfef0] relative"
      onClick={handleCanvasClick}
      style={{ 
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {/* Infinite tiled background texture layer - optimized updates */}
      <div
        ref={backgroundRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/watercolor-paper.webp)',
          backgroundRepeat: 'repeat',
          backgroundSize: `${100 * canvasScale}%`,
          backgroundPosition: `${canvasPosition.x}px ${canvasPosition.y}px`,
          backgroundColor: '#fdfef0',
          backgroundBlendMode: 'multiply',
          zIndex: 0,
          willChange: 'background-position, background-size',
          backfaceVisibility: 'hidden',
        }}
      />
      <div 
        ref={backgroundRefForGesture}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      >
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={3}
          limitToBounds={false}
          panning={panningConfig}
          wheel={wheelConfig}
          doubleClick={{ disabled: true }}
          initialPositionX={0}
          initialPositionY={0}
          onPanningStart={handlePanningStart}
          onPanning={handlePanning}
          onTransformed={(ref) => {
            transformRef.current = ref;
            handleTransformChange(ref);
          }}
          onInit={(ref) => {
            transformRef.current = ref;
          }}
        >
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <TransformComponent
            wrapperClass="canvas-background"
            contentClass="canvas-content"
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                pointerEvents: 'none', // Allow events to pass through to wrapper for pan/zoom
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
          </TransformComponent>
        </DndContext>
      </TransformWrapper>
      </div>
    </div>
  );
}

