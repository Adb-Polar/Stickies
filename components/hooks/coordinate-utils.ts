/**
 * @fileoverview Coordinate Transformation Utilities
 * 
 * Utilities for converting between screen coordinates and world coordinates.
 * Handles the coordinate system transformations needed for pan/zoom canvas.
 * 
 * @module components/hooks/coordinate-utils
 */

/**
 * Converts screen coordinates to world coordinates
 * @param screenX - X coordinate in screen pixels
 * @param screenY - Y coordinate in screen pixels
 * @param canvasPosition - Current canvas pan position
 * @param canvasScale - Current canvas zoom scale
 * @returns World coordinates
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  canvasPosition: { x: number; y: number },
  canvasScale: number,
): { x: number; y: number } {
  return {
    x: (screenX - canvasPosition.x) / canvasScale,
    y: (screenY - canvasPosition.y) / canvasScale,
  };
}

/**
 * Converts world coordinates to screen coordinates
 * @param worldX - X coordinate in world space
 * @param worldY - Y coordinate in world space
 * @param canvasPosition - Current canvas pan position
 * @param canvasScale - Current canvas zoom scale
 * @returns Screen coordinates
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  canvasPosition: { x: number; y: number },
  canvasScale: number,
): { x: number; y: number } {
  return {
    x: worldX * canvasScale + canvasPosition.x,
    y: worldY * canvasScale + canvasPosition.y,
  };
}

/**
 * Calculates the viewport bounds in world coordinates
 * @param containerSize - Size of the container
 * @param canvasPosition - Current canvas pan position
 * @param canvasScale - Current canvas zoom scale
 * @returns Viewport bounds in world coordinates
 */
export function getViewportBounds(
  containerSize: { width: number; height: number },
  canvasPosition: { x: number; y: number },
  canvasScale: number,
): { left: number; top: number; right: number; bottom: number } {
  const worldLeft = -canvasPosition.x / canvasScale;
  const worldTop = -canvasPosition.y / canvasScale;
  const worldRight = worldLeft + containerSize.width / canvasScale;
  const worldBottom = worldTop + containerSize.height / canvasScale;

  return { left: worldLeft, top: worldTop, right: worldRight, bottom: worldBottom };
}

/**
 * Calculates viewport bounds with dynamic padding
 * @param containerSize - Size of the container
 * @param canvasPosition - Current canvas pan position
 * @param canvasScale - Current canvas zoom scale
 * @param basePadding - Base padding in pixels (default: 500)
 * @param scalePadding - Additional padding per scale unit (default: 200)
 * @returns Padded viewport bounds in world coordinates
 */
export function getPaddedViewportBounds(
  containerSize: { width: number; height: number },
  canvasPosition: { x: number; y: number },
  canvasScale: number,
  basePadding: number = 500,
  scalePadding: number = 200,
): { left: number; top: number; right: number; bottom: number } {
  const bounds = getViewportBounds(containerSize, canvasPosition, canvasScale);
  const worldPadding = basePadding + scalePadding * canvasScale;

  return {
    left: bounds.left - worldPadding,
    top: bounds.top - worldPadding,
    right: bounds.right + worldPadding,
    bottom: bounds.bottom + worldPadding,
  };
}

