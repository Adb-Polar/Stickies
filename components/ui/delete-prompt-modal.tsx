'use client';

import { memo, useCallback } from 'react';

/**
 * @fileoverview Delete Prompt Modal Component
 * 
 * Modal for confirming note deletion with warning message.
 * 
 * @module components/ui/delete-prompt-modal
 */

/**
 * Props for DeletePromptModal component
 */
interface DeletePromptModalProps {
  /** Callback when delete is confirmed */
  onConfirm: () => void;
  /** Callback when modal is cancelled */
  onCancel: () => void;
  /** Whether the modal is open */
  isOpen: boolean;
}

/**
 * Delete prompt modal component
 */
function DeletePromptModalComponent({ onConfirm, onCancel, isOpen }: DeletePromptModalProps) {
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }, [onCancel]);

  const handleModalClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white border-2 border-[#b2a7d1] rounded-[15px] shadow-xl p-4 md:p-8 w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: 'Caveat, cursive' }}
        onClick={handleModalClick}
      >
        <div className="mb-4 md:mb-6">
          <h2 className="text-4xl md:text-6xl font-bold mb-3 md:mb-4 text-[#37226f]" style={{ lineHeight: '1.2' }}>
            Delete this note?
          </h2>
          <p className="text-lg md:text-2xl text-[#37226f]" style={{ fontFamily: 'Caveat, cursive', lineHeight: '1.25' }}>
            Deleting this note will permanently remove this note and all connected notes from this wall. Do you still want to continue?
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-white border-2 border-[#b2a7d1] rounded-[15px] px-3 md:px-4 py-2.5 md:py-3 shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
            style={{ fontFamily: 'Caveat, cursive', fontSize: '14px', lineHeight: '19.306px', minHeight: '44px' }}
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Cancel</span>
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-[#eaddff] border-2 border-[#b2a7d1] rounded-[15px] px-4 py-3 shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
            style={{ fontFamily: 'Caveat, cursive', fontSize: '14px', lineHeight: '19.306px', minHeight: '44px' }}
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
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Confirm</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const DeletePromptModal = memo(DeletePromptModalComponent);

