'use client';

/**
 * @fileoverview Draggable Note Component
 * 
 * Individual draggable note component for the canvas.
 * Renders a sticky note with header (draggable) and content (editable).
 * Uses @dnd-kit's useDraggable hook for drag functionality.
 * 
 * Interaction Zones:
 * - Header: Draggable area (grab cursor)
 * - Content: Double-click to edit, single-click to select text
 * 
 * Visual States:
 * - Normal: Standard shadow and opacity
 * - Hovered: Slight scale up (1.03x) and blue border highlight
 * - Selected: Stronger blue border highlight
 * - Dragging: Higher z-index and no transitions
 * 
 * @module components/ui/draggable-note
 */

import { useMemo, useCallback, memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  NOTE_WIDTH,
  NOTE_HEIGHT,
  HEADER_HEIGHT,
  TEXT_PADDING,
  FONT_SIZE,
  LINE_HEIGHT,
  AUTHOR_FONT_SIZE,
  getNoteColor,
  darkenColor,
} from '@/lib/note-utils';

/**
 * Note data structure from the API
 */
export interface Note {
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

/**
 * Props for the DraggableNote component
 */
export interface DraggableNoteProps {
  /** The note data to display */
  note: Note;
  /** Position and rotation of the note */
  position: { x: number; y: number; rotation: number };
  /** Opacity for fade-in animation */
  opacity: number;
  /** Whether this note is currently selected */
  isSelected: boolean;
  /** Whether this note is currently hovered */
  isHovered: boolean;
  /** Callback when note is double-clicked (for editing) */
  onNoteClick: (note: Note) => void;
  /** Callback when note is single-clicked (for viewing) */
  onNoteView?: (note: Note) => void;
  /** Callback when mouse enters the note */
  onMouseEnter: () => void;
  /** Callback when mouse leaves the note */
  onMouseLeave: () => void;
  /** Current canvas zoom scale */
  canvasScale: number;
  /** Whether this note is currently being dragged */
  isDragging: boolean;
  /** Base z-index for this note (incremented when dragged) */
  zIndex: number;
  /** Whether the canvas is currently being panned */
  isPanning?: boolean;
}

/**
 * Individual draggable note component
 */
function DraggableNoteComponent({
  note,
  position,
  opacity,
  isSelected,
  isHovered,
  onNoteClick,
  onNoteView,
  onMouseEnter,
  onMouseLeave,
  canvasScale,
  isDragging,
  zIndex,
  isPanning = false,
}: DraggableNoteProps) {
  const colors = useMemo(() => getNoteColor(note.color), [note.color]);
  const headerColor = useMemo(() => darkenColor(colors.header, 20), [colors.header]);
  const authorName = useMemo(() => note.user.username ? `-${note.user.username}` : '', [note.user.username]);
  
  const scale = isHovered ? 1.03 : 1;
  const scaleOffsetX = ((scale - 1) * NOTE_WIDTH) / 2;
  const scaleOffsetY = ((scale - 1) * NOTE_HEIGHT) / 2;

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: note.id,
  });

  /**
   * Convert drag offset from screen coordinates to world coordinates
   * 
   * @dnd-kit's transform is in screen pixels (viewport coordinates).
   * Since the canvas has a CSS transform scale(canvasScale) applied,
   * we need to divide by canvasScale to convert screen pixels to world pixels.
   * 
   * Example: If canvasScale = 0.5 (zoomed out 50%):
   * - 10 screen pixels = 20 world pixels (10 / 0.5 = 20)
   * - This ensures the note moves the correct distance in world space
   */
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
    height: `${NOTE_HEIGHT}px`,
    transform: `rotate(${position.rotation}deg) scale(${scale})`,
    opacity,
    cursor: isDragging ? 'grabbing' : 'default',
    zIndex: isDragging ? zIndex + 1000 : zIndex,
    transition: isDragging ? 'none' : 'transform 0.2s ease, opacity 0.2s ease, left 0s, top 0s',
    willChange: isDragging ? 'transform' : 'auto',
    // Prevent text selection when dragging or panning canvas
    WebkitUserSelect: isDragging || isPanning ? 'none' : 'auto',
    userSelect: isDragging || isPanning ? 'none' : 'auto',
  };

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging && onNoteView) {
      onNoteView(note);
    }
  }, [note, onNoteView, isDragging]);

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
              height: `${NOTE_HEIGHT - HEADER_HEIGHT}px`,
              border: `${isSelected ? 2.5 : 2}px solid ${isSelected ? 'rgba(59, 130, 246, 0.9)' : 'rgba(59, 130, 246, 0.6)'}`,
              pointerEvents: 'none',
            }}
          />
        )}
        <div
          onClick={handleContentClick}
          onDoubleClick={handleContentDoubleClick}
          style={{
            position: 'absolute',
            top: `${HEADER_HEIGHT}px`,
            left: 0,
            width: '100%',
            height: `${NOTE_HEIGHT - HEADER_HEIGHT}px`,
            padding: `${TEXT_PADDING}px`,
            overflow: 'hidden',
            cursor: 'text',
            // Disable text selection when dragging or panning to prevent accidental highlighting
            userSelect: isDragging || isPanning ? 'none' : 'text',
            WebkitUserSelect: isDragging || isPanning ? 'none' : 'text',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              width: '100%',
              flex: 1,
              overflow: 'hidden',
              fontFamily: 'Caveat, cursive',
              fontSize: `${FONT_SIZE}px`,
              lineHeight: LINE_HEIGHT,
              color: '#171c28',
              wordWrap: 'break-word',
              // Disable text selection when dragging or panning to prevent accidental highlighting
              userSelect: isDragging || isPanning ? 'none' : 'text',
              WebkitUserSelect: isDragging || isPanning ? 'none' : 'text',
              marginBottom: authorName ? `${TEXT_PADDING * 0.5}px` : 0,
            }}
          >
            {note.content}
          </div>
          {authorName && (
            <div
              style={{
                fontFamily: 'Caveat, cursive',
                fontSize: `${AUTHOR_FONT_SIZE}px`,
                color: '#171c28',
                marginTop: 'auto',
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

/**
 * Memoized version of DraggableNote to prevent unnecessary re-renders
 * Only re-renders when relevant props change
 */
export const DraggableNote = memo(DraggableNoteComponent, (prevProps, nextProps) => {
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
    prevProps.canvasScale === nextProps.canvasScale &&
    prevProps.isPanning === nextProps.isPanning &&
    prevProps.onNoteView === nextProps.onNoteView
  );
});

