/**
 * @fileoverview Note Utilities
 * 
 * Shared utilities for note rendering, colors, and positioning.
 * Extracted from dnd-canvas for better modularity and reusability.
 * 
 * @module lib/note-utils
 */

/**
 * Color palette for sticky notes
 * Maps color values to main and header color variants
 */
export const NOTE_COLORS: Record<string, { main: string; header: string }> = {
  '#eebea8': { main: '#eebea8', header: '#ebae95' },
  '#aad1fa': { main: '#aad1fa', header: '#95c8f6' },
  '#f6cca4': { main: '#f6cca4', header: '#f4c08d' },
  '#eeddb1': { main: '#eeddb1', header: '#ead6a1' },
  '#faefad': { main: '#faefad', header: '#f9ef99' },
  '#ccaf9d': { main: '#ccaf9d', header: '#caa88f' },
  '#bbfce6': { main: '#bbfce6', header: '#a9fce0' },
  '#b3b0f7': { main: '#b3b0f7', header: '#9f9bf8' },
};

/**
 * Fixed width for all notes in pixels
 */
export const NOTE_WIDTH = 280;

/**
 * Fixed height for all notes in pixels (square)
 */
export const NOTE_HEIGHT = 280;

/**
 * Height of the note header (adhesive strip) in pixels
 */
export const HEADER_HEIGHT = 30;

/**
 * Padding around text content in pixels
 */
export const TEXT_PADDING = 20;

/**
 * Font size for note content in pixels
 */
export const FONT_SIZE = 24;

/**
 * Line height multiplier for text
 */
export const LINE_HEIGHT = 1.3;

/**
 * Font size for author name in pixels
 */
export const AUTHOR_FONT_SIZE = 20;

/**
 * Gets the color configuration for a note color value
 * @param color - The color hex value
 * @returns Object with main and header color variants
 */
export function getNoteColor(color: string): { main: string; header: string } {
  return NOTE_COLORS[color] || { main: color, header: color };
}

/**
 * Darkens a hex color by a specified amount
 * @param color - Hex color string (e.g., "#ff0000")
 * @param amount - Amount to darken (0-255)
 * @returns Darkened hex color string
 */
export function darkenColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Calculates a random position for a new note that doesn't overlap with existing notes
 * Uses a grid-based approach with collision detection
 * 
 * @param stageWidth - Width of the canvas container
 * @param stageHeight - Height of the canvas container
 * @param existingPositions - Array of existing note positions to avoid
 * @param totalNotes - Total number of notes (used for grid calculation)
 * @returns Object with x, y coordinates and rotation angle
 */
export function getNotePosition(
  stageWidth: number,
  stageHeight: number,
  existingPositions: Array<{ x: number; y: number }> = [],
  totalNotes: number = 0,
): { x: number; y: number; rotation: number } {
  const noteSize = NOTE_WIDTH;
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

