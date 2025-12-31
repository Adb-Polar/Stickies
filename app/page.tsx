'use client';

import { KonvaCanvas } from '@/components/ui/konva-canvas';
import { AuthGuard } from '@/components/ui/auth-guard';
import { useSocket } from '@/components/hooks/use-socket';
import { useAuth } from '@/components/hooks/use-auth';
import { useEffect, useState } from 'react';

function HomeContent() {
  const socket = useSocket();
  const { user, logout } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setConnectionStatus('connected');
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    const checkInitialConnection = () => {
      if (socket.connected) {
        handleConnect();
      }
    };

    setTimeout(checkInitialConnection, 0);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  return (
    <div className="w-full h-screen overflow-hidden relative">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-4">
        <div className="bg-white px-4 py-2 rounded shadow-lg">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-medium">
              Socket: {connectionStatus}
            </span>
          </div>
        </div>
        <div className="bg-white px-4 py-2 rounded shadow-lg flex items-center gap-3">
          <span className="text-sm font-medium">
            {user?.username || user?.email}
          </span>
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Logout
          </button>
        </div>
      </div>
      <KonvaCanvas />
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  );
}
