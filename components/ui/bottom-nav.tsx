'use client';

/**
 * @fileoverview Bottom Navigation Bar Component
 * 
 * Main navigation bar positioned at the bottom center of the screen.
 * Contains profile, middle action, and add note buttons.
 * 
 * @module components/ui/bottom-nav
 */

import { useAuth } from '@/components/providers/auth-provider';
import { Hand } from 'lucide-react';

/**
 * Props for BottomNav component
 */
interface BottomNavProps {
  /** Callback when add note button is clicked */
  onAddNote: () => void;
  /** Callback when profile button is clicked */
  onProfile: () => void;
  /** Callback when middle button is clicked */
  onMiddleAction: () => void;
  /** Whether the nav should be hidden (e.g., when viewing a note) */
  isHidden?: boolean;
}

/**
 * Bottom navigation bar component
 */
export function BottomNav({ onAddNote, onProfile, onMiddleAction, isHidden = false }: BottomNavProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-transform duration-300 ease-in-out ${isHidden ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
      <div
        className="bg-white border-2 border-[#b2a7d1] rounded-[15px] px-3 py-2 shadow-lg flex items-center gap-3"
        style={{ fontFamily: 'Caveat, cursive' }}
      >
        {/* Profile Button - Avatar */}
        <button
          onClick={onProfile}
          className="w-10 h-10 bg-[#eaddff] border-2 border-[#b2a7d1] rounded-full flex items-center justify-center hover:bg-[#d4b5ff] transition-all hover:scale-105"
          aria-label="Profile"
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
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>

        {/* Middle Button - Palm icon */}
        <button
          onClick={onMiddleAction}
          className="w-11 h-11 bg-white border-2 border-[#b2a7d1] rounded-[15px] flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-105"
          aria-label="Middle action"
        >
          <Hand className="w-6 h-6 text-[#37226f]" />
        </button>

        {/* Add Note Button */}
        <button
          onClick={onAddNote}
          className="w-11 h-11 bg-white border-2 border-[#b2a7d1] rounded-[15px] flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-105"
          aria-label="Add note"
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

