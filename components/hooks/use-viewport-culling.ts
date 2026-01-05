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
    // Early return if no notes or invalid container size
    // Return empty array (not notes) to prevent rendering issues
    if (notes.length === 0) {
      return [];
    }
    
    // If container size is 0, don't cull (show all notes) until size is measured
    // This prevents notes from disappearing on slow machines during initialization
    if (containerSize.width === 0 || containerSize.height === 0) {
      return notes;
    }

    try {
      const bounds = getPaddedViewportBounds(containerSize, canvasPosition, canvasScale);

      return notes.filter((note) => {
        const position = notePositions.get(note.id);
        // If position not yet initialized, show note (prevents flicker)
        if (!position) return true;

        const noteRight = position.x + NOTE_WIDTH;
        const noteBottom = position.y + NOTE_HEIGHT;

        // AABB collision detection: note is visible if it overlaps with padded viewport
        return (
          position.x < bounds.right &&
          noteRight > bounds.left &&
          position.y < bounds.bottom &&
          noteBottom > bounds.top
        );
      });
    } catch (error) {
      console.error('Error in viewport culling:', error);
      // Fallback: show all notes if culling fails
      return notes;
    }
  }, [notes, notePositions, containerSize, canvasPosition, canvasScale]);

  return visibleNotes;
}

