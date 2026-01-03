'use client';

/**
 * @fileoverview Socket Hook
 * 
 * Custom React hook for managing Socket.io connection.
 * Handles connection lifecycle, reconnection, and error handling.
 * 
 * Features:
 * - Automatic connection on mount
 * - Reconnection with exponential backoff
 * - Cleanup on unmount
 * - Error logging for connection failures
 * 
 * @module components/hooks/use-socket
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiUrl } from '@/lib/api-config';

/**
 * Custom hook for managing Socket.io connection
 * 
 * Establishes a WebSocket connection to the backend API for real-time updates.
 * The connection is automatically established when the component mounts and
 * cleaned up when it unmounts.
 * 
 * Connection Configuration:
 * - Transport: WebSocket only
 * - Reconnection: Enabled with 1 second delay
 * - Max reconnection attempts: 5
 * 
 * @returns The Socket.io instance, or null if not yet connected
 * 
 * @example
 * ```tsx
 * const socket = useSocket();
 * 
 * useEffect(() => {
 *   if (socket) {
 *     socket.on('note-updated', (data) => {
 *       // Handle real-time update
 *     });
 *   }
 * }, [socket]);
 * ```
 */
export function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      const socketUrl = getApiUrl();
      const newSocket = io(socketUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      socketRef.current = newSocket;
      setTimeout(() => {
        setSocket(newSocket);
      }, 0);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, []);

  return socket;
}

