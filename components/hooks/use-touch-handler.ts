/**
 * @fileoverview Touch Event Handler Hook
 * 
 * Handles touch events to distinguish between note drags and canvas panning.
 * Uses capture phase event listeners to intercept events before they reach
 * react-zoom-pan-pinch, preventing conflicts between note dragging and canvas panning.
 * 
 * @module components/hooks/use-touch-handler
 */

import { useEffect, useRef, useState } from 'react';

interface UseTouchHandlerOptions {
  activeId: string | null;
  onPendingDragChange?: (noteId: string | null) => void;
}

interface UseTouchHandlerReturn {
  pendingDragNoteId: string | null;
  isMultiTouch: boolean;
}

/**
 * Hook to handle touch events for distinguishing note drags from canvas panning
 * @param containerRef - Ref to the container element
 * @param options - Configuration options
 * @returns Touch handler state
 */
export function useTouchHandler(
  containerRef: React.RefObject<HTMLDivElement>,
  options: UseTouchHandlerOptions,
): UseTouchHandlerReturn {
  const { activeId, onPendingDragChange } = options;
  const [pendingDragNoteId, setPendingDragNoteId] = useState<string | null>(null);
  const [isMultiTouch, setIsMultiTouch] = useState(false);
  const pendingNoteDragRef = useRef<string | null>(null);
  const pendingDragTimeoutRef = useRef<number | null>(null);
  const initialTouchTargetRef = useRef<HTMLElement | null>(null);
  const gestureStateRef = useRef({ touchCount: 0, isPinching: false });
  const onPendingDragChangeRef = useRef(onPendingDragChange);

  useEffect(() => {
    onPendingDragChangeRef.current = onPendingDragChange;
  }, [onPendingDragChange]);

  useEffect(() => {
    const handleTouchStartCapture = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return;
      }

      const target = event.target as HTMLElement;
      if (!target.hasAttribute('data-draggable-note') && !target.closest('[data-draggable-note]')) {
        return;
      }

      const noteElement = target.closest('[data-draggable-note]');
      if (!noteElement) {
        return;
      }

      const noteId = noteElement.getAttribute('data-draggable-note');
      if (noteId) {
        pendingNoteDragRef.current = noteId;
        setPendingDragNoteId(noteId);
        initialTouchTargetRef.current = target;
        onPendingDragChangeRef.current?.(noteId);
        event.stopPropagation();
      }
    };

    const handleTouchMoveCapture = (event: TouchEvent) => {
      if (pendingNoteDragRef.current !== null && !activeId) {
        event.stopPropagation();
        event.preventDefault();
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touchCount = event.touches.length;
      gestureStateRef.current.touchCount = touchCount;

      const target = event.target as HTMLElement;
      if (!initialTouchTargetRef.current) {
        initialTouchTargetRef.current = target;
      }

      const noteElement = target.closest('[data-draggable-note]');
      const noteId = noteElement?.getAttribute('data-draggable-note') || null;

      if (touchCount > 1) {
        setIsMultiTouch(true);
        if (activeId) {
          setPendingDragNoteId(null);
        }
        pendingNoteDragRef.current = null;
        setPendingDragNoteId(null);
        initialTouchTargetRef.current = null;
        if (pendingDragTimeoutRef.current !== null) {
          clearTimeout(pendingDragTimeoutRef.current);
          pendingDragTimeoutRef.current = null;
        }
      } else if (noteId) {
        if (pendingDragTimeoutRef.current !== null) {
          clearTimeout(pendingDragTimeoutRef.current);
        }
        pendingDragTimeoutRef.current = window.setTimeout(() => {
          if (pendingNoteDragRef.current === noteId && !activeId) {
            pendingNoteDragRef.current = null;
            setPendingDragNoteId(null);
            initialTouchTargetRef.current = null;
            onPendingDragChangeRef.current?.(null);
          }
          pendingDragTimeoutRef.current = null;
        }, 150);
      } else {
        pendingNoteDragRef.current = null;
        setPendingDragNoteId(null);
        initialTouchTargetRef.current = null;
        onPendingDragChangeRef.current?.(null);
        if (pendingDragTimeoutRef.current !== null) {
          clearTimeout(pendingDragTimeoutRef.current);
          pendingDragTimeoutRef.current = null;
        }
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (pendingNoteDragRef.current !== null && !activeId) {
        event.stopPropagation();
        event.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      gestureStateRef.current.touchCount = 0;
      setIsMultiTouch(false);

      if (pendingDragTimeoutRef.current !== null) {
        clearTimeout(pendingDragTimeoutRef.current);
        pendingDragTimeoutRef.current = null;
      }

      if (pendingNoteDragRef.current && !activeId) {
        pendingNoteDragRef.current = null;
        setPendingDragNoteId(null);
        onPendingDragChangeRef.current?.(null);
      }

      initialTouchTargetRef.current = null;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStartCapture, { passive: true, capture: true });
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMoveCapture, { passive: false, capture: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false, capture: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
      container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

      return () => {
        container.removeEventListener('touchstart', handleTouchStartCapture, { capture: true });
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMoveCapture, { capture: true });
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('touchcancel', handleTouchEnd);
        if (pendingDragTimeoutRef.current !== null) {
          clearTimeout(pendingDragTimeoutRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  return {
    pendingDragNoteId,
    isMultiTouch,
  };
}

