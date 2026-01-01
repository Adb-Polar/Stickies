'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/components/providers/auth-provider';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSuccess?: () => void;
  onSwitchMode?: () => void;
}

export function AuthForm({ mode, onSuccess, onSwitchMode }: AuthFormProps) {
  const { login, signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(email, password);
      } else {
        result = await signup(email, password, username || undefined);
      }

      if (result.success) {
        // Call onSuccess after a brief delay to ensure state has updated
        setTimeout(() => {
          onSuccess?.();
        }, 100);
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-[#fdfef0] border-2 border-[#b2a7d1] rounded-[15px] shadow-lg p-8 animate-fade-in" style={{ fontFamily: 'Caveat, cursive' }}>
      <h2 className="text-2xl font-bold mb-6 text-center text-[#37226f]">
        {mode === 'login' ? 'Login' : 'Sign Up'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username (optional)
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#b2a7d1] rounded-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-[#b2a7d1] text-[#171c28]"
              style={{ fontFamily: 'Caveat, cursive', fontSize: '16px' }}
              placeholder="Enter username"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border-2 border-[#b2a7d1] rounded-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-[#b2a7d1] text-[#171c28]"
            style={{ fontFamily: 'Caveat, cursive', fontSize: '16px' }}
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 border-2 border-[#b2a7d1] rounded-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-[#b2a7d1] text-[#171c28]"
            style={{ fontFamily: 'Caveat, cursive', fontSize: '16px' }}
            placeholder="Enter your password"
          />
          {mode === 'signup' && (
            <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#eaddff] border-2 border-[#b2a7d1] text-[#37226f] py-2 px-4 rounded-[15px] hover:bg-[#d4b5ff] focus:outline-none focus:ring-2 focus:ring-[#b2a7d1] disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all shadow-md"
          style={{ fontFamily: 'Caveat, cursive', fontSize: '14px', lineHeight: '19.306px' }}
        >
          {isLoading ? 'Loading...' : mode === 'login' ? 'Login' : 'Sign Up'}
        </button>

        {onSwitchMode && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={onSwitchMode}
              className="text-[#37226f] hover:text-[#5a3d8f] text-sm transition-colors"
            >
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Login'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

