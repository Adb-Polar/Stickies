'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, verifyToken } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      verifyToken();
    }
  }, [isLoading, isAuthenticated, verifyToken]);

  return <>{children}</>;
}

