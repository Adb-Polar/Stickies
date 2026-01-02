'use client';

/**
 * @fileoverview Home Page Component
 * 
 * Main page component that orchestrates the entire application.
 * Handles authentication, note selection, and modal management.
 * 
 * Features:
 * - Authentication modal (login/signup)
 * - Note creation modal
 * - Note editing modal
 * - User profile display
 * - Lazy loading for better performance
 * 
 * @module app/page
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { DndCanvas } from '@/components/ui/dnd-canvas';
import { BottomNav } from '@/components/ui/bottom-nav';

// Lazy load modals for code splitting and better initial load performance
const AuthForm = lazy(() => import('@/components/ui/auth-form').then(m => ({ default: m.AuthForm })));
const NoteCreator = lazy(() => import('@/components/ui/note-creator').then(m => ({ default: m.NoteCreator })));
const NoteEditor = lazy(() => import('@/components/ui/note-editor').then(m => ({ default: m.NoteEditor })));
const NoteView = lazy(() => import('@/components/ui/note-view').then(m => ({ default: m.NoteView })));
const ProfileModal = lazy(() => import('@/components/ui/profile-modal').then(m => ({ default: m.ProfileModal })));

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
  imageUrl?: string | null;
  user: {
    id: string;
    email: string;
    username: string | null;
  };
}

/**
 * Main content component for the home page
 * Manages authentication state, note selection, and modal visibility
 */
function HomeContent() {
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [viewedNote, setViewedNote] = useState<Note | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showNoteCreator, setShowNoteCreator] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Auto-close modal when authentication succeeds
  useEffect(() => {
    if (isAuthenticated && showAuthModal) {
      // Small delay to ensure state has propagated
      const timer = setTimeout(() => {
        setShowAuthModal(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, showAuthModal]);

  const handleNoteCreated = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleNoteUpdated = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setSelectedNote(null);
  }, []);

  const handleNoteDeleted = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setSelectedNote(null);
  }, []);

  if (authLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#fdfef0]">
        <div className="text-[#171c28]" style={{ fontFamily: 'Caveat, cursive', fontSize: '18px' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-[#fdfef0] relative overflow-hidden">
      {/* Fixed button in top right - stays in place during pan/zoom */}
      <div className="fixed top-6 right-6 z-50">
        {isAuthenticated ? (
          <div
            className="bg-white border-2 border-[#b2a7d1] rounded-[15px] px-3 py-2 shadow-lg flex items-center gap-3"
            style={{ fontFamily: 'Caveat, cursive' }}
          >
            <span
              className="font-medium text-[#37226f]"
              style={{ fontSize: '14px', lineHeight: '19.306px' }}
            >
              {user?.username || user?.email}
            </span>
            <button
              onClick={logout}
              className="text-[#d20f39] hover:text-[#b10f2e] font-medium transition-colors"
              style={{ fontSize: '14px', lineHeight: '19.306px', fontFamily: 'Caveat, cursive' }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-2 bg-[#eaddff] border-2 border-[#b2a7d1] text-[#37226f] rounded-[15px] hover:bg-[#d4b5ff] transition-all font-bold shadow-md"
            style={{ fontSize: '14px', lineHeight: '19.306px', fontFamily: 'Caveat, cursive' }}
          >
            Login or Signup
          </button>
        )}
      </div>

      {/* DnD Canvas */}
      <DndCanvas
        onNoteSelect={setSelectedNote}
        onNoteView={setViewedNote}
        selectedNoteId={selectedNote?.id || null}
        refreshKey={refreshKey}
      />

      {/* Bottom Navigation Bar */}
      {isAuthenticated && (
        <BottomNav
          onAddNote={() => setShowNoteCreator(true)}
          onProfile={() => setShowProfileModal(true)}
          onMiddleAction={() => {
            // Placeholder for future feature
            console.log('Middle action clicked');
          }}
          isHidden={!!viewedNote || showNoteCreator || !!selectedNote}
        />
      )}

      {isAuthenticated && (
        <Suspense fallback={null}>
          <NoteCreator
            isOpen={showNoteCreator}
            onClose={() => setShowNoteCreator(false)}
            onNoteCreated={() => {
              handleNoteCreated();
              setShowNoteCreator(false);
            }}
          />
        </Suspense>
      )}
      {viewedNote && (
        <Suspense fallback={null}>
          <NoteView
            note={viewedNote}
            onClose={() => setViewedNote(null)}
            onEdit={() => {
              if (isAuthenticated) {
                setSelectedNote(viewedNote);
                setViewedNote(null);
              }
            }}
            onNoteDeleted={handleNoteDeleted}
          />
        </Suspense>
      )}

      {isAuthenticated && selectedNote && (
        <Suspense fallback={null}>
          <NoteEditor
            note={selectedNote}
            onClose={() => setSelectedNote(null)}
            onNoteUpdated={handleNoteUpdated}
            onNoteDeleted={handleNoteDeleted}
          />
        </Suspense>
      )}

      {showAuthModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 backdrop-blur-sm transition-opacity"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAuthModal(false);
            }
          }}
        >
          <div className="w-full max-w-md mx-4">
            <Suspense fallback={<div className="text-white">Loading...</div>}>
              <AuthForm
                mode={authMode}
                onSuccess={() => setShowAuthModal(false)}
                onSwitchMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              />
            </Suspense>
          </div>
        </div>
      )}

      {isAuthenticated && showProfileModal && (
        <Suspense fallback={null}>
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        </Suspense>
      )}
    </div>
  );
}

/**
 * Default export for Next.js page
 */
export default function Home() {
  return <HomeContent />;
}
