'use client';

import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage as StageType } from 'konva/lib/Stage';
import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useAuth } from '@/components/providers/auth-provider';

interface Note {
  id: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  userId: string;
  user: {
    id: string;
    email: string;
    username: string | null;
  };
}

interface KonvaCanvasProps {
  onNoteSelect?: (note: Note | null) => void;
  selectedNoteId?: string | null;
  refreshKey?: number;
}

import { API_URL } from '@/lib/api-config';

const NOTE_COLORS: Record<string, { main: string; header: string }> = {
  '#eebea8': { main: '#eebea8', header: '#ebae95' },
  '#aad1fa': { main: '#aad1fa', header: '#95c8f6' },
  '#f6cca4': { main: '#f6cca4', header: '#f4c08d' },
  '#eeddb1': { main: '#eeddb1', header: '#ead6a1' },
  '#faefad': { main: '#faefad', header: '#f9ef99' },
  '#ccaf9d': { main: '#ccaf9d', header: '#caa88f' },
  '#bbfce6': { main: '#bbfce6', header: '#a9fce0' },
  '#b3b0f7': { main: '#b3b0f7', header: '#9f9bf8' },
};

function getNoteColor(color: string): { main: string; header: string } {
  return NOTE_COLORS[color] || { main: color, header: color };
}

// Move darkenColor outside render loop for performance
function darkenColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Constants for note calculations (moved outside component)
const NOTE_WIDTH = 200;
const HEADER_HEIGHT = 25;
const TEXT_PADDING = 6;
const FONT_SIZE = 21.6;
const LINE_HEIGHT = 1.26;
const MIN_NOTE_HEIGHT = 200;
const MAX_NOTE_HEIGHT = 3000;
const AVG_WORD_LENGTH = 5;

// Memoized note calculation function
function calculateNoteDimensions(content: string, hasAuthor: boolean) {
  const charWidth = FONT_SIZE * 0.6;
  const textAreaWidth = NOTE_WIDTH - TEXT_PADDING * 2;
  const charsPerLine = Math.floor(textAreaWidth / charWidth);
  const wordsPerLine = Math.floor(charsPerLine / AVG_WORD_LENGTH);
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const estimatedLines = Math.max(1, Math.ceil((wordCount / wordsPerLine) * 0.62));
  const contentHeight = (estimatedLines - 1) * (FONT_SIZE * LINE_HEIGHT) + FONT_SIZE;
  
  const authorSpacing = TEXT_PADDING * 0.5;
  const authorHeight = hasAuthor ? FONT_SIZE + TEXT_PADDING + authorSpacing : 0;
  const textHeight = TEXT_PADDING + contentHeight + authorHeight;
  const calculatedHeight = HEADER_HEIGHT + textHeight;
  const noteHeight = Math.max(MIN_NOTE_HEIGHT, Math.min(calculatedHeight, MAX_NOTE_HEIGHT));
  const authorY = noteHeight - HEADER_HEIGHT - TEXT_PADDING - FONT_SIZE;
  
  return { noteHeight, authorHeight, authorY };
}

// Memoized Note Component for performance
interface NoteComponentProps {
  note: Note;
  position: { x: number; y: number; rotation: number };
  opacity: number;
  isSelected: boolean;
  isHovered: boolean;
  onNoteClick: (note: Note) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const NoteComponent = memo(({
  note,
  position,
  opacity,
  isSelected,
  isHovered,
  onNoteClick,
  onMouseEnter,
  onMouseLeave,
}: NoteComponentProps) => {
  // Memoize expensive calculations
  const colors = useMemo(() => getNoteColor(note.color), [note.color]);
  const headerColor = useMemo(() => darkenColor(colors.header, 20), [colors.header]);
  const authorName = useMemo(() => note.user.username ? `-${note.user.username}` : '', [note.user.username]);
  const dimensions = useMemo(() => calculateNoteDimensions(note.content, !!authorName), [note.content, authorName]);
  
  const scale = isHovered ? 1.03 : 1;
  const scaleOffsetX = ((scale - 1) * NOTE_WIDTH) / 2;
  const scaleOffsetY = ((scale - 1) * dimensions.noteHeight) / 2;

  const handleClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onNoteClick(note);
  }, [note, onNoteClick]);

