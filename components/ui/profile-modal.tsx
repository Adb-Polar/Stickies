'use client';

/**
 * @fileoverview Profile Modal Component
 * 
 * Modal for viewing and editing user profile details.
 * 
 * @module components/ui/profile-modal
 */

import { memo, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';

/**
 * Props for ProfileModal component
 */
interface ProfileModalProps {
  /** Callback when modal is closed */
  onClose: () => void;
}

/**
 * Profile modal component
 */
function ProfileModalComponent({ onClose }: ProfileModalProps) {
  const { user } = useAuth();

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleModalClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 backdrop-blur-sm transition-opacity p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white border-2 border-[#b2a7d1] rounded-[15px] shadow-xl p-4 md:p-8 w-full max-w-md animate-fade-in max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: 'Caveat, cursive' }}
        onClick={handleModalClick}
      >
        <h2 className="text-4xl md:text-6xl font-bold mb-4 md:mb-6 text-[#37226f]" style={{ lineHeight: '1.2' }}>
          Profile
        </h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
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
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="text-base text-[#37226f]" style={{ fontFamily: 'Figma Hand, cursive', fontSize: '16px', lineHeight: '22.064px' }}>
                {user?.username || 'Not set'}
              </span>
            </div>
            <div className="h-px bg-[#b2a7d1] my-2" />
          </div>
          
          <div>
            <div className="flex items-center gap-3 mb-1">
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
              <span className="text-base text-[#37226f]" style={{ fontFamily: 'Figma Hand, cursive', fontSize: '16px', lineHeight: '22.064px' }}>
                Bio
              </span>
            </div>
            <div className="h-px bg-[#b2a7d1] my-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

export const ProfileModal = memo(ProfileModalComponent);

