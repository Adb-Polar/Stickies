/**
 * @fileoverview Note Positions Hook
 * 
 * Manages note positions, initialization, and fade-in animations.
 * Handles position initialization for new notes and cleanup for deleted notes.
 * 
 * @module components/hooks/use-note-positions
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getNotePosition } from '@/lib/note-utils';
import type { Note } from '@/components/ui/draggable-note';

interface NotePosition {
  x: number;
  y: number;
  rotation: number;
}

interface UseNotePositionsOptions {
  notes: Note[];
  containerSize: { width: number; height: number };
  refreshKey?: number;
  onCentered?: (centerX: number, centerY: number) => void;
}

interface UseNotePositionsReturn {
  notePositions: Map<string, NotePosition>;
  noteOpacities: Map<string, number>;
  updatePosition: (noteId: string, position: { x: number; y: number }) => void;
}

/**
 * Hook to manage note positions and fade-in animations
 * @param options - Configuration options
 * @returns Note positions and opacities
 */
export function useNotePositions(options: UseNotePositionsOptions): UseNotePositionsReturn {
  const { notes, containerSize, refreshKey, onCentered } = options;
  const [notePositions, setNotePositions] = useState<Map<string, NotePosition>>(new Map());
  const [noteOpacities, setNoteOpacities] = useState<Map<string, number>>(new Map());
  const initializedNotesRef = useRef<Set<string>>(new Set());
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      initializedNotesRef.current.clear();
      hasCenteredRef.current = false;
    }
  }, [refreshKey]);

  const onCenteredRef = useRef(onCentered);
  useEffect(() => {
    onCenteredRef.current = onCentered;
  }, [onCentered]);

  // Initialize positions for new notes and set up fade-in animations
  useEffect(() => {
    if (notes.length > 0 && containerSize.width > 0 && containerSize.height > 0) {
      setNotePositions((prevPositions) => {
        const newPositions = new Map(prevPositions);
        const newNoteIds = new Set(notes.map((n) => n.id));
        let hasNewNotes = false;

        // Build array of existing positions for collision detection
        const existingPositions = Array.from(newPositions.values()).map((p) => ({ x: p.x, y: p.y }));

        // Initialize positions for new notes (or notes at origin)
        notes.forEach((note) => {
          const existingPos = prevPositions.get(note.id);
          // New note or note at origin (0,0) needs position initialization
          if (!existingPos || (existingPos.x === 0 && existingPos.y === 0)) {
            const pos = getNotePosition(containerSize.width, containerSize.height, existingPositions, notes.length);
            newPositions.set(note.id, pos);
            existingPositions.push({ x: pos.x, y: pos.y }); // Add to collision detection array
            initializedNotesRef.current.add(note.id);
            hasNewNotes = true;
          } else if (!initializedNotesRef.current.has(note.id)) {
            // Mark as initialized if not already
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

          if (!hasCenteredRef.current && prevPositions.size === 0 && newPositions.size > 0) {
            hasCenteredRef.current = true;

            let sumX = 0;
            let sumY = 0;
            let count = 0;
            for (const pos of newPositions.values()) {
              sumX += pos.x;
              sumY += pos.y;
              count++;
            }

            const centerX = count > 0 ? sumX / count : 0;
            const centerY = count > 0 ? sumY / count : 0;

            requestAnimationFrame(() => {
              onCenteredRef.current?.(-centerX, -centerY);
            });
          }
        }

        return newPositions;
      });
    }
  }, [notes, containerSize.width, containerSize.height, refreshKey]);

  const updatePosition = useCallback((noteId: string, position: { x: number; y: number }) => {
    setNotePositions((prev) => {
      const next = new Map(prev);
      const currentPos = prev.get(noteId);
      if (currentPos) {
        next.set(noteId, {
          ...currentPos,
          x: position.x,
          y: position.y,
        });
      }
      return next;
    });
  }, []);

  return {
    notePositions,
    noteOpacities,
    updatePosition,
  };
}

