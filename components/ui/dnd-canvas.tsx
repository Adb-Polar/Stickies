'use client';

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, useDraggable, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useAuth } from '@/components/providers/auth-provider';
import { API_URL } from '@/lib/api-config';

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

interface DndCanvasProps {
  onNoteSelect?: (note: Note | null) => void;
  selectedNoteId?: string | null;
  refreshKey?: number;
}

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

function darkenColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const NOTE_WIDTH = 200;
const HEADER_HEIGHT = 25;
const TEXT_PADDING = 6;
const FONT_SIZE = 21.6;
const LINE_HEIGHT = 1.26;
const MIN_NOTE_HEIGHT = 200;
const MAX_NOTE_HEIGHT = 3000;
const AVG_WORD_LENGTH = 5;

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

function getNotePosition(
  stageWidth: number,
  stageHeight: number,
  existingPositions: Array<{ x: number; y: number }> = [],
  totalNotes: number = 0,
): { x: number; y: number; rotation: number } {
  const noteSize = 200;
  const maxAttempts = 50;
  
  const minSpacing = noteSize * 0.7;
  const notesPerRow = Math.ceil(Math.sqrt(totalNotes || 100));
  const notesPerCol = Math.ceil((totalNotes || 100) / notesPerRow);
  
  const minCanvasSize = 4000;
  const calculatedWidth = Math.max(minCanvasSize, notesPerRow * minSpacing * 1.5);
  const calculatedHeight = Math.max(minCanvasSize, notesPerCol * minSpacing * 1.5);
  
  const virtualWidth = calculatedWidth;
  const virtualHeight = calculatedHeight;
  const offsetX = -virtualWidth / 2;
  const offsetY = -virtualHeight / 2;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = offsetX + Math.random() * virtualWidth;
    const y = offsetY + Math.random() * virtualHeight;
    const rotation = (Math.random() - 0.5) * 15;

    let hasSignificantOverlap = false;
    for (const existing of existingPositions) {
      const dx = Math.abs(x - existing.x);
      const dy = Math.abs(y - existing.y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < noteSize * 0.7) {
        hasSignificantOverlap = true;
        break;
      }
    }

    if (!hasSignificantOverlap) {
      return { x, y, rotation };
    }
  }

  return {
    x: offsetX + Math.random() * virtualWidth,
    y: offsetY + Math.random() * virtualHeight,
    rotation: (Math.random() - 0.5) * 15,
  };
}

interface DraggableNoteProps {
  note: Note;
  position: { x: number; y: number; rotation: number };
  opacity: number;
  isSelected: boolean;
  isHovered: boolean;
  onNoteClick: (note: Note) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  canvasScale: number;
  isDragging: boolean;
  zIndex: number;
}

