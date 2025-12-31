'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/hooks/use-auth';
import { AuthForm } from './auth-form';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, verifyToken } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      verifyToken();
    }
  }, [isLoading, isAuthenticated, verifyToken]);

  const showAuth = !isLoading && !isAuthenticated;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (showAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="w-full max-w-md">
          <AuthForm
            mode={authMode}
            onSuccess={() => setShowAuth(false)}
            onSwitchMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

