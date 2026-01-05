/**
 * @fileoverview Viewport Culling Hook
 * 
 * Calculates which notes are visible in the viewport for performance optimization.
 * Uses AABB collision detection with dynamic padding that scales with zoom level.
 * 
 * @module components/hooks/use-viewport-culling
 */

import { useMemo } from 'react';
import { NOTE_WIDTH, NOTE_HEIGHT } from '@/lib/note-utils';
import { getPaddedViewportBounds } from './coordinate-utils';
import type { Note } from '@/components/ui/draggable-note';

interface NotePosition {
  x: number;
  y: number;
  rotation: number;
}

interface UseViewportCullingOptions {
  notes: Note[];
  notePositions: Map<string, NotePosition>;
  containerSize: { width: number; height: number };
  canvasPosition: { x: number; y: number };
  canvasScale: number;
}

/**
 * Hook to calculate visible notes in viewport for culling
 * @param options - Configuration options
 * @returns Array of visible notes
 */
export function useViewportCulling(options: UseViewportCullingOptions): Note[] {
  const { notes, notePositions, containerSize, canvasPosition, canvasScale } = options;

  const visibleNotes = useMemo(() => {
    if (notes.length === 0 || containerSize.width === 0 || containerSize.height === 0) {
      return notes;
    }

    const bounds = getPaddedViewportBounds(containerSize, canvasPosition, canvasScale);

    return notes.filter((note) => {
      const position = notePositions.get(note.id);
      if (!position) return true;

      const noteRight = position.x + NOTE_WIDTH;
      const noteBottom = position.y + NOTE_HEIGHT;

      return (
        position.x < bounds.right &&
        noteRight > bounds.left &&
        position.y < bounds.bottom &&
        noteBottom > bounds.top
      );
    });
  }, [notes, notePositions, containerSize, canvasPosition, canvasScale]);

  return visibleNotes;
}

