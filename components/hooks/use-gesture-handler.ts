/**
 * @fileoverview Gesture Handler Hook
 * 
 * Handles gesture detection using react-use-gesture for routing gestures
 * between note dragging and canvas panning/zooming.
 * 
 * @module components/hooks/use-gesture-handler
 */

import { useRef, useState } from 'react';
import { useGesture } from '@use-gesture/react';

interface UseGestureHandlerOptions {
  backgroundRef: React.RefObject<HTMLDivElement>;
  activeId: string | null;
  onMultiTouchChange?: (isMultiTouch: boolean) => void;
  onPanningChange?: (isPanning: boolean) => void;
}

interface UseGestureHandlerReturn {
  isMultiTouch: boolean;
  isPanning: boolean;
  gestureState: { touchCount: number; isPinching: boolean };
}

/**
 * Hook to handle gestures for routing between note drags and canvas pan/zoom
 * @param options - Configuration options
 * @returns Gesture handler state
 */
export function useGestureHandler(options: UseGestureHandlerOptions): UseGestureHandlerReturn {
  const { backgroundRef, activeId, onMultiTouchChange, onPanningChange } = options;
  const [isMultiTouch, setIsMultiTouch] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [gestureState, setGestureState] = useState({ touchCount: 0, isPinching: false });
  const gestureStateRef = useRef({ touchCount: 0, isPinching: false });

  // Refs to track previous state and prevent unnecessary updates
  const isPanningRef = useRef(false);
  const isMultiTouchRef = useRef(false);

  // Detects gestures on background (not on notes) to route between pan/zoom and note dragging
  useGesture(
    {
      onDrag: ({ first, active, event, touches, target }) => {
        const element = target as HTMLElement;
        // Ignore gestures on notes - let @dnd-kit handle them
        if (element && (element.closest('[data-draggable-note]') || element.closest('[role="button"]'))) {
          return;
        }

        // Detect touch count from event
        let touchCount = 1;
        if (event && 'touches' in event && event.touches) {
          touchCount = event.touches.length;
        } else if (touches !== undefined) {
          touchCount = touches;
        }

        // Update gesture state only if changed
        gestureStateRef.current.touchCount = touchCount;
        if (gestureStateRef.current.touchCount !== gestureState.touchCount) {
          setGestureState((prev) => ({ ...prev, touchCount }));
        }

        // On first gesture, detect multi-touch
        if (first) {
          const isMulti = touchCount > 1;
          if (isMultiTouchRef.current !== isMulti) {
            isMultiTouchRef.current = isMulti;
            setIsMultiTouch(isMulti);
            onMultiTouchChange?.(isMulti);
          }
          if (isMulti && activeId) {
            // Multi-touch detected - note drag will be cancelled by drag handler
          }
        }

        // During active gesture, update panning state
        if (active) {
          const shouldPan = touchCount > 1; // Pan with 2+ touches
          if (isPanningRef.current !== shouldPan) {
            isPanningRef.current = shouldPan;
            setIsPanning(shouldPan);
            onPanningChange?.(shouldPan);
          }
        } else {
          // Gesture ended - reset states
          if (isPanningRef.current) {
            isPanningRef.current = false;
            setIsPanning(false);
            onPanningChange?.(false);
          }
          if (touchCount <= 1 && isMultiTouchRef.current) {
            isMultiTouchRef.current = false;
            setIsMultiTouch(false);
            onMultiTouchChange?.(false);
          }
        }
      },
      onPinch: ({ first, active }) => {
        if (first) {
          gestureStateRef.current.isPinching = true;
          setGestureState((prev) => ({ ...prev, isPinching: true }));
          if (!isMultiTouchRef.current) {
            isMultiTouchRef.current = true;
            setIsMultiTouch(true);
            onMultiTouchChange?.(true);
          }
        }

        if (!active) {
          gestureStateRef.current.isPinching = false;
          setGestureState((prev) => ({ ...prev, isPinching: false }));
          if (isMultiTouchRef.current) {
            isMultiTouchRef.current = false;
            setIsMultiTouch(false);
            onMultiTouchChange?.(false);
          }
        }
      },
    },
    {
      target: backgroundRef,
      drag: {
        threshold: 5,
        pointer: { touch: true, mouse: false },
        filterTaps: true,
      },
      pinch: {
        threshold: 0,
      },
    },
  );

  return {
    isMultiTouch,
    isPanning,
    gestureState,
  };
}

