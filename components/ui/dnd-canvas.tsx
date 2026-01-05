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

import { useState, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { DndContext } from '@dnd-kit/core';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useAuth } from '@/components/providers/auth-provider';
import { API_URL } from '@/lib/api-config';
import { DraggableNote, type Note } from './draggable-note';
import { useTouchHandler } from '@/components/hooks/use-touch-handler';
import { useGestureHandler } from '@/components/hooks/use-gesture-handler';
import { useDragHandler } from '@/components/hooks/use-drag-handler';
import { useNotePositions } from '@/components/hooks/use-note-positions';
import { useViewportCulling } from '@/components/hooks/use-viewport-culling';
import { useCanvasTransform } from '@/components/hooks/use-canvas-transform';

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
 * @param props - Component props
 * @returns JSX element
 */
export function DndCanvas({ onNoteSelect, onNoteView, selectedNoteId, refreshKey }: DndCanvasProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [noteZIndices, setNoteZIndices] = useState<Map<string, number>>(new Map());
  const [pendingDragNoteId, setPendingDragNoteId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const backgroundRefForGesture = useRef<HTMLDivElement>(null);
  const hoverUpdateRef = useRef<number | null>(null);
  const backgroundUpdateRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const { token, user } = useAuth();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  // State for coordinating between hooks (activeId and isMultiTouch need to be shared)
  const [activeIdState, setActiveIdState] = useState<string | null>(null);
  const [isMultiTouchState, setIsMultiTouchState] = useState(false);

  // Manages canvas pan/zoom transform state and prevents panning during note drags
  const canvasTransform = useCanvasTransform({
    pendingDragNoteId,
    activeId: activeIdState,
    isMultiTouch: isMultiTouchState,
  });

  // Detects gestures and routes them between note dragging and canvas panning
  const gestureHandler = useGestureHandler({
    backgroundRef: backgroundRefForGesture as React.RefObject<HTMLDivElement>,
    activeId: activeIdState,
    onMultiTouchChange: setIsMultiTouchState,
  });

  // Manages note positions, initializes new notes, and handles fade-in animations
  const notePositionsHook = useNotePositions({
    notes,
    containerSize,
    refreshKey,
    onCentered: (centerX, centerY) => {
      // Center viewport on notes when they first load
      requestAnimationFrame(() => {
        if (canvasTransform.transformRef.current) {
          flushSync(() => {
            canvasTransform.setTransform(centerX, centerY, 1);
          });
        }
      });
    },
  });

  // Track container size changes and reset transform on significant resize
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        // Skip if container not yet measured
        if (containerWidth === 0 && containerHeight === 0) {
          return;
        }

        setContainerSize((prevSize) => {
          // Only reset transform if size changed significantly (>100px)
          const sizeChanged =
            Math.abs(prevSize.width - containerWidth) > 100 ||
            Math.abs(prevSize.height - containerHeight) > 100;

          if (sizeChanged && (prevSize.width > 0 || prevSize.height > 0)) {
            requestAnimationFrame(() => {
              canvasTransform.resetTransform();
            });
          }

          // Return previous value if unchanged to prevent unnecessary re-renders
          if (prevSize.width === containerWidth && prevSize.height === containerHeight) {
            return prevSize;
          }

          return {
            width: containerWidth,
            height: containerHeight,
          };
        });
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
  }, [canvasTransform]);

  const handleNoteView = useCallback(
    (note: Note) => {
      if (onNoteView) {
        onNoteView(note);
      }
    },
    [onNoteView],
  );

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

  // Callbacks for drag handler to update note positions and z-indices
  const handlePositionUpdate = useCallback(
    (noteId: string, position: { x: number; y: number }) => {
      notePositionsHook.updatePosition(noteId, position);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notePositionsHook.updatePosition],
  );

  const handleZIndexUpdate = useCallback((noteId: string, zIndex: number) => {
    setNoteZIndices((prev) => {
      const next = new Map(prev);
      next.set(noteId, zIndex);
      return next;
    });
  }, []);

  // Handles drag-and-drop operations: start, move, end, cancel
  const dragHandler = useDragHandler({
    notePositions: notePositionsHook.notePositions,
    canvasScale: canvasTransform.canvasScale,
    isMultiTouch: gestureHandler.isMultiTouch,
    gestureState: gestureHandler.gestureState,
    onPositionUpdate: handlePositionUpdate,
    onZIndexUpdate: handleZIndexUpdate,
  });

  // Sync activeId to coordinate between hooks
  useEffect(() => {
    setActiveIdState(dragHandler.activeId);
  }, [dragHandler.activeId]);

  // Handles touch events to distinguish note drags from canvas panning
  const touchHandler = useTouchHandler(containerRef as React.RefObject<HTMLDivElement>, {
    activeId: dragHandler.activeId,
    onPendingDragChange: setPendingDragNoteId,
  });

  // Only render notes visible in viewport for performance
  const visibleNotes = useViewportCulling({
    notes,
    notePositions: notePositionsHook.notePositions,
    containerSize,
    canvasPosition: canvasTransform.canvasPosition,
    canvasScale: canvasTransform.canvasScale,
  });

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target === e.currentTarget ||
        target.classList.contains('canvas-background') ||
        target.classList.contains('react-transform-component')
      ) {
        if (onNoteSelect && !dragHandler.activeId) {
          onNoteSelect(null);
        }
      }
    },
    [onNoteSelect, dragHandler.activeId],
  );

  const createHoverHandlers = useCallback(
    (noteId: string) => {
      return {
        onMouseEnter: () => {
          if (!dragHandler.activeId && hoverUpdateRef.current === null) {
            hoverUpdateRef.current = requestAnimationFrame(() => {
              if (!isMountedRef.current) {
                hoverUpdateRef.current = null;
                return;
              }
              setHoveredNoteId(noteId);
              hoverUpdateRef.current = null;
            });
          }
        },
        onMouseLeave: () => {
          if (!dragHandler.activeId && hoverUpdateRef.current === null) {
            hoverUpdateRef.current = requestAnimationFrame(() => {
              if (!isMountedRef.current) {
                hoverUpdateRef.current = null;
                return;
              }
              setHoveredNoteId(null);
              hoverUpdateRef.current = null;
            });
          }
        },
      };
    },
    [dragHandler.activeId],
  );

  useEffect(() => {
    if (backgroundUpdateRef.current !== null) {
      cancelAnimationFrame(backgroundUpdateRef.current);
    }

    backgroundUpdateRef.current = requestAnimationFrame(() => {
      if (!isMountedRef.current) {
        backgroundUpdateRef.current = null;
        return;
      }
      if (backgroundRef.current) {
        backgroundRef.current.style.backgroundPosition = `${canvasTransform.canvasPosition.x}px ${canvasTransform.canvasPosition.y}px`;
        backgroundRef.current.style.backgroundSize = `${100 * canvasTransform.canvasScale}%`;
      }
      backgroundUpdateRef.current = null;
    });

    return () => {
      if (backgroundUpdateRef.current !== null) {
        cancelAnimationFrame(backgroundUpdateRef.current);
      }
    };
  }, [canvasTransform.canvasPosition.x, canvasTransform.canvasPosition.y, canvasTransform.canvasScale]);

  if (isLoading) {
    return (
      <div ref={containerRef} className="w-full h-full bg-[#fdfef0] flex items-center justify-center">
        <div className="text-[#171c28]" style={{ fontFamily: 'Caveat, cursive', fontSize: '18px' }}>
          Loading notes...
        </div>
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
      <div
        ref={backgroundRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/watercolor-paper.webp)',
          backgroundRepeat: 'repeat',
          backgroundSize: `${100 * canvasTransform.canvasScale}%`,
          backgroundPosition: `${canvasTransform.canvasPosition.x}px ${canvasTransform.canvasPosition.y}px`,
          backgroundColor: '#fdfef0',
          backgroundBlendMode: 'multiply',
          zIndex: 0,
          willChange: 'background-position, background-size',
          backfaceVisibility: 'hidden',
        }}
      />
      <div ref={backgroundRefForGesture} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={3}
          limitToBounds={false}
          panning={canvasTransform.panningConfig}
          wheel={canvasTransform.wheelConfig}
          doubleClick={{ disabled: true }}
          initialPositionX={0}
          initialPositionY={0}
          onPanningStart={canvasTransform.handlePanningStart}
          onPanning={canvasTransform.handlePanning}
          onTransformed={(ref) => {
            canvasTransform.transformRef.current = ref;
            canvasTransform.handleTransformChange(ref);
          }}
          onInit={(ref) => {
            canvasTransform.transformRef.current = ref;
          }}
        >
          <DndContext
            sensors={dragHandler.sensors}
            onDragStart={dragHandler.handleDragStart}
            onDragMove={dragHandler.handleDragMove}
            onDragEnd={dragHandler.handleDragEnd}
            onDragCancel={dragHandler.handleDragCancel}
          >
            <TransformComponent wrapperClass="canvas-background" contentClass="canvas-content">
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                {visibleNotes.map((note) => {
                  const position = notePositionsHook.notePositions.get(note.id) || { x: 0, y: 0, rotation: 0 };
                  const opacity = notePositionsHook.noteOpacities.get(note.id) ?? 1;
                  const isSelected = selectedNoteId === note.id;
                  const isHovered = hoveredNoteId === note.id;
                  const isDragging = dragHandler.activeId === note.id;
                  const isPendingDrag = touchHandler.pendingDragNoteId === note.id && !isDragging;
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
                      canvasScale={canvasTransform.canvasScale}
                      isDragging={isDragging}
                      isPendingDrag={isPendingDrag}
                      zIndex={noteZIndex}
                      isPanning={gestureHandler.isPanning}
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