  const handleTap = useCallback((e: KonvaEventObject<TouchEvent>) => {
    e.cancelBubble = true;
    onNoteClick(note);
  }, [note, onNoteClick]);

  return (
    <Group
      x={position.x - scaleOffsetX}
      y={position.y - scaleOffsetY}
      rotation={position.rotation}
      draggable={false}
      onClick={handleClick}
      onTap={handleTap}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      opacity={opacity}
      scaleX={scale}
      scaleY={scale}
      listening={true}
    >
      {/* Bottom square - main note body with Konva drop shadow */}
      <Rect
        x={0}
        y={0}
        width={NOTE_WIDTH}
        height={dimensions.noteHeight}
        fill={colors.main}
        stroke="rgba(0, 0, 0, 0.57)"
        strokeWidth={isSelected ? 2.5 : isHovered ? 1.5 : 1}
        cornerRadius={0}
        shadowBlur={12}
        shadowColor="rgba(0, 0, 0, 0.25)"
        shadowOffsetX={4}
        shadowOffsetY={10}
        shadowOpacity={0.8}
        listening={false}
      />
      {/* Top rectangle - adhesive tape, full width, darker */}
      <Rect
        x={0}
        y={0}
        width={NOTE_WIDTH}
        height={HEADER_HEIGHT}
        fill={headerColor}
        stroke="rgba(0, 0, 0, 0.57)"
        strokeWidth={isSelected ? 2.5 : isHovered ? 1.5 : 1}
        cornerRadius={0}
        listening={false}
      />
      {/* Text aligned to top left with uniform padding */}
      <Group 
        x={0} 
        y={HEADER_HEIGHT}
        clipX={0}
        clipY={0}
        clipWidth={NOTE_WIDTH}
        clipHeight={dimensions.noteHeight - HEADER_HEIGHT}
        listening={false}
      >
        {/* Main content text */}
        <Group
          x={0}
          y={0}
          clipX={0}
          clipY={0}
          clipWidth={NOTE_WIDTH}
          clipHeight={dimensions.noteHeight - HEADER_HEIGHT - dimensions.authorHeight}
          listening={false}
        >
          <Text
            x={TEXT_PADDING}
            y={TEXT_PADDING}
            width={NOTE_WIDTH - TEXT_PADDING * 2}
            height={dimensions.noteHeight - HEADER_HEIGHT - dimensions.authorHeight - TEXT_PADDING * 2}
            text={note.content}
            fontSize={FONT_SIZE}
            fontFamily="Caveat"
            fontStyle="normal"
            fill="#171c28"
            wrap="word"
            align="left"
            verticalAlign="top"
            lineHeight={LINE_HEIGHT}
            letterSpacing={0.2}
            listening={false}
            ellipsis={true}
            offsetY={0}
          />
        </Group>
        {/* Author name */}
        {authorName && (
          <Text
            x={TEXT_PADDING}
            y={dimensions.authorY}
            width={NOTE_WIDTH - TEXT_PADDING * 2}
            text={authorName}
            fontSize={FONT_SIZE}
            fontFamily="Caveat"
            fontStyle="normal"
            fill="#171c28"
            align="left"
            listening={false}
            offsetY={0}
          />
        )}
      </Group>
    </Group>
  );
});

NoteComponent.displayName = 'NoteComponent';

function getNotePosition(
  stageWidth: number,
  stageHeight: number,
  existingPositions: Array<{ x: number; y: number }> = [],
): { x: number; y: number; rotation: number } {
  const noteSize = 200;
  const minSpacing = noteSize * 1.2; // Minimum spacing between notes (20% gap)
  const maxAttempts = 50;
  
  // Try to find a position that doesn't overlap with existing notes
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Use a more spread out distribution - not just radial from center
    // Distribute across the entire canvas with some randomness
    const x = Math.random() * (stageWidth + noteSize * 2) - noteSize;
    const y = Math.random() * (stageHeight + noteSize * 2) - noteSize;
    
    // Check if this position overlaps with existing notes
    let hasOverlap = false;
    for (const existing of existingPositions) {
      const distance = Math.hypot(x - existing.x, y - existing.y);
      if (distance < minSpacing) {
        hasOverlap = true;
        break;
      }
    }
    
    if (!hasOverlap || attempt === maxAttempts - 1) {
      // Rotation: subtle rotation for natural look
      const rotation = (Math.random() - 0.5) * 20; // -10 to +10 degrees
      return { x, y, rotation };
    }
  }
  
  // Fallback: random position if all attempts failed
  const rotation = (Math.random() - 0.5) * 20;
  return {
    x: Math.random() * (stageWidth + noteSize * 2) - noteSize,
    y: Math.random() * (stageHeight + noteSize * 2) - noteSize,
    rotation,
  };
}

