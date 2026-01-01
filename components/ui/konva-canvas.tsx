'use client';

import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage as StageType } from 'konva/lib/Stage';
import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import type { Layer as LayerType } from 'konva/lib/Layer';
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
  stagePosition: { x: number; y: number };
  stageScale: number;
  setDraggedNoteId: (id: string | null) => void;
  setDragStartPos: (pos: { x: number; y: number }) => void;
  setNoteDragStartPos: (pos: { x: number; y: number }) => void;
  setHoveredNoteId: (id: string | null) => void;
  draggedNoteIdRef: React.MutableRefObject<string | null>;
  dragStartPosRef: React.MutableRefObject<{ x: number; y: number }>;
  noteDragStartPosRef: React.MutableRefObject<{ x: number; y: number }>;
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
  stagePosition,
  stageScale,
  setDraggedNoteId,
  setDragStartPos,
  setNoteDragStartPos,
  setHoveredNoteId,
  draggedNoteIdRef,
  dragStartPosRef,
  noteDragStartPosRef,
}: NoteComponentProps) => {
  // Memoize expensive calculations
  const colors = useMemo(() => getNoteColor(note.color), [note.color]);
  const headerColor = useMemo(() => darkenColor(colors.header, 20), [colors.header]);
  const authorName = useMemo(() => note.user.username ? `-${note.user.username}` : '', [note.user.username]);
  const dimensions = useMemo(() => calculateNoteDimensions(note.content, !!authorName), [note.content, authorName]);
  
  const scale = isHovered ? 1.03 : 1;
  const scaleOffsetX = ((scale - 1) * NOTE_WIDTH) / 2;
  const scaleOffsetY = ((scale - 1) * dimensions.noteHeight) / 2;

  const handleContentClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (draggedNoteIdRef.current === note.id) {
      return;
    }
    e.cancelBubble = true;
    e.evt.stopPropagation();
    onNoteClick(note);
  }, [note, onNoteClick, draggedNoteIdRef]);

  const handleContentTap = useCallback((e: KonvaEventObject<TouchEvent>) => {
    if (draggedNoteIdRef.current === note.id) {
      return;
    }
    e.cancelBubble = true;
    e.evt.stopPropagation();
    onNoteClick(note);
  }, [note, onNoteClick, draggedNoteIdRef]);

  const handleHeaderPointerDown = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    const worldX = (pointerPos.x - stagePosition.x * stageScale) / stageScale;
    const worldY = (pointerPos.y - stagePosition.y * stageScale) / stageScale;
    
    dragStartPosRef.current = { x: worldX, y: worldY };
    noteDragStartPosRef.current = { x: position.x, y: position.y };
    draggedNoteIdRef.current = note.id;
    
    setDragStartPos({ x: worldX, y: worldY });
    setNoteDragStartPos({ x: position.x, y: position.y });
    setDraggedNoteId(note.id);
    setHoveredNoteId(null);
    
    const stageContainer = stage.container();
    if (stageContainer) {
      stageContainer.style.cursor = 'move';
    }
  }, [note.id, position.x, position.y, stagePosition, stageScale, setDraggedNoteId, setDragStartPos, setNoteDragStartPos, setHoveredNoteId, draggedNoteIdRef, dragStartPosRef, noteDragStartPosRef]);

  const handleHeaderPointerUp = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (draggedNoteIdRef.current === note.id) {
      draggedNoteIdRef.current = null;
      dragStartPosRef.current = { x: 0, y: 0 };
      noteDragStartPosRef.current = { x: 0, y: 0 };
      setDraggedNoteId(null);
      setDragStartPos({ x: 0, y: 0 });
      setNoteDragStartPos({ x: 0, y: 0 });
      
      const stage = e.target.getStage();
      if (stage) {
        const stageContainer = stage.container();
        if (stageContainer) {
          stageContainer.style.cursor = 'default';
        }
      }
    }
  }, [note.id, setDraggedNoteId, setDragStartPos, setNoteDragStartPos, draggedNoteIdRef, dragStartPosRef, noteDragStartPosRef]);

  return (
    <Group
      x={position.x - scaleOffsetX}
      y={position.y - scaleOffsetY}
      rotation={position.rotation}
      draggable={false}
      onMouseEnter={(e) => {
        if (draggedNoteIdRef.current === note.id) {
          return;
        }
        e.cancelBubble = true;
        onMouseEnter();
      }}
      onMouseLeave={(e) => {
        if (draggedNoteIdRef.current === note.id) {
          return;
        }
        e.cancelBubble = true;
        onMouseLeave();
      }}
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
        strokeWidth={1}
        cornerRadius={0}
        shadowBlur={isHovered || isSelected ? 16 : 12}
        shadowColor={isHovered || isSelected ? "rgba(59, 130, 246, 0.3)" : "rgba(0, 0, 0, 0.25)"}
        shadowOffsetX={4}
        shadowOffsetY={10}
        shadowOpacity={0.8}
        shadowForStrokeEnabled={false}
        listening={false}
      />
      {/* Top rectangle - adhesive tape, draggable area */}
      <Group
        x={0}
        y={0}
        onMouseDown={handleHeaderPointerDown}
        onMouseUp={handleHeaderPointerUp}
        onTouchStart={handleHeaderPointerDown}
        onTouchEnd={handleHeaderPointerUp}
        listening={true}
      >
        <Rect
          x={0}
          y={0}
          width={NOTE_WIDTH}
          height={HEADER_HEIGHT}
          fill={headerColor}
          stroke="rgba(0, 0, 0, 0.57)"
          strokeWidth={1}
          cornerRadius={0}
          shadowForStrokeEnabled={false}
          listening={true}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) {
              stage.container().style.cursor = 'move';
            }
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) {
              stage.container().style.cursor = 'default';
            }
          }}
        />
      </Group>
      {/* Rectangle highlight overlay - only on main body, excludes adhesive header */}
      {(isHovered || isSelected) && (
        <Rect
          x={0}
          y={HEADER_HEIGHT}
          width={NOTE_WIDTH}
          height={dimensions.noteHeight - HEADER_HEIGHT}
          fill="transparent"
          stroke={isSelected ? "rgba(59, 130, 246, 0.9)" : "rgba(59, 130, 246, 0.6)"}
          strokeWidth={isSelected ? 2.5 : 2}
          cornerRadius={0}
          listening={false}
        />
      )}
      {/* Content area - clickable for editing */}
      <Group 
        x={0} 
        y={HEADER_HEIGHT}
        clipX={0}
        clipY={0}
        clipWidth={NOTE_WIDTH}
        clipHeight={dimensions.noteHeight - HEADER_HEIGHT}
        onClick={handleContentClick}
        onTap={handleContentTap}
        listening={true}
      >
        {/* Invisible background rect for click detection */}
        <Rect
          x={0}
          y={0}
          width={NOTE_WIDTH}
          height={dimensions.noteHeight - HEADER_HEIGHT}
          fill="transparent"
          listening={true}
        />
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
      {/* No highlight - just scale effect on hover */}
    </Group>
  );
});

