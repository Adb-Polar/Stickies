'use client';

/**
 * @fileoverview Note View Component
 * 
 * Modal component for viewing notes in detail.
 * Displays the note with its rotation and color, matching the canvas appearance.
 * Includes action buttons (delete, edit, reply) that appear floating.
 * 
 * Features:
 * - Slide-up animation from bottom
 * - Translucent background matching other modals
 * - Note displayed with same styling as canvas
 * - Floating action buttons
 * - Authorization checks for edit/delete actions
 * 
 * @module components/ui/note-view
 */

import { useEffect, useMemo, useState, useCallback, memo } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { API_URL } from '@/lib/api-config';
import { DeletePromptModal } from './delete-prompt-modal';
import {
  NOTE_WIDTH,
  NOTE_HEIGHT,
  HEADER_HEIGHT,
  TEXT_PADDING,
  FONT_SIZE,
  LINE_HEIGHT,
  AUTHOR_FONT_SIZE,
  getNoteColor,
  darkenColor,
} from '@/lib/note-utils';

/**
 * Note data structure
 */
interface Note {
  id: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  userId: string;
  user: {
    id: string;
    email: string;
    username: string | null;
  };
}

/**
 * Props for NoteView component
 */
interface NoteViewProps {
  /** The note to view (null if not provided) */
  note: Note | null;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when edit button is clicked */
  onEdit: () => void;
  /** Callback when note is successfully deleted */
  onNoteDeleted: () => void;
}


/**
 * Note view component
 * Displays a note in a modal with slide-up animation
 */
function NoteViewComponent({ note, onClose, onEdit, onNoteDeleted }: NoteViewProps) {
  const { token, user } = useAuth();
  const [scale, setScale] = useState(2.2);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);

  useEffect(() => {
    if (note) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [note]);

  useEffect(() => {
    const updateScale = () => {
      setScale(window.innerWidth < 768 ? 1.5 : 2.2);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const colors = useMemo(() => note ? getNoteColor(note.color) : { main: '#eebea8', header: '#ebae95' }, [note]);
  const headerColor = useMemo(() => darkenColor(colors.header, 20), [colors.header]);
  const authorName = useMemo(() => note?.user.username ? `-${note.user.username}` : '', [note]);
  
  const canEdit = useMemo(() => user?.id === note?.userId || user?.isAdmin, [user, note]);
  const canDelete = useMemo(() => user?.id === note?.userId || user?.isAdmin, [user, note]);
  
  const handleDelete = useCallback(async () => {
    if (!token || !note) return;

    try {
      const response = await fetch(`${API_URL}/api/notes/${note.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      onNoteDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  }, [token, note, onNoteDeleted, onClose]);

  const handleReply = useCallback(() => {
    // Reply functionality to be implemented
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleModalClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  if (!note) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 backdrop-blur-sm transition-opacity p-2 md:p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-3xl bg-transparent p-2 md:p-4 lg:p-6 animate-slide-up flex flex-col items-center gap-3 md:gap-4 lg:gap-6 max-h-[95vh] overflow-y-auto"
        onClick={handleModalClick}
      >
        {/* Note Display */}
        <div
          style={{
            position: 'relative',
            width: `${NOTE_WIDTH * scale}px`,
            height: `${NOTE_HEIGHT * scale}px`,
            transform: 'rotate(-2deg)',
            flexShrink: 0,
            maxWidth: 'calc(100vw - 2rem)',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
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
                height: `${(HEADER_HEIGHT * scale)}px`,
                backgroundColor: headerColor,
                borderBottom: '1px solid rgba(0, 0, 0, 0.57)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: `${(HEADER_HEIGHT * scale)}px`,
                left: 0,
                width: '100%',
                height: `${(NOTE_HEIGHT - HEADER_HEIGHT) * scale}px`,
                padding: `${(TEXT_PADDING * scale)}px`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  width: '100%',
                  flex: 1,
                  overflow: 'auto',
                  fontFamily: 'Caveat, cursive',
                  fontSize: `${(FONT_SIZE * scale * 0.75)}px`,
                  lineHeight: LINE_HEIGHT,
                  color: '#171c28',
                  wordWrap: 'break-word',
                  marginBottom: authorName ? `${(TEXT_PADDING * 0.5 * scale)}px` : 0,
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                }}
                className="scrollbar-hide"
              >
                {note.content}
              </div>
              {authorName && (
                <div
                  style={{
                    fontFamily: 'Caveat, cursive',
                    fontSize: `${(AUTHOR_FONT_SIZE * scale * 0.75)}px`,
                    color: '#171c28',
                    marginTop: 'auto',
                    flexShrink: 0,
                  }}
                >
                  {authorName}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Action Buttons - Only show for authenticated users */}
        {token && (
          <div className="flex gap-2 md:gap-3 items-center flex-wrap justify-center">
            {canDelete && (
              <button
                onClick={() => setShowDeletePrompt(true)}
                className="bg-white border-2 border-[#b2a7d1] rounded-[15px] px-3 md:px-4 py-2 md:py-3 shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
                style={{ fontFamily: 'Caveat, cursive', fontSize: '12px', minWidth: '90px', height: '40px' }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-red-600"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            )}
            {canEdit && (
              <button
                onClick={onEdit}
                className="bg-white border-2 border-[#b2a7d1] rounded-[15px] px-3 md:px-4 py-2 md:py-3 shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
                style={{ fontFamily: 'Caveat, cursive', fontSize: '12px', minWidth: '90px', height: '40px' }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#37226f]"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            <button
              onClick={handleReply}
              className="bg-[#eaddff] border-2 border-[#b2a7d1] rounded-[15px] px-3 md:px-4 py-2 md:py-3 shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
              style={{ fontFamily: 'Caveat, cursive', fontSize: '12px', minWidth: '90px', height: '40px' }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#37226f]"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <DeletePromptModal
        isOpen={showDeletePrompt}
        onConfirm={handleDelete}
        onCancel={() => setShowDeletePrompt(false)}
      />
    </div>
  );
}

export const NoteView = memo(NoteViewComponent);

