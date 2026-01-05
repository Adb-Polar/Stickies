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

  // Fetch notes from API with error handling and retry logic
  const fetchNotes = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/notes`, {
        mode: 'cors',
        credentials: 'omit',
        // Add timeout for slow networks (10 seconds)
        signal: AbortSignal.timeout?.(10000) || undefined,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Retry once on 401 (might be stale token)
          try {
            const retryResponse = await fetch(`${API_URL}/api/notes`, {
              mode: 'cors',
              credentials: 'omit',
              signal: AbortSignal.timeout?.(10000) || undefined,
            });
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              if (isMountedRef.current) {
                setNotes(Array.isArray(retryData.notes) ? retryData.notes : []);
                setIsLoading(false);
              }
              return;
            }
          } catch (retryError) {
            console.error('Retry fetch failed:', retryError);
          }
        }
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Failed to fetch notes:', response.status, response.statusText, errorText);
        if (isMountedRef.current) {
          setNotes([]);
          setIsLoading(false);
        }
        return;
      }

      const data = await response.json();
      if (isMountedRef.current) {
        // Ensure notes is always an array (defensive programming)
        setNotes(Array.isArray(data.notes) ? data.notes : []);
      }
    } catch (error) {
      // Handle network errors, timeouts, and other exceptions
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error: Backend API may not be running at', API_URL);
        console.error('Please ensure the backend server is running on port 3001');
      } else if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timeout: Backend API took too long to respond');
      } else {
        console.error('Error fetching notes:', error);
      }
      
      if (isMountedRef.current) {
        setNotes([]);
        setIsLoading(false);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
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
      // Use double RAF for slow machines to ensure transform is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isMountedRef.current && canvasTransform.transformRef.current) {
            try {
              flushSync(() => {
                canvasTransform.setTransform(centerX, centerY, 1);
              });
            } catch (error) {
              console.error('Error centering viewport:', error);
            }
          }
        });
      });
    },
  });

  // Track container size changes and reset transform on significant resize
  // Uses multiple strategies to ensure container size is always measured (cross-browser compatibility)
  useEffect(() => {
    let checkSizeInterval: ReturnType<typeof setInterval> | null = null;
    let checkSizeTimeout: ReturnType<typeof setTimeout> | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let rafId: number | null = null;

    function updateSize() {
      if (!containerRef.current || !isMountedRef.current) {
        return;
      }

      try {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        // Skip if container not yet measured (but don't block future updates)
        if (containerWidth === 0 && containerHeight === 0) {
          return;
        }

        setContainerSize((prevSize) => {
          // Only reset transform if size changed significantly (>100px)
          const sizeChanged =
            Math.abs(prevSize.width - containerWidth) > 100 ||
            Math.abs(prevSize.height - containerHeight) > 100;

          if (sizeChanged && (prevSize.width > 0 || prevSize.height > 0)) {
            // Use requestAnimationFrame for smooth transform reset
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
            }
            rafId = requestAnimationFrame(() => {
              if (isMountedRef.current && canvasTransform.transformRef.current) {
                try {
                  canvasTransform.resetTransform();
                } catch (error) {
                  console.error('Error resetting transform:', error);
                }
              }
              rafId = null;
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
      } catch (error) {
        console.error('Error updating container size:', error);
      }
    }

    // Initial size measurement - try multiple times for slow machines
    updateSize();
    
    // Retry mechanism for slow machines or delayed DOM rendering
    // Checks every 50ms (faster than 100ms for quicker initialization)
    const startSizeCheck = () => {
      if (checkSizeInterval) {
        clearInterval(checkSizeInterval);
      }
      
      checkSizeInterval = setInterval(() => {
        if (!containerRef.current || !isMountedRef.current) {
          return;
        }
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        if (width > 0 && height > 0) {
          updateSize();
          // Clear interval once we have valid size
          if (checkSizeInterval) {
            clearInterval(checkSizeInterval);
            checkSizeInterval = null;
          }
          if (checkSizeTimeout) {
            clearTimeout(checkSizeTimeout);
            checkSizeTimeout = null;
          }
        }
      }, 50); // Check every 50ms for faster initialization
      
      // Clear interval after 10 seconds (longer timeout for slow machines)
      checkSizeTimeout = setTimeout(() => {
        if (checkSizeInterval) {
          clearInterval(checkSizeInterval);
          checkSizeInterval = null;
        }
      }, 10000);
    };

    if (containerRef.current) {
      startSizeCheck();
    } else {
      // If container not ready, wait a bit and try again
      const delayedCheck = setTimeout(() => {
        if (containerRef.current) {
          startSizeCheck();
        }
      }, 100);
      
      return () => {
        clearTimeout(delayedCheck);
      };
    }

    // Use ResizeObserver for efficient size tracking (modern browsers)
    const container = containerRef.current;
    if (container && typeof ResizeObserver !== 'undefined') {
      try {
        resizeObserver = new ResizeObserver(() => {
          updateSize();
        });
        resizeObserver.observe(container);
      } catch (error) {
        console.error('Error creating ResizeObserver:', error);
      }
    }

    // Fallback: window resize events (works on all browsers)
    window.addEventListener('resize', updateSize, { passive: true });
    window.addEventListener('orientationchange', updateSize, { passive: true });

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
      if (resizeObserver) {
        try {
          resizeObserver.disconnect();
        } catch (error) {
          console.error('Error disconnecting ResizeObserver:', error);
        }
      }
      if (checkSizeInterval) {
        clearInterval(checkSizeInterval);
      }
      if (checkSizeTimeout) {
        clearTimeout(checkSizeTimeout);
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [canvasTransform]);
  
  // Fallback: Ensure container size is set even if initial measurement fails
  // This handles edge cases on slow machines or when DOM isn't ready
  useEffect(() => {
    if (containerSize.width === 0 && containerSize.height === 0 && containerRef.current && isMountedRef.current) {
      // Try multiple times with increasing delays for maximum compatibility
      const timeouts: ReturnType<typeof setTimeout>[] = [];
      
      [100, 300, 500, 1000].forEach((delay) => {
        const timeoutId = setTimeout(() => {
          if (containerRef.current && isMountedRef.current) {
            try {
              const width = containerRef.current.clientWidth;
              const height = containerRef.current.clientHeight;
              if (width > 0 || height > 0) {
                setContainerSize({ width, height });
                // Clear remaining timeouts once we have a valid size
                timeouts.forEach((id) => clearTimeout(id));
              }
            } catch (error) {
              console.error('Error in container size fallback:', error);
            }
          }
        }, delay);
        timeouts.push(timeoutId);
      });
      
      return () => {
        timeouts.forEach((id) => clearTimeout(id));
      };
    }
  }, [containerSize.width, containerSize.height]);

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

  // Update background position and size based on transform
  // Throttled with requestAnimationFrame for performance
  useEffect(() => {
    if (backgroundUpdateRef.current !== null) {
      cancelAnimationFrame(backgroundUpdateRef.current);
    }

    backgroundUpdateRef.current = requestAnimationFrame(() => {
      if (!isMountedRef.current) {
        backgroundUpdateRef.current = null;
        return;
      }
      
      // Safely update background styles with error handling
      if (backgroundRef.current) {
        try {
          backgroundRef.current.style.backgroundPosition = `${canvasTransform.canvasPosition.x}px ${canvasTransform.canvasPosition.y}px`;
          backgroundRef.current.style.backgroundSize = `${100 * canvasTransform.canvasScale}%`;
        } catch (error) {
          console.error('Error updating background styles:', error);
        }
      }
      backgroundUpdateRef.current = null;
    });

    return () => {
      if (backgroundUpdateRef.current !== null) {
        cancelAnimationFrame(backgroundUpdateRef.current);
        backgroundUpdateRef.current = null;
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
      {/* Background layer - explicitly set to z-index 0 to ensure it's below notes */}
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
          zIndex: 0, // Background always below notes (notes start at z-index 1)
          willChange: 'background-position, background-size',
          backfaceVisibility: 'hidden',
        }}
      />
      {/* Notes container - positioned above background, notes have z-index >= 1 */}
      {/* touch-action: none required for use-gesture drag gestures to work correctly */}
      <div ref={backgroundRefForGesture} style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1, touchAction: 'none' }}>
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
            // Initialize transform ref when component mounts - critical for pan/zoom to work
            // Use requestAnimationFrame to ensure DOM is ready (handles slow machines)
            requestAnimationFrame(() => {
              if (isMountedRef.current && ref) {
                try {
                  canvasTransform.transformRef.current = ref;
                  // Trigger initial transform update to sync state
                  // This ensures background position updates correctly
                  canvasTransform.handleTransformChange(ref);
                } catch (error) {
                  console.error('Error initializing transform:', error);
                }
              }
            });
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
                {/* Render visible notes - only notes in viewport are rendered for performance */}
                {visibleNotes.length > 0 ? (
                  visibleNotes.map((note) => {
                    const position = notePositionsHook.notePositions.get(note.id) || { x: 0, y: 0, rotation: 0 };
                    const opacity = notePositionsHook.noteOpacities.get(note.id) ?? 1;
                    const isSelected = selectedNoteId === note.id;
                    const isHovered = hoveredNoteId === note.id;
                    const isDragging = dragHandler.activeId === note.id;
                    const isPendingDrag = touchHandler.pendingDragNoteId === note.id && !isDragging;
                    // Notes z-index: 1 (normal), 5 (hovered), 10 (selected), 1001+ (dragging)
                    // Always >= 1 to ensure notes render above background (z-index 0)
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
                  })
                ) : notes.length > 0 && containerSize.width === 0 ? (
                  // Show message if notes exist but container size isn't initialized yet
                  <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    fontFamily: 'Caveat, cursive',
                    fontSize: '18px',
                    color: '#171c28',
                    pointerEvents: 'none'
                  }}>
                    Initializing canvas...
                  </div>
                ) : null}
              </div>
            </TransformComponent>
          </DndContext>
        </TransformWrapper>
      </div>
    </div>
  );
}