NoteComponent.displayName = 'NoteComponent';

function getNotePosition(
  stageWidth: number,
  stageHeight: number,
  existingPositions: Array<{ x: number; y: number }> = [],
  totalNotes: number = 0,
): { x: number; y: number; rotation: number } {
  const noteSize = 200;
  const maxAttempts = 50;
  
  // Calculate virtual canvas size based on number of notes for natural spreading
  // Ensure minimum spacing: each note needs ~70% of its size (allowing 30% overlap)
  const minSpacing = noteSize * 0.7;
  const notesPerRow = Math.ceil(Math.sqrt(totalNotes || 100)); // Grid approximation
  const notesPerCol = Math.ceil((totalNotes || 100) / notesPerRow);
  
  // Calculate canvas size to naturally spread notes
  // Use a minimum size to ensure mobile doesn't get bunched up
  const minCanvasSize = 4000; // Minimum 4000px for proper spreading
  const calculatedWidth = Math.max(minCanvasSize, notesPerRow * minSpacing * 1.5);
  const calculatedHeight = Math.max(minCanvasSize, notesPerCol * minSpacing * 1.5);
  
  const virtualWidth = calculatedWidth;
  const virtualHeight = calculatedHeight;
  const offsetX = -virtualWidth / 2; // Center the virtual canvas
  const offsetY = -virtualHeight / 2;
  
  // Try to find a position that allows some overlap but not complete overlap
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Random position across the entire virtual canvas
    const x = offsetX + Math.random() * virtualWidth;
    const y = offsetY + Math.random() * virtualHeight;
    
    // Subtle rotation for organic feel
    const rotation = (Math.random() - 0.5) * 15; // -7.5 to +7.5 degrees

    // Check for significant overlap (allow some edge overlap for organic feel)
    let hasSignificantOverlap = false;
    for (const existing of existingPositions) {
      const dx = Math.abs(x - existing.x);
      const dy = Math.abs(y - existing.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Allow some overlap (30% overlap is okay) but prevent complete overlap
      // This creates the "sea of notes" effect with natural clustering
      if (distance < noteSize * 0.7) {
        hasSignificantOverlap = true;
        break;
      }
    }

    if (!hasSignificantOverlap) {
      return { x, y, rotation };
    }
  }

  // Fallback: random position even if it overlaps slightly (for dense areas)
  // This ensures all notes get positioned even in very dense scenarios
  return {
    x: offsetX + Math.random() * virtualWidth,
    y: offsetY + Math.random() * virtualHeight,
    rotation: (Math.random() - 0.5) * 15,
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
  // State for React re-renders, refs for immediate synchronous access during drag
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [noteDragStartPos, setNoteDragStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<StageType | null>(null);
  const layerRef = useRef<LayerType | null>(null);
  const initializedNotesRef = useRef<Set<string>>(new Set());
  const draggedNoteIdRef = useRef<string | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const noteDragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const { token, user } = useAuth();

  const fetchNotes = useCallback(async () => {
    try {
      // Notes endpoint is public - don't send auth header
      const response = await fetch(`${API_URL}/api/notes`, {
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        // 401 is acceptable for notes endpoint - it means no auth, but notes are public
        if (response.status === 401) {
          // Try again without auth header
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
      // Handle both old format (notes array) and new format (notes + pagination)
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
  }, []);

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
            const pos = getNotePosition(stageSize.width, stageSize.height, existingPositions, notes.length);
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
                // Use batchDraw for better performance when updating multiple notes
                if (layerRef.current) {
                  layerRef.current.batchDraw();
                }
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

  const handleNoteDragEnd = useCallback(
    (noteId: string, newPosition: { x: number; y: number }) => {
      setNotePositions((prev) => {
        const next = new Map(prev);
        const currentPos = prev.get(noteId);
        if (currentPos) {
          next.set(noteId, {
            ...currentPos,
            x: newPosition.x,
            y: newPosition.y,
          });
        }
        return next;
      });
      if (layerRef.current) {
        layerRef.current.batchDraw();
      }
    },
    [],
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
    
    const target = e.target;
    const isMouseEvent = e.evt instanceof MouseEvent;
    const isTouchEvent = e.evt instanceof TouchEvent;
    
    // Check if it's a note (Group) or inside a note
    const isNote = target !== stage && (
      target.getType() === 'Group' || 
      target.getParent()?.getType() === 'Group' ||
      target.getParent()?.getParent()?.getType() === 'Group'
    );
    
    // For touch events, check if it's a single touch (pan) or two touches (zoom)
    if (isTouchEvent) {
      const touches = (e.evt as TouchEvent).touches;
      if (touches.length === 2) {
        const touch1 = { x: touches[0].clientX, y: touches[0].clientY };
        const touch2 = { x: touches[1].clientX, y: touches[1].clientY };
        lastTouchDistance.current = Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y);
        return;
      }
    }
    
    // Only start panning if clicking on stage (not on a note)
    if (!isNote && target === stage) {
      if ((isMouseEvent && (e.evt as MouseEvent).button === 0) || (isTouchEvent && (e.evt as TouchEvent).touches.length === 1)) {
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
  const hoverUpdateRef = useRef<number | null>(null);
  const handleStagePointerMove = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    // Handle note dragging first (priority over hover and pan)
    const currentDraggedNoteId = draggedNoteIdRef.current;
    if (currentDraggedNoteId && (dragStartPosRef.current.x !== 0 || dragStartPosRef.current.y !== 0)) {
      const worldX = (pointerPos.x - stagePosition.x * stageScale) / stageScale;
      const worldY = (pointerPos.y - stagePosition.y * stageScale) / stageScale;
      
      const deltaX = worldX - dragStartPosRef.current.x;
      const deltaY = worldY - dragStartPosRef.current.y;
      
      const newX = noteDragStartPosRef.current.x + deltaX;
      const newY = noteDragStartPosRef.current.y + deltaY;
      
      handleNoteDragEnd(currentDraggedNoteId, { x: newX, y: newY });
      
      if (layerRef.current) {
        layerRef.current.batchDraw();
      }
      return;
    }
    
    // Throttle hover detection - skip if dragging
    if (hoverUpdateRef.current === null && !currentDraggedNoteId) {
      hoverUpdateRef.current = requestAnimationFrame(() => {
        // Double-check we're not dragging (ref might have changed)
        if (draggedNoteIdRef.current) {
          hoverUpdateRef.current = null;
          return;
        }
        
        const currentPointerPos = stage.getPointerPosition();
        if (currentPointerPos) {
          const worldX = (currentPointerPos.x - stagePosition.x * stageScale) / stageScale;
          const worldY = (currentPointerPos.y - stagePosition.y * stageScale) / stageScale;
          
          let hoveredId: string | null = null;
          for (const note of notes) {
            const pos = notePositions.get(note.id);
            if (!pos) continue;
            
            const dimensions = calculateNoteDimensions(note.content, !!note.user.username);
            // Check if pointer is over content area (not header) for hover
            if (
              worldX >= pos.x &&
              worldX <= pos.x + NOTE_WIDTH &&
              worldY >= pos.y + HEADER_HEIGHT &&
              worldY <= pos.y + dimensions.noteHeight
            ) {
              hoveredId = note.id;
              break;
            }
          }
          
          setHoveredNoteId((prev) => prev !== hoveredId ? hoveredId : prev);
        }
        hoverUpdateRef.current = null;
      });
    }
    
    // Handle stage panning (only if not dragging a note)
    if (!isDragging || currentDraggedNoteId) return;
    
    if (positionUpdateRef.current !== null) {
      return;
    }
    
    positionUpdateRef.current = requestAnimationFrame(() => {
      const currentStage = e.target.getStage();
      if (!currentStage) {
        positionUpdateRef.current = null;
        return;
      }
      const currentPointerPos = currentStage.getPointerPosition();
      
      if (currentPointerPos) {
        setStagePosition({
          x: (currentPointerPos.x - lastPointerPosition.x) / stageScale,
          y: (currentPointerPos.y - lastPointerPosition.y) / stageScale,
        });
      }
      positionUpdateRef.current = null;
    });
  }, [isDragging, stageScale, lastPointerPosition, stagePosition, notes, notePositions, handleNoteDragEnd]);

  const handleStagePointerUp = useCallback(() => {
    setIsDragging(false);
    if (draggedNoteIdRef.current) {
      draggedNoteIdRef.current = null;
      dragStartPosRef.current = { x: 0, y: 0 };
      noteDragStartPosRef.current = { x: 0, y: 0 };
      setDraggedNoteId(null);
      setDragStartPos({ x: 0, y: 0 });
      setNoteDragStartPos({ x: 0, y: 0 });
    }
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
    const target = e.target;
    
    // Don't interfere with note dragging - if touching a note, let it handle
    const isNote = target.getType() === 'Group' || target.getParent()?.getType() === 'Group';
    if (isNote && touches.length === 1) {
      // Single touch on note - let note handle drag
      return;
    }
    
    if (touches.length === 2) {
      // Pinch zoom - always allow, even if started on a note
      if (zoomUpdateRef.current !== null) {
        return;
      }
      
      const touch1 = { x: touches[0].clientX, y: touches[0].clientY };
      const touch2 = { x: touches[1].clientX, y: touches[1].clientY };
      const distance = Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y);
      
      // Initialize distance if not set
      if (lastTouchDistance.current === null) {
        lastTouchDistance.current = distance;
        return;
      }
      
      zoomUpdateRef.current = requestAnimationFrame(() => {
        const scaleBy = distance / lastTouchDistance.current!;
        const newScale = stageScale * scaleBy;
        const clampedScale = Math.max(0.5, Math.min(3, newScale));
        
        // Calculate center point between two touches
        const centerX = (touch1.x + touch2.x) / 2;
        const centerY = (touch1.y + touch2.y) / 2;
        
        const mousePointTo = {
          x: (centerX - stagePosition.x * stageScale) / stageScale,
          y: (centerY - stagePosition.y * stageScale) / stageScale,
        };
        
        const newPos = {
          x: centerX / clampedScale - mousePointTo.x,
          y: centerY / clampedScale - mousePointTo.y,
        };
        
        setStageScale(clampedScale);
        setStagePosition(newPos);
        lastTouchDistance.current = distance;
        zoomUpdateRef.current = null;
      });
      
      e.evt.preventDefault();
    } else if (touches.length === 1 && target === stage) {
      // Single touch pan - only if touching the stage, not a note
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
    // Layer is positioned at (stagePosition.x * stageScale, stagePosition.y * stageScale)
    // and scaled by stageScale, so we need to convert screen coordinates to world coordinates
    const worldLeft = -stagePosition.x;
    const worldTop = -stagePosition.y;
    const worldRight = worldLeft + stageSize.width / stageScale;
    const worldBottom = worldTop + stageSize.height / stageScale;

    // Add padding to render notes slightly outside viewport (for smooth scrolling)
    // Scale padding with zoom level to ensure notes don't disappear when zooming in
    const padding = Math.max(200, 100 * stageScale);
    const paddedLeft = worldLeft - padding;
    const paddedTop = worldTop - padding;
    const paddedRight = worldRight + padding;
    const paddedBottom = worldBottom + padding;

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
            ref={(layer) => {
              // Store layer ref for batchDraw optimization
              if (layer) {
                layerRef.current = layer;
              }
            }}
            x={stagePosition.x * stageScale} 
            y={stagePosition.y * stageScale} 
            scaleX={stageScale} 
            scaleY={stageScale}
            listening={true} // Keep listening enabled so notes can be dragged
            perfectDrawEnabled={false}
            imageSmoothingEnabled={true}
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
                  onMouseEnter={() => {
                    if (!draggedNoteIdRef.current) {
                      setHoveredNoteId(note.id);
                    }
                  }}
                  onMouseLeave={() => {
                    if (!draggedNoteIdRef.current) {
                      setHoveredNoteId(null);
                    }
                  }}
                  setHoveredNoteId={setHoveredNoteId}
                  stagePosition={stagePosition}
                  stageScale={stageScale}
                  setDraggedNoteId={setDraggedNoteId}
                  setDragStartPos={setDragStartPos}
                  setNoteDragStartPos={setNoteDragStartPos}
                  draggedNoteIdRef={draggedNoteIdRef}
                  dragStartPosRef={dragStartPosRef}
                  noteDragStartPosRef={noteDragStartPosRef}
                />
              );
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
