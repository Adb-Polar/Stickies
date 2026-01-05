/**
 * @fileoverview Drag Handler Hook
 * 
 * Manages drag-and-drop state and handlers for notes using @dnd-kit.
 * Handles drag start, move, end, and cancel events with coordinate transformations.
 * 
 * @module components/hooks/use-drag-handler
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { DragEndEvent, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';

interface NotePosition {
  x: number;
  y: number;
  rotation: number;
}

interface UseDragHandlerOptions {
  notePositions: Map<string, NotePosition>;
  canvasScale: number;
  isMultiTouch: boolean;
  gestureState: { touchCount: number; isPinching: boolean };
  onPositionUpdate: (noteId: string, position: { x: number; y: number }) => void;
  onZIndexUpdate: (noteId: string, zIndex: number) => void;
}

interface UseDragHandlerReturn {
  activeId: string | null;
  dragStartPosition: { x: number; y: number } | null;
  sensors: ReturnType<typeof useSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragMove: () => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
}

/**
 * Hook to handle drag-and-drop operations for notes
 * @param options - Configuration options
 * @returns Drag handler state and callbacks
 */
export function useDragHandler(options: UseDragHandlerOptions): UseDragHandlerReturn {
  const { notePositions, canvasScale, isMultiTouch, gestureState, onPositionUpdate, onZIndexUpdate } = options;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null);
  const dragCancelledRef = useRef(false);
  const isMultiTouchRef = useRef(isMultiTouch);
  const zIndexCounterRef = useRef(100); // Incremental counter for z-index (prevents fixed high values)

  // Keep ref in sync with state for fast access in callbacks
  useEffect(() => {
    isMultiTouchRef.current = isMultiTouch;
  }, [isMultiTouch]);

  // Prevents drag activation when multi-touch is detected (should pan/zoom instead)
  const bypassTouchActivation = useCallback((props: { event: Event; activeNode: unknown; options: unknown }) => {
    const { event } = props;

    // Only check touch events
    if (!(event instanceof TouchEvent)) {
      return false;
    }

    // Multi-touch detected - prevent drag
    if (event.touches.length > 1) {
      return true;
    }

    // Check gesture state for multi-touch
    if (gestureState.touchCount > 1 || isMultiTouchRef.current) {
      return true;
    }

    return false; // Allow drag activation
  }, [gestureState.touchCount]);

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
    }),
  );

  // Called when drag starts - stores initial position
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      // Don't start drag if multi-touch detected
      if (isMultiTouchRef.current || gestureState.touchCount > 1) {
        return;
      }

      dragCancelledRef.current = false;
      const noteId = event.active.id as string;
      setActiveId(noteId);
      // Store starting position for calculating final position
      const position = notePositions.get(noteId);
      if (position) {
        setDragStartPosition({ x: position.x, y: position.y });
      }
    },
    [notePositions, gestureState.touchCount],
  );

  // Called during drag - cancels if multi-touch detected
  const handleDragMove = useCallback(() => {
    if (isMultiTouchRef.current || gestureState.touchCount > 1) {
      dragCancelledRef.current = true;
      setActiveId(null);
      setDragStartPosition(null);
    }
  }, [gestureState.touchCount]);

  const handleDragCancel = useCallback(() => {
    dragCancelledRef.current = false;
    setActiveId(null);
    setDragStartPosition(null);
  }, []);

  // Called when drag ends - updates note position and z-index
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const noteId = active.id as string;

      // Don't update if drag was cancelled or multi-touch detected
      if (dragCancelledRef.current || isMultiTouchRef.current || gestureState.touchCount > 1) {
        dragCancelledRef.current = false;
        setActiveId(null);
        setDragStartPosition(null);
        return;
      }

      if (dragStartPosition && delta && (delta.x !== 0 || delta.y !== 0)) {
        // Convert delta from screen coordinates to world coordinates
        // Divide by canvasScale because delta is in screen pixels
        const newX = dragStartPosition.x + delta.x / canvasScale;
        const newY = dragStartPosition.y + delta.y / canvasScale;

        // Update position and z-index synchronously to prevent flicker
        flushSync(() => {
          onPositionUpdate(noteId, { x: newX, y: newY });
          // Increment z-index counter to keep dragged note on top
          const newZIndex = zIndexCounterRef.current++;
          onZIndexUpdate(noteId, newZIndex);
        });

        dragCancelledRef.current = false;
        setActiveId(null);
        setDragStartPosition(null);
      } else {
        // No position change, just clear state
        dragCancelledRef.current = false;
        setActiveId(null);
        setDragStartPosition(null);
      }
    },
    [canvasScale, dragStartPosition, gestureState.touchCount, onPositionUpdate, onZIndexUpdate],
  );

  return {
    activeId,
    dragStartPosition,
    sensors,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  };
}