export function KonvaCanvas({ onNoteSelect, selectedNoteId, refreshKey }: KonvaCanvasProps) {
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notePositions, setNotePositions] = useState<Map<string, { x: number; y: number; rotation: number }>>(
    new Map(),
  );
  const [noteOpacities, setNoteOpacities] = useState<Map<string, number>>(new Map());
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<StageType | null>(null);
  const initializedNotesRef = useRef<Set<string>>(new Set());
  const { token, user } = useAuth();

  const fetchNotes = useCallback(async () => {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/notes`, {
        headers,
        // Add mode and credentials for better cross-origin handling
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        if (response.status === 401) {
          setNotes([]);
          setIsLoading(false);
          return;
        }
        throw new Error(`Failed to fetch notes: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      // Only log network errors, don't show to user if it's a connection issue
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error: Backend API may not be running at', API_URL);
        console.error('Please ensure the backend server is running on port 3001');
      }
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes, refreshKey]);

  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      initializedNotesRef.current.clear();
    }
  }, [refreshKey]);

  useEffect(() => {
    if (notes.length > 0 && stageSize.width > 0 && stageSize.height > 0) {
      setNotePositions((prevPositions) => {
        const newPositions = new Map(prevPositions);
        const newNoteIds = new Set(notes.map((n) => n.id));
        let hasNewNotes = false;

        // Collect existing positions for overlap checking
        const existingPositions = Array.from(newPositions.values()).map(p => ({ x: p.x, y: p.y }));
        
        notes.forEach((note) => {
          const existingPos = prevPositions.get(note.id);
          if (!existingPos || existingPos.x === 0 && existingPos.y === 0) {
            const pos = getNotePosition(stageSize.width, stageSize.height, existingPositions);
            newPositions.set(note.id, pos);
            existingPositions.push({ x: pos.x, y: pos.y });
            initializedNotesRef.current.add(note.id);
            hasNewNotes = true;
          } else if (!initializedNotesRef.current.has(note.id)) {
            initializedNotesRef.current.add(note.id);
          }
        });

        prevPositions.forEach((_, noteId) => {
          if (!newNoteIds.has(noteId)) {
            newPositions.delete(noteId);
            initializedNotesRef.current.delete(noteId);
          }
        });

        if (hasNewNotes) {
          setNoteOpacities((prev) => {
            const next = new Map(prev);
            notes.forEach((note) => {
              if (!next.has(note.id) || next.get(note.id) === undefined) {
                next.set(note.id, 0);
              }
            });
            return next;
          });

          notes.forEach((note, index) => {
            const existingPos = prevPositions.get(note.id);
            if (!existingPos || existingPos.x === 0 && existingPos.y === 0) {
              setTimeout(() => {
                setNoteOpacities((prev) => {
                  const next = new Map(prev);
                  next.set(note.id, 1);
                  return next;
                });
              }, index * 50);
            }
          });
        }

        return newPositions;
      });
    }
  }, [notes, stageSize.width, stageSize.height, refreshKey]);

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // Reset stage position and scale on significant size change (viewport switch)
        const sizeChanged = Math.abs(stageSize.width - containerWidth) > 100 || 
                           Math.abs(stageSize.height - containerHeight) > 100;
        
        setStageSize({
          width: containerWidth,
          height: containerHeight,
        });
        
        // Reset position/scale if viewport changed significantly (desktop <-> mobile)
        if (sizeChanged && (stageSize.width > 0 || stageSize.height > 0)) {
          setStagePosition({ x: 0, y: 0 });
          setStageScale(1);
          setIsDragging(false);
          // Cancel any pending updates
          if (positionUpdateRef.current !== null) {
            cancelAnimationFrame(positionUpdateRef.current);
            positionUpdateRef.current = null;
          }
          if (zoomUpdateRef.current !== null) {
            cancelAnimationFrame(zoomUpdateRef.current);
            zoomUpdateRef.current = null;
          }
        }
      }
    }

    updateSize();
    
    // Use ResizeObserver for better performance and to catch all resize events
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
  }, [stageSize.width, stageSize.height]);

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

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>) => {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty && onNoteSelect && !isDragging) {
        onNoteSelect(null);
      }
    },
    [onNoteSelect, isDragging],
  );

  const handleStagePointerDown = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    // Check if it's a mouse event (button 0 = left click) or touch event
    const isMouseEvent = e.evt instanceof MouseEvent;
    const isTouchEvent = e.evt instanceof TouchEvent;
    
    if ((isMouseEvent && (e.evt as MouseEvent).button === 0) || isTouchEvent) {
      if (e.target === stage) {
        setIsDragging(true);
        const pointerPos = stage.getPointerPosition();
        if (pointerPos) {
          setLastPointerPosition({
            x: pointerPos.x - stagePosition.x * stageScale,
            y: pointerPos.y - stagePosition.y * stageScale,
          });
        }
      }
    }
  }, [stageScale, stagePosition]);

  // Throttle position updates for better mobile performance
  const positionUpdateRef = useRef<number | null>(null);
  const handleStagePointerMove = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDragging) return;
    
    // Throttle updates using requestAnimationFrame for smooth 60fps
    if (positionUpdateRef.current !== null) {
      return;
    }
    
    positionUpdateRef.current = requestAnimationFrame(() => {
      const stage = e.target.getStage();
      if (!stage) {
        positionUpdateRef.current = null;
        return;
      }
      const pointerPos = stage.getPointerPosition();
      
      if (pointerPos) {
        setStagePosition({
          x: (pointerPos.x - lastPointerPosition.x) / stageScale,
          y: (pointerPos.y - lastPointerPosition.y) / stageScale,
        });
      }
      positionUpdateRef.current = null;
    });
  }, [isDragging, stageScale, lastPointerPosition]);

  const handleStagePointerUp = useCallback(() => {
    setIsDragging(false);
    // Cancel any pending position updates
    if (positionUpdateRef.current !== null) {
      cancelAnimationFrame(positionUpdateRef.current);
      positionUpdateRef.current = null;
    }
  }, []);

  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    const scaleBy = 1.1;
    const oldScale = stageScale;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.5, Math.min(3, newScale));

    const mousePointTo = {
      x: (pointerPos.x - stagePosition.x * oldScale) / oldScale,
      y: (pointerPos.y - stagePosition.y * oldScale) / oldScale,
    };

    const newPos = {
      x: pointerPos.x / clampedScale - mousePointTo.x,
      y: pointerPos.y / clampedScale - mousePointTo.y,
    };

    setStageScale(clampedScale);
    setStagePosition(newPos);
  }, [stageScale, stagePosition]);

  // Handle pinch-to-zoom on mobile with throttling
  const lastTouchDistance = useRef<number | null>(null);
  const zoomUpdateRef = useRef<number | null>(null);
  const handleStageTouchMove = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    const touches = e.evt.touches;
    if (touches.length === 2) {
      // Pinch zoom - throttle updates
      if (zoomUpdateRef.current !== null) {
        return;
      }
      
      const touch1 = { x: touches[0].clientX, y: touches[0].clientY };
      const touch2 = { x: touches[1].clientX, y: touches[1].clientY };
      const distance = Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y);
      
      if (lastTouchDistance.current !== null) {
        zoomUpdateRef.current = requestAnimationFrame(() => {
          const scaleBy = distance / lastTouchDistance.current!;
          const newScale = stageScale * scaleBy;
          const clampedScale = Math.max(0.5, Math.min(3, newScale));
          
          const pointerPos = stage.getPointerPosition();
          
          if (pointerPos) {
            const mousePointTo = {
              x: (pointerPos.x - stagePosition.x * stageScale) / stageScale,
              y: (pointerPos.y - stagePosition.y * stageScale) / stageScale,
            };
            
            const newPos = {
              x: pointerPos.x / clampedScale - mousePointTo.x,
              y: pointerPos.y / clampedScale - mousePointTo.y,
            };
            
            setStageScale(clampedScale);
            setStagePosition(newPos);
          }
          zoomUpdateRef.current = null;
        });
      }
      
      lastTouchDistance.current = distance;
      e.evt.preventDefault();
    } else if (touches.length === 1) {
      // Single touch pan
      lastTouchDistance.current = null;
      if (zoomUpdateRef.current !== null) {
        cancelAnimationFrame(zoomUpdateRef.current);
        zoomUpdateRef.current = null;
      }
    }
  }, [stageScale, stagePosition]);

  const handleStageTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    setIsDragging(false);
    // Cancel any pending updates
    if (positionUpdateRef.current !== null) {
      cancelAnimationFrame(positionUpdateRef.current);
      positionUpdateRef.current = null;
    }
    if (zoomUpdateRef.current !== null) {
      cancelAnimationFrame(zoomUpdateRef.current);
      zoomUpdateRef.current = null;
    }
  }, []);

  // Viewport culling: only render notes visible in viewport (critical for mobile performance)
  const visibleNotes = useMemo(() => {
    if (notes.length === 0 || stageSize.width === 0 || stageSize.height === 0) {
      return notes;
    }

    // Calculate viewport bounds in world coordinates
    const viewportLeft = -stagePosition.x * stageScale;
    const viewportTop = -stagePosition.y * stageScale;
    const viewportRight = viewportLeft + stageSize.width / stageScale;
    const viewportBottom = viewportTop + stageSize.height / stageScale;

    // Add padding to render notes slightly outside viewport (for smooth scrolling)
    const padding = 100;
    const paddedLeft = viewportLeft - padding;
    const paddedTop = viewportTop - padding;
    const paddedRight = viewportRight + padding;
    const paddedBottom = viewportBottom + padding;

    return notes.filter((note) => {
      const position = notePositions.get(note.id);
      if (!position) return true; // Include notes without position (will be positioned)

      // Get note dimensions (approximate, using max height for safety)
      const noteRight = position.x + NOTE_WIDTH;
      const noteBottom = position.y + MAX_NOTE_HEIGHT;

      // Check if note intersects with padded viewport
      return (
        position.x < paddedRight &&
        noteRight > paddedLeft &&
        position.y < paddedBottom &&
        noteBottom > paddedTop
      );
    });
  }, [notes, notePositions, stagePosition, stageScale, stageSize]);

  if (isLoading) {
    return (
      <div ref={containerRef} className="w-full h-full bg-[#fdfef0] flex items-center justify-center">
        <div className="text-[#171c28]" style={{ fontFamily: 'Caveat, cursive', fontSize: '18px' }}>Loading notes...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-[#fdfef0] relative overflow-hidden">
      {stageSize.width > 0 && stageSize.height > 0 && (
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseDown={handleStagePointerDown}
          onMouseMove={handleStagePointerMove}
          onMouseUp={handleStagePointerUp}
          onMouseLeave={handleStagePointerUp}
          onTouchStart={handleStagePointerDown}
          onTouchMove={(e) => {
            handleStageTouchMove(e);
            handleStagePointerMove(e);
          }}
          onTouchEnd={handleStageTouchEnd}
          onWheel={handleWheel}
          style={{ cursor: isDragging ? 'move' : 'default', touchAction: 'none' }}
        >
          <Layer 
            x={stagePosition.x * stageScale} 
            y={stagePosition.y * stageScale} 
            scaleX={stageScale} 
            scaleY={stageScale}
            listening={!isDragging} // Disable hit detection while dragging for better performance
            perfectDrawEnabled={false}
            imageSmoothingEnabled={true}
            hitGraphEnabled={false}
          >
            {visibleNotes.map((note) => {
              const position = notePositions.get(note.id) || { x: 0, y: 0, rotation: 0 };
              const opacity = noteOpacities.get(note.id) ?? 1;
              const isSelected = selectedNoteId === note.id;
              const isHovered = hoveredNoteId === note.id;

              return (
                <NoteComponent
                  key={note.id}
                  note={note}
                  position={position}
                  opacity={opacity}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  onNoteClick={handleNoteClick}
                  onMouseEnter={() => setHoveredNoteId(note.id)}
                  onMouseLeave={() => setHoveredNoteId(null)}
                />
              );
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
