/**
 * @fileoverview Canvas Transform Hook
 * 
 * Manages canvas pan and zoom state using react-zoom-pan-pinch.
 * Handles transform updates and provides callbacks for panning prevention.
 * 
 * @module components/hooks/use-canvas-transform
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

interface UseCanvasTransformOptions {
  pendingDragNoteId: string | null;
  activeId: string | null;
  isMultiTouch: boolean;
  onTransformChange?: (position: { x: number; y: number }, scale: number) => void;
}

interface UseCanvasTransformReturn {
  canvasPosition: { x: number; y: number };
  canvasScale: number;
  transformRef: React.RefObject<ReactZoomPanPinchRef | null>;
  handleTransformChange: (ref: ReactZoomPanPinchRef) => void;
  handlePanning: (ref: ReactZoomPanPinchRef, event: TouchEvent | MouseEvent) => void;
  handlePanningStart: (ref: ReactZoomPanPinchRef, event: TouchEvent | MouseEvent) => void;
  panningConfig: {
    disabled: boolean;
    velocityDisabled: boolean;
    allowLeftClickPan: boolean;
    allowMiddleClickPan: boolean;
    allowRightClickPan: boolean;
    shouldCancelOnMultiTouch: boolean;
  };
  wheelConfig: {
    step: number;
    disabled: boolean;
    wheelDisabled: boolean;
    touchPadDisabled: boolean;
  };
  setTransform: (x: number, y: number, scale: number) => void;
  resetTransform: () => void;
}

/**
 * Hook to manage canvas transform (pan/zoom) state
 * @param options - Configuration options
 * @returns Canvas transform state and handlers
 */
export function useCanvasTransform(options: UseCanvasTransformOptions): UseCanvasTransformReturn {
  const { pendingDragNoteId, activeId, isMultiTouch, onTransformChange } = options;
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const transformUpdateRef = useRef<number | null>(null);
  const initialTransformRef = useRef<{ x: number; y: number; scale: number } | null>(null);
  const isMountedRef = useRef(true);
  const lastTransformRef = useRef<{ x: number; y: number; scale: number }>({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Throttles transform updates using requestAnimationFrame
  // Only updates state if values actually changed (prevents unnecessary re-renders)
  const handleTransformChange = useCallback(
    (ref: ReactZoomPanPinchRef) => {
      // Cancel pending update if one exists
      if (transformUpdateRef.current !== null) {
        cancelAnimationFrame(transformUpdateRef.current);
      }

      // Schedule update for next frame
      transformUpdateRef.current = requestAnimationFrame(() => {
        if (!isMountedRef.current) {
          transformUpdateRef.current = null;
          return;
        }
        const { state } = ref;
        const newX = state.positionX;
        const newY = state.positionY;
        const newScale = state.scale;
        
        // Check against last known values to prevent unnecessary updates
        const lastTransform = lastTransformRef.current;
        const scaleChanged = Math.abs(lastTransform.scale - newScale) >= 0.001;
        const positionChanged =
          Math.abs(lastTransform.x - newX) >= 0.1 || Math.abs(lastTransform.y - newY) >= 0.1;
        
        // Only update state if values actually changed
        if (scaleChanged || positionChanged) {
          if (scaleChanged) {
            setCanvasScale(newScale);
          }
          if (positionChanged) {
            setCanvasPosition({ x: newX, y: newY });
          }
          
          // Update last known values
          lastTransformRef.current = { x: newX, y: newY, scale: newScale };
          
          // Call callback only if something changed
          onTransformChange?.({ x: newX, y: newY }, newScale);
        }
        
        transformUpdateRef.current = null;
      });
    },
    [onTransformChange],
  );

  // Prevents canvas panning when touch started on a note (waiting for drag activation)
  const handlePanning = useCallback(
    (ref: ReactZoomPanPinchRef, event: TouchEvent | MouseEvent) => {
      // If touch started on a note and drag hasn't activated yet, prevent panning
      if (pendingDragNoteId !== null && !activeId && event instanceof TouchEvent) {
        const initialTransform = initialTransformRef.current;
        if (initialTransform) {
          // Reset to initial position to prevent any panning
          ref.setTransform(initialTransform.x, initialTransform.y, initialTransform.scale);
        }
      }
    },
    [pendingDragNoteId, activeId],
  );

  // Stores initial transform when panning starts
  // Prevents panning if touch started on a note
  const handlePanningStart = useCallback(
    (ref: ReactZoomPanPinchRef, event: TouchEvent | MouseEvent) => {
      // Store current transform state
      const currentState = ref.state;
      initialTransformRef.current = {
        x: currentState.positionX,
        y: currentState.positionY,
        scale: currentState.scale,
      };

      // If touch started on a note, immediately reset to prevent panning
      if (pendingDragNoteId !== null && !activeId && event instanceof TouchEvent) {
        if (initialTransformRef.current) {
          ref.setTransform(
            initialTransformRef.current.x,
            initialTransformRef.current.y,
            initialTransformRef.current.scale,
          );
        }
      }
    },
    [pendingDragNoteId, activeId],
  );

  // Disable panning when:
  // 1. Actively dragging a note (single touch)
  // 2. Touch started on a note (waiting for drag activation)
  // Allow panning during multi-touch (for simultaneous pan while dragging)
  const panningConfig = useMemo(() => {
    const isPendingNoteDrag = pendingDragNoteId !== null;
    const shouldDisable = (!!activeId && !isMultiTouch) || isPendingNoteDrag;

    return {
      disabled: shouldDisable,
      velocityDisabled: false,
      allowLeftClickPan: true,
      allowMiddleClickPan: false,
      allowRightClickPan: false,
      shouldCancelOnMultiTouch: false, // We handle multi-touch ourselves
    };
  }, [activeId, isMultiTouch, pendingDragNoteId]);

  const wheelConfig = useMemo(
    () => ({
      step: 0.1,
      disabled: false,
      wheelDisabled: false,
      touchPadDisabled: false,
    }),
    [],
  );

  const setTransform = useCallback((x: number, y: number, scale: number) => {
    // Defensive check: ensure ref exists and is valid
    if (transformRef.current && isMountedRef.current) {
      try {
        transformRef.current.setTransform(x, y, scale);
        // Update last known values to prevent unnecessary state updates
        lastTransformRef.current = { x, y, scale };
      } catch (error) {
        console.error('Error setting transform:', error);
      }
    }
  }, []);

  const resetTransform = useCallback(() => {
    // Defensive check: ensure ref exists and is valid
    if (transformRef.current && isMountedRef.current) {
      try {
        transformRef.current.resetTransform();
        // Reset last known values to initial state
        lastTransformRef.current = { x: 0, y: 0, scale: 1 };
      } catch (error) {
        console.error('Error resetting transform:', error);
      }
    }
  }, []);

  return {
    canvasPosition,
    canvasScale,
    transformRef,
    handleTransformChange,
    handlePanning,
    handlePanningStart,
    panningConfig,
    wheelConfig,
    setTransform,
    resetTransform,
  };
}

