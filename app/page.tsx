'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { KonvaCanvas } from '@/components/ui/konva-canvas';

// Lazy load modals for code splitting and better initial load performance
const AuthForm = lazy(() => import('@/components/ui/auth-form').then(m => ({ default: m.AuthForm })));
const NoteCreator = lazy(() => import('@/components/ui/note-creator').then(m => ({ default: m.NoteCreator })));
const NoteEditor = lazy(() => import('@/components/ui/note-editor').then(m => ({ default: m.NoteEditor })));

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

const NOTE_COLORS: Record<string, { main: string; header: string }> = {
  '#eebea8': { main: '#eebea8', header: '#ebae95' },
  '#aad1fa': { main: '#aad1fa', header: '#95c8f6' },
  '#f6cca4': { main: '#f6cca4', header: '#f4c08d' },
  '#eeddb1': { main: '#eeddb1', header: '#ead6a1' },
  '#faefad': { main: '#faefad', header: '#f9ef99' },
  '#ccaf9d': { main: '#ccaf9d', header: '#caa88f' },
  '#bbfce6': { main: '#bbfce6', header: '#a9fce0' },
  '#b3b0f7': { main: '#b3b0f7', header: '#9f9bf8' },
};

function getNoteColor(color: string): { main: string; header: string } {
  return NOTE_COLORS[color] || { main: color, header: color };
}

function StickyNoteCard({
  note,
  index,
  onSelect,
}: {
  note: Note;
  index: number;
  onSelect: (note: Note) => void;
}) {
  const rotations = [
    -2, 1.5, -1, 2, -1.5, 0.5, -0.5, 1, -1.2, 0.8, -0.8, 1.2, -1.5, 0.5, -0.3, 1.8, -1, 0.7,
    -0.6, 1.3, -1.2, 0.4, -0.9, 1.1, -0.4, 1.6, -1.3, 0.6, -0.7, 1.4, -1.1, 0.3, -0.5, 1.7,
    -0.8, 1, -1.4, 0.5, -0.2, 1.5, -1, 0.9, -0.6, 1.2, -1.3, 0.4, -0.7, 1.1, -0.3, 1.6,
  ];
  const rotation = rotations[index % rotations.length] || 0;
  const colors = getNoteColor(note.color);
  const noteWidth = 108.335;
  const noteHeight = 108.335;
  const headerHeight = 21.530665;
  const headerWidth = 100.61918;
  const headerOffsetX = 7.68917;

  return (
    <div
      className="relative cursor-pointer transition-transform duration-200 hover:scale-105"
      style={{
        transform: `rotate(${rotation}deg)`,
        width: `${noteWidth}px`,
        height: `${noteHeight}px`,
      }}
      onClick={() => onSelect(note)}
    >
      <div
        className="absolute inset-0 border border-black/57"
        style={{
          backgroundColor: colors.main,
        }}
      >
        <div
          className="absolute border-b border-black/57"
          style={{
            left: `${headerOffsetX}px`,
            top: 0,
            width: `${headerWidth}px`,
            height: `${headerHeight}px`,
            backgroundColor: colors.header,
          }}
        />
        <div
          className="absolute text-[#171c28]"
          style={{
            left: '12.23px',
            top: '19.79px',
            width: `${noteWidth - 24.46}px`,
            height: `${noteHeight - 19.79 - 5}px`,
            fontFamily: 'Caveat, cursive',
            fontSize: '9px',
            lineHeight: '11.34px',
            overflow: 'hidden',
            wordWrap: 'break-word',
          }}
        >
          {note.content}
        </div>
        {note.imageUrl && (
          <div className="absolute bottom-2 right-2 w-8 h-8 bg-white border border-black/50 rounded opacity-60" />
        )}
      </div>
    </div>
  );
}

import { API_URL } from '@/lib/api-config';

function HomeContent() {
  const { user, logout, isAuthenticated, isLoading: authLoading, token } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchNotes = useCallback(async () => {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/notes`, {
        headers,
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        if (response.status === 401) {
          setNotes([]);
          setIsLoading(false);
          return;
        }
        throw new Error(`Failed to fetch notes: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      // Only log network errors, don't show to user if it's a connection issue
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error: Backend API may not be running at', API_URL);
        console.error('Please ensure the backend server is running on port 3001');
      }
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes, refreshKey]);

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

  if (authLoading || isLoading) {
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

      {/* Konva Canvas */}
      <KonvaCanvas
        onNoteSelect={setSelectedNote}
        selectedNoteId={selectedNote?.id || null}
        refreshKey={refreshKey}
      />

      {isAuthenticated && (
        <Suspense fallback={null}>
          <NoteCreator onNoteCreated={handleNoteCreated} />
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
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
