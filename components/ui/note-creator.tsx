'use client';

/**
 * @fileoverview Note Creator Component
 * 
 * Modal component for creating new notes.
 * Matches Figma design with note preview and color picker.
 * 
 * Features:
 * - Content input with character limit (5000 chars)
 * - Live note preview matching canvas appearance
 * - Color selection from 8 pastel colors
 * - Three action buttons: Close, Attach File, Add
 * 
 * @module components/ui/note-creator
 */

import { useState, useCallback, memo, useMemo, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { API_URL } from '@/lib/api-config';
import {
  NOTE_WIDTH,
  NOTE_HEIGHT,
  HEADER_HEIGHT,
  TEXT_PADDING,
  FONT_SIZE,
  LINE_HEIGHT,
  getNoteColor,
  darkenColor,
} from '@/lib/note-utils';

/**
 * Props for NoteCreator component
 */
interface NoteCreatorProps {
  /** Callback when a note is successfully created */
  onNoteCreated: () => void;
  /** Whether the modal is open (controlled externally) */
  isOpen?: boolean;
  /** Callback when modal should close */
  onClose?: () => void;
}

/** Maximum content length to prevent abuse */
const MAX_CONTENT_LENGTH = 5000;

/**
 * Available pastel colors for notes
 */
const PASTEL_COLORS = [
  { name: 'Yellow', value: '#faefad', header: '#f9ef99' },
  { name: 'Sun', value: '#eeddb1', header: '#ead6a1' },
  { name: 'Orange', value: '#f6cca4', header: '#f4c08d' },
  { name: 'Choco', value: '#ccaf9d', header: '#caa88f' },
  { name: 'Apple', value: '#eebea8', header: '#ebae95' },
  { name: 'Teal', value: '#bbfce6', header: '#a9fce0' },
  { name: 'Blue', value: '#aad1fa', header: '#95c8f6' },
  { name: 'Purple', value: '#b3b0f7', header: '#9f9bf8' },
];


/**
 * Note creator component
 */
function NoteCreatorComponent({ onNoteCreated, isOpen: externalIsOpen, onClose }: NoteCreatorProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0].value);
  const [isCreating, setIsCreating] = useState(false);
  const [previewSize, setPreviewSize] = useState({ width: NOTE_WIDTH, height: NOTE_HEIGHT });
  const { token } = useAuth();

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  useEffect(() => {
    const updatePreviewSize = () => {
      const maxSize = Math.min(NOTE_WIDTH, window.innerWidth * 0.7);
      setPreviewSize({
        width: Math.max(200, maxSize),
        height: Math.max(200, maxSize),
      });
    };
    updatePreviewSize();
    window.addEventListener('resize', updatePreviewSize);
    return () => window.removeEventListener('resize', updatePreviewSize);
  }, []);
  
  const colors = useMemo(() => getNoteColor(selectedColor), [selectedColor]);
  const headerColor = useMemo(() => darkenColor(colors.header, 20), [colors.header]);
  
  const handleClose = useCallback(() => {
    if (externalIsOpen !== undefined && onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
    setContent('');
  }, [externalIsOpen, onClose]);

  const handleCreate = useCallback(async () => {
    if (!content.trim() || !token) return;
    if (content.length > MAX_CONTENT_LENGTH) {
      alert(`Note content cannot exceed ${MAX_CONTENT_LENGTH} characters.`);
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          color: selectedColor,
          width: 108,
          height: 108,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create note' }));
        throw new Error(errorData.error || 'Failed to create note');
      }

      setContent('');
      handleClose();
      onNoteCreated();
    } catch (error) {
      console.error('Error creating note:', error);
      alert(error instanceof Error ? error.message : 'Failed to create note. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [content, selectedColor, token, handleClose, onNoteCreated]);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  const handleAttachFile = useCallback(() => {
    // WIP - placeholder for attachment functionality
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 backdrop-blur-sm transition-opacity p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white border-2 border-[#b2a7d1] rounded-[15px] shadow-xl p-3 md:p-6 w-full max-w-md md:max-w-lg animate-fade-in" 
        style={{ fontFamily: 'Caveat, cursive', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 text-[#37226f] shrink-0" style={{ lineHeight: '1.2' }}>
          Add Note
        </h2>

        {/* Content Input */}
        <div className="mb-3 md:mb-4 shrink-0">
          <textarea
            value={content}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CONTENT_LENGTH) {
                setContent(e.target.value);
              }
            }}
            maxLength={MAX_CONTENT_LENGTH}
            placeholder="Write your note here..."
            className="w-full px-2 md:px-3 py-1.5 md:py-2 border-2 border-[#b2a7d1] rounded-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-[#b2a7d1] resize-none text-[#171c28]"
            style={{ fontFamily: 'Caveat, cursive', fontSize: '14px', lineHeight: '1.4' }}
            rows={3}
            autoFocus
          />
          <div className="mt-1 text-right text-xs text-gray-500" style={{ fontFamily: 'Caveat, cursive' }}>
            {content.length} / {MAX_CONTENT_LENGTH} characters
          </div>
        </div>

        {/* Note Preview - Scrollable */}
        <div className="mb-3 md:mb-4 flex justify-center flex-1 min-h-0 overflow-hidden">
          <div className="overflow-auto scrollbar-hide" style={{ maxHeight: '100%', maxWidth: '100%' }}>
            <div
              style={{
                position: 'relative',
                width: `${previewSize.width}px`,
                height: `${previewSize.height}px`,
                minWidth: '200px',
                minHeight: '200px',
              }}
            >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: colors.main,
                border: '1px solid rgba(0, 0, 0, 0.57)',
                boxShadow: '4px 10px 16px rgba(0, 0, 0, 0.3)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${(HEADER_HEIGHT / NOTE_HEIGHT) * previewSize.height}px`,
                backgroundColor: headerColor,
                borderBottom: '1px solid rgba(0, 0, 0, 0.57)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: `${(HEADER_HEIGHT / NOTE_HEIGHT) * previewSize.height}px`,
                left: 0,
                width: '100%',
                height: `${previewSize.height - (HEADER_HEIGHT / NOTE_HEIGHT) * previewSize.height}px`,
                padding: `${TEXT_PADDING}px`,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
              className="scrollbar-hide"
            >
              <div
                style={{
                  width: '100%',
                  flex: 1,
                  fontFamily: 'Caveat, cursive',
                  fontSize: `${FONT_SIZE}px`,
                  lineHeight: LINE_HEIGHT,
                  color: '#37226f',
                  wordWrap: 'break-word',
                }}
              >
                {content || 'Sample text'}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Color Picker */}
        <div className="mb-3 md:mb-4 flex justify-center shrink-0">
          <div className="flex gap-3 md:gap-4 flex-wrap justify-center">
            {PASTEL_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className="w-7 h-7 md:w-[31px] md:h-[31px] rounded-full border-2 transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: color.value,
                  borderColor: '#6750a4',
                  borderWidth: '2px',
                }}
                aria-label={`Select ${color.name} color`}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 md:gap-3 items-center shrink-0">
          <button
            onClick={handleClose}
            className="bg-white border-2 border-[#b2a7d1] rounded-[15px] px-3 md:px-4 py-2 md:py-3 shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
            style={{ fontFamily: 'Caveat, cursive', fontSize: '14px', minWidth: '120px', minHeight: '44px' }}
            disabled={isCreating}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#37226f]"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <button
            onClick={handleAttachFile}
            className="bg-white border-2 border-[#b2a7d1] rounded-[15px] px-2 md:px-3 py-1.5 md:py-2 shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
            style={{ fontFamily: 'Caveat, cursive', fontSize: '12px', minWidth: '80px', minHeight: '36px' }}
            disabled={isCreating}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#37226f]"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <button
            onClick={handleCreate}
            disabled={!content.trim() || isCreating}
            className="flex-1 bg-[#eaddff] border-2 border-[#b2a7d1] rounded-[15px] px-2 md:px-3 py-1.5 md:py-2 shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 md:gap-2"
            style={{ fontFamily: 'Caveat, cursive', fontSize: '12px', minHeight: '36px' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#37226f]"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{isCreating ? 'Creating...' : 'Add'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const NoteCreator = memo(NoteCreatorComponent);