function DraggableNote({
  note,
  position,
  opacity,
  isSelected,
  isHovered,
  onNoteClick,
  onMouseEnter,
  onMouseLeave,
  canvasScale,
  isDragging,
  zIndex,
}: DraggableNoteProps) {
  const colors = useMemo(() => getNoteColor(note.color), [note.color]);
  const headerColor = useMemo(() => darkenColor(colors.header, 20), [colors.header]);
  const authorName = useMemo(() => note.user.username ? `-${note.user.username}` : '', [note.user.username]);
  const dimensions = useMemo(() => calculateNoteDimensions(note.content, !!authorName), [note.content, authorName]);
  
  const scale = isHovered ? 1.03 : 1;
  const scaleOffsetX = ((scale - 1) * NOTE_WIDTH) / 2;
  const scaleOffsetY = ((scale - 1) * dimensions.noteHeight) / 2;

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: note.id,
  });

  const dragOffset = transform
    ? {
        x: transform.x / canvasScale,
        y: transform.y / canvasScale,
      }
    : { x: 0, y: 0 };
  
  const noteStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x - scaleOffsetX + dragOffset.x}px`,
    top: `${position.y - scaleOffsetY + dragOffset.y}px`,
    width: `${NOTE_WIDTH}px`,
    height: `${dimensions.noteHeight}px`,
    transform: `rotate(${position.rotation}deg) scale(${scale})`,
    opacity,
    cursor: isDragging ? 'grabbing' : 'default',
    zIndex: isDragging ? zIndex + 1000 : zIndex,
    transition: isDragging ? 'none' : 'transform 0.2s ease, opacity 0.2s ease, left 0s, top 0s',
    willChange: isDragging ? 'transform' : 'auto',
  };

  const handleContentDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      onNoteClick(note);
    }
  }, [note, onNoteClick, isDragging]);

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={setNodeRef}
      style={noteStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: colors.main,
            border: '1px solid rgba(0, 0, 0, 0.57)',
            boxShadow: isHovered || isSelected
              ? '4px 10px 16px rgba(59, 130, 246, 0.3)'
              : '4px 10px 12px rgba(0, 0, 0, 0.25)',
          }}
        />
        <div
          {...attributes}
          {...listeners}
          onMouseDown={handleHeaderMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${HEADER_HEIGHT}px`,
            backgroundColor: headerColor,
            borderBottom: '1px solid rgba(0, 0, 0, 0.57)',
            cursor: 'grab',
          }}
        />
        {(isHovered || isSelected) && (
          <div
            style={{
              position: 'absolute',
              top: `${HEADER_HEIGHT}px`,
              left: 0,
              width: '100%',
              height: `${dimensions.noteHeight - HEADER_HEIGHT}px`,
              border: `${isSelected ? 2.5 : 2}px solid ${isSelected ? 'rgba(59, 130, 246, 0.9)' : 'rgba(59, 130, 246, 0.6)'}`,
              pointerEvents: 'none',
            }}
          />
        )}
        <div
          onDoubleClick={handleContentDoubleClick}
          style={{
            position: 'absolute',
            top: `${HEADER_HEIGHT}px`,
            left: 0,
            width: '100%',
            height: `${dimensions.noteHeight - HEADER_HEIGHT}px`,
            padding: `${TEXT_PADDING}px`,
            overflow: 'hidden',
            cursor: 'text',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        >
          <div
            style={{
              width: '100%',
              height: `${dimensions.noteHeight - HEADER_HEIGHT - dimensions.authorHeight - TEXT_PADDING * 2}px`,
              overflow: 'hidden',
              fontFamily: 'Caveat, cursive',
              fontSize: `${FONT_SIZE}px`,
              lineHeight: LINE_HEIGHT,
              color: '#171c28',
              wordWrap: 'break-word',
              userSelect: 'text',
              WebkitUserSelect: 'text',
            }}
          >
            {note.content}
          </div>
          {authorName && (
            <div
              style={{
                position: 'absolute',
                bottom: `${TEXT_PADDING}px`,
                left: `${TEXT_PADDING}px`,
                fontFamily: 'Caveat, cursive',
                fontSize: `${FONT_SIZE}px`,
                color: '#171c28',
              }}
            >
              {authorName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DraggableNoteMemo = memo(DraggableNote, (prevProps, nextProps) => {
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.content === nextProps.note.content &&
    prevProps.note.color === nextProps.note.color &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.position.rotation === nextProps.position.rotation &&
    prevProps.opacity === nextProps.opacity &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.zIndex === nextProps.zIndex &&
    prevProps.canvasScale === nextProps.canvasScale
  );
});

export function DndCanvas({ onNoteSelect, selectedNoteId, refreshKey }: DndCanvasProps) {
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
  const initializedNotesRef = useRef<Set<string>>(new Set());
  const lastTouchDistance = useRef<number | null>(null);
  const panUpdateRef = useRef<number | null>(null);
  const hoverUpdateRef = useRef<number | null>(null);
  const canvasScaleRef = useRef(canvasScale);
  const canvasPositionRef = useRef(canvasPosition);
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

  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      initializedNotesRef.current.clear();
    }
  }, [refreshKey]);

  useEffect(() => {
    if (notes.length > 0 && containerSize.width > 0 && containerSize.height > 0) {
      setNotePositions((prevPositions) => {
        const newPositions = new Map(prevPositions);
        const newNoteIds = new Set(notes.map((n) => n.id));
        let hasNewNotes = false;

        const existingPositions = Array.from(newPositions.values()).map(p => ({ x: p.x, y: p.y }));
        
        notes.forEach((note) => {
          const existingPos = prevPositions.get(note.id);
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
            if (!existingPos || (existingPos.x === 0 && existingPos.y === 0)) {
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const noteId = event.active.id as string;
    setActiveId(noteId);
    const position = notePositions.get(noteId);
    if (position) {
      setDragStartPosition({ x: position.x, y: position.y });
    }
    setHoveredNoteId(null);
  }, [notePositions]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    const noteId = active.id as string;
    
    if (dragStartPosition && delta) {
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

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      if (panUpdateRef.current !== null) {
        cancelAnimationFrame(panUpdateRef.current);
      }
      panUpdateRef.current = requestAnimationFrame(() => {
        const newPos = {
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        };
        
        // Update refs immediately
        canvasPositionRef.current = newPos;
        
        // Apply transform directly to DOM
        if (canvasRef.current) {
          const currentScale = canvasScaleRef.current;
          canvasRef.current.style.transform = `translate(${newPos.x}px, ${newPos.y}px) scale(${currentScale})`;
        }
        
        // Update state (will trigger re-render for other components)
        setCanvasPosition(newPos);
        panUpdateRef.current = null;
      });
    }
  }, [isPanning, panStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
    
    // Sync final values to React state after pan completes
    setCanvasPosition(canvasPositionRef.current);
    
    if (panUpdateRef.current !== null) {
      cancelAnimationFrame(panUpdateRef.current);
      panUpdateRef.current = null;
    }
  }, []);

  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Use refs to get current values synchronously
    const oldScale = canvasScaleRef.current;
    const oldPos = canvasPositionRef.current;
    
    const scaleBy = 1.1;
    const newScale = e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.5, Math.min(3, newScale));
    
    // Convert mouse position to world coordinates using OLD scale
    const worldX = (mouseX - oldPos.x) / oldScale;
    const worldY = (mouseY - oldPos.y) / oldScale;
    
    // Calculate new position so the world point stays under the mouse with NEW scale
    const newPos = {
      x: mouseX - worldX * clampedScale,
      y: mouseY - worldY * clampedScale,
    };
    
    // Update both states together
    setCanvasScale(clampedScale);
    setCanvasPosition(newPos);
  }, []);

  const handleCanvasTouchStart = useCallback((e: React.TouchEvent) => {
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

  const handleCanvasTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
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
          
          // Apply transform directly to DOM element (no React re-render)
          canvasRef.current.style.transform = `translate(${newPos.x}px, ${newPos.y}px) scale(${clampedScale})`;
        }
      } else {
        lastTouchDistance.current = distance;
      }
    } else if (isPanning && e.touches.length === 1) {
      if (panUpdateRef.current !== null) {
        cancelAnimationFrame(panUpdateRef.current);
      }
      panUpdateRef.current = requestAnimationFrame(() => {
        const newPos = {
          x: e.touches[0].clientX - panStart.x,
          y: e.touches[0].clientY - panStart.y,
        };
        
        // Update refs immediately
        canvasPositionRef.current = newPos;
        
        // Apply transform directly to DOM
        if (canvasRef.current) {
          const currentScale = canvasScaleRef.current;
          canvasRef.current.style.transform = `translate(${newPos.x}px, ${newPos.y}px) scale(${currentScale})`;
        }
        
        // Update state (will trigger re-render for other components)
        setCanvasPosition(newPos);
        panUpdateRef.current = null;
      });
    }
  }, [isPanning, panStart]);

  const handleCanvasTouchEnd = useCallback(() => {
    setIsPanning(false);
    lastTouchDistance.current = null;
    touchCenterRef.current = null;
    targetScaleRef.current = null;
    
    // Sync final values to React state after gesture completes
    setCanvasScale(canvasScaleRef.current);
    setCanvasPosition(canvasPositionRef.current);
    
    if (panUpdateRef.current !== null) {
      cancelAnimationFrame(panUpdateRef.current);
      panUpdateRef.current = null;
    }
    if (zoomAnimationRef.current !== null) {
      cancelAnimationFrame(zoomAnimationRef.current);
      zoomAnimationRef.current = null;
    }
  }, []);

  const visibleNotes = useMemo(() => {
    if (notes.length === 0 || containerSize.width === 0 || containerSize.height === 0) {
      return notes;
    }

    const worldLeft = -canvasPosition.x / canvasScale;
    const worldTop = -canvasPosition.y / canvasScale;
    const worldRight = worldLeft + containerSize.width / canvasScale;
    const worldBottom = worldTop + containerSize.height / canvasScale;

    const padding = Math.max(200, 100 * canvasScale);
    const paddedLeft = worldLeft - padding;
    const paddedTop = worldTop - padding;
    const paddedRight = worldRight + padding;
    const paddedBottom = worldBottom + padding;

    return notes.filter((note) => {
      const position = notePositions.get(note.id);
      if (!position) return true;

      const noteRight = position.x + NOTE_WIDTH;
      const noteBottom = position.y + MAX_NOTE_HEIGHT;

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
      style={{ cursor: isPanning ? 'move' : 'default', touchAction: 'none' }}
    >
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={canvasRef}
          className="canvas-background absolute inset-0"
          style={{
            transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${canvasScale})`,
            transformOrigin: '0 0',
            willChange: isPanning || activeId ? 'transform' : 'auto',
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
              <DraggableNoteMemo
                key={note.id}
                note={note}
                position={position}
                opacity={opacity}
                isSelected={isSelected}
                isHovered={isHovered}
                onNoteClick={handleNoteClick}
                onMouseEnter={hoverHandlers.onMouseEnter}
                onMouseLeave={hoverHandlers.onMouseLeave}
                canvasScale={canvasScale}
                isDragging={isDragging}
                zIndex={noteZIndex}
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}

