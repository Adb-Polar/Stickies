'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';

interface NoteCreatorProps {
  onNoteCreated: () => void;
}

import { API_URL } from '@/lib/api-config';
const MAX_CONTENT_LENGTH = 5000; // Character limit to prevent abuse

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

export function NoteCreator({ onNoteCreated }: NoteCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0].value);
  const [isCreating, setIsCreating] = useState(false);
  const { token } = useAuth();

  const handleCreate = async () => {
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
      setIsOpen(false);
      onNoteCreated();
    } catch (error) {
      console.error('Error creating note:', error);
      alert(error instanceof Error ? error.message : 'Failed to create note. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[#eaddff] hover:bg-[#d4b5ff] border-2 border-[#b2a7d1] text-[#37226f] rounded-[15px] w-14 h-14 flex items-center justify-center shadow-lg text-2xl font-bold z-20 transition-all hover:scale-110 active:scale-95"
        aria-label="Create new note"
        style={{ fontFamily: 'Caveat, cursive' }}
      >
        +
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsOpen(false);
          setContent('');
        }
      }}
    >
      <div className="bg-[#fdfef0] border-2 border-[#b2a7d1] rounded-[15px] shadow-xl p-6 w-full max-w-md animate-fade-in" style={{ fontFamily: 'Caveat, cursive' }}>
        <h2 className="text-2xl font-bold mb-4 text-[#37226f]">Create New Note</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
          <textarea
            value={content}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CONTENT_LENGTH) {
                setContent(e.target.value);
              }
            }}
            placeholder="Write your note here..."
            className="w-full px-3 py-2 border-2 border-[#b2a7d1] rounded-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-[#b2a7d1] resize-none text-[#171c28]"
            style={{ fontFamily: 'Caveat, cursive', fontSize: '16px' }}
            rows={6}
            autoFocus
            maxLength={MAX_CONTENT_LENGTH}
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
                onClick={() => setSelectedColor(color.value)}
                className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                  selectedColor === color.value
                    ? 'border-[#171c28] scale-110 shadow-md'
                    : 'border-gray-300 hover:border-gray-500 hover:scale-105'
                }`}
                style={{ backgroundColor: color.value }}
                aria-label={`Select ${color.name} color`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              setIsOpen(false);
              setContent('');
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-[15px] hover:bg-gray-200 transition-colors"
            style={{ fontFamily: 'Caveat, cursive', fontSize: '14px' }}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!content.trim() || isCreating}
            className="px-4 py-2 bg-[#eaddff] border-2 border-[#b2a7d1] text-[#37226f] rounded-[15px] hover:bg-[#d4b5ff] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
            style={{ fontFamily: 'Caveat, cursive', fontSize: '14px', lineHeight: '19.306px' }}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

