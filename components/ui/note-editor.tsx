'use client';

/**
 * @fileoverview Note Editor Component
 * 
 * Modal component for editing existing notes.
 * Allows users to update note content and color.
 * Includes delete functionality with confirmation.
 * 
 * Features:
 * - Content editing with character limit (5000 chars)
 * - Color selection from 8 pastel colors
 * - Delete confirmation dialog
 * - Authorization checks (users can only edit their own notes)
 * - Translucent modal background matching auth modal style
 * 
 * @module components/ui/note-editor
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';

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
 * Props for NoteEditor component
 */
interface NoteEditorProps {
  /** The note to edit (null if not provided) */
  note: Note | null;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when note is successfully updated */
  onNoteUpdated: () => void;
  /** Callback when note is successfully deleted */
  onNoteDeleted: () => void;
}

import { API_URL } from '@/lib/api-config';

/** Maximum content length to prevent abuse */
const MAX_CONTENT_LENGTH = 5000;

/**
 * Available pastel colors for notes
 */
const PASTEL_COLORS = [
  { name: 'Apple', value: '#eebea8', header: '#ebae95' },
  { name: 'Blue', value: '#aad1fa', header: '#95c8f6' },
  { name: 'Orange', value: '#f6cca4', header: '#f4c08d' },
  { name: 'Sun', value: '#eeddb1', header: '#ead6a1' },
  { name: 'Yellow', value: '#faefad', header: '#f9ef99' },
  { name: 'Choco', value: '#ccaf9d', header: '#caa88f' },
  { name: 'Teal', value: '#bbfce6', header: '#a9fce0' },
  { name: 'Purple', value: '#b3b0f7', header: '#9f9bf8' },
];

/**
 * Note editor component
 * Provides UI for editing note content and color
 * Handles update and delete operations with proper authorization
 */
export function NoteEditor({ note, onClose, onNoteUpdated, onNoteDeleted }: NoteEditorProps) {
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { token, user } = useAuth();

  useEffect(() => {
    if (note) {
      setContent(note.content);
      setSelectedColor(note.color);
    }
  }, [note]);

  if (!note) return null;

  const canEdit = user?.id === note.userId || user?.isAdmin;
  const canDelete = user?.id === note.userId || user?.isAdmin;

  const handleUpdate = async () => {
    if (!content.trim() || !token) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`${API_URL}/api/notes/${note.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          color: selectedColor,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      onNoteUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Failed to update note. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!token) return;

    setIsDeleting(true);
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
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-[#fdfef0] border-2 border-[#b2a7d1] rounded-[15px] shadow-xl p-6 w-full max-w-md animate-fade-in" style={{ fontFamily: 'Caveat, cursive' }}>
        <h2 className="text-2xl font-bold mb-4 text-[#37226f]">Edit Note</h2>

        {!canEdit && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
            You can only view this note. Only the owner can edit it.
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
          <textarea
            value={content}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CONTENT_LENGTH) {
                setContent(e.target.value);
              }
            }}
            maxLength={MAX_CONTENT_LENGTH}
            placeholder="Write your note here..."
            className="w-full px-3 py-2 border-2 border-[#b2a7d1] rounded-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-[#b2a7d1] resize-none text-[#171c28]"
            style={{ fontFamily: 'Caveat, cursive', fontSize: '16px' }}
            rows={6}
            disabled={!canEdit}
          />
          <div className="mt-1 text-right text-xs text-gray-500" style={{ fontFamily: 'Caveat, cursive' }}>
            {content.length} / {MAX_CONTENT_LENGTH} characters
            {content.length > MAX_CONTENT_LENGTH * 0.9 && (
              <span className="text-orange-600 ml-2">Approaching limit</span>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {PASTEL_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => canEdit && setSelectedColor(color.value)}
                disabled={!canEdit}
                className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                  selectedColor === color.value
                    ? 'border-[#171c28] scale-110 shadow-md'
                    : 'border-gray-300 hover:border-gray-500 hover:scale-105'
                } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ backgroundColor: color.value }}
                aria-label={`Select ${color.name} color`}
              />
            ))}
          </div>
        </div>

        {showDeleteConfirm ? (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800 mb-3">
              Are you sure you want to delete this note? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 justify-between">
            <div>
              {canDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                  disabled={isUpdating || isDeleting}
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-[15px] hover:bg-gray-200 transition-colors"
                style={{ fontFamily: 'Caveat, cursive', fontSize: '14px' }}
                disabled={isUpdating || isDeleting}
              >
                Cancel
              </button>
              {canEdit && (
                <button
                  onClick={handleUpdate}
                  disabled={!content.trim() || isUpdating || isDeleting}
                  className="px-4 py-2 bg-[#eaddff] border-2 border-[#b2a7d1] text-[#37226f] rounded-[15px] hover:bg-[#d4b5ff] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
                  style={{ fontFamily: 'Caveat, cursive', fontSize: '14px', lineHeight: '19.306px' }}
                >
                  {isUpdating ? 'Updating...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

