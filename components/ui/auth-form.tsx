'use client';

import { useState, FormEvent, useCallback, memo } from 'react';
import { useAuth } from '@/components/providers/auth-provider';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSuccess?: () => void;
  onSwitchMode?: () => void;
}

function AuthFormComponent({ mode, onSuccess, onSwitchMode }: AuthFormProps) {
  const { login, signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
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
  }, [mode, email, password, confirmPassword, username, login, signup, onSuccess]);

  return (
    <div className="w-full max-w-md mx-auto bg-white border-2 border-[#b2a7d1] rounded-[15px] shadow-xl p-4 md:p-8 animate-fade-in" style={{ fontFamily: 'Caveat, cursive' }}>
      <div className="mb-4 md:mb-6">
        <h2 className="text-4xl md:text-6xl font-bold mb-2 text-[#37226f]" style={{ lineHeight: '1.2' }}>
          {mode === 'login' ? 'Login' : 'sign Up'}
        </h2>
        <p className="text-xs md:text-sm text-[#37226f]" style={{ fontFamily: 'Figma Hand, cursive', fontSize: '14px', lineHeight: '19.306px' }}>
          Please login to post notes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="username" className="text-base text-[#37226f]" style={{ fontFamily: 'Figma Hand, cursive', fontSize: '16px', lineHeight: '22.064px' }}>
                Username
              </label>
            </div>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-1.5 border border-[#b2a7d1] rounded-[5px] bg-white focus:outline-none focus:ring-2 focus:ring-[#b2a7d1] text-[#6750a4]"
              style={{ fontFamily: 'Figma Hand, cursive', fontSize: '16px', lineHeight: '22.064px' }}
              placeholder=""
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="email" className="text-base text-[#37226f]" style={{ fontFamily: 'Figma Hand, cursive', fontSize: '16px', lineHeight: '22.064px' }}>
              {mode === 'login' ? 'Username' : 'Email'}
            </label>
          </div>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-1.5 border border-[#b2a7d1] rounded-[5px] bg-white focus:outline-none focus:ring-2 focus:ring-[#b2a7d1] text-[#6750a4]"
            style={{ fontFamily: 'Figma Hand, cursive', fontSize: '16px', lineHeight: '22.064px' }}
            placeholder=""
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="text-base text-[#37226f]" style={{ fontFamily: 'Figma Hand, cursive', fontSize: '16px', lineHeight: '22.064px' }}>
              Password
            </label>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-1.5 border border-[#b2a7d1] rounded-[5px] bg-white focus:outline-none focus:ring-2 focus:ring-[#b2a7d1] text-[#6750a4]"
            style={{ fontFamily: 'Figma Hand, cursive', fontSize: '16px', lineHeight: '22.064px' }}
            placeholder=""
          />
        </div>

        {mode === 'signup' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="confirmPassword" className="text-base text-[#37226f]" style={{ fontFamily: 'Figma Hand, cursive', fontSize: '16px', lineHeight: '22.064px' }}>
                Confirm password
              </label>
            </div>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-1.5 border border-[#b2a7d1] rounded-[5px] bg-white focus:outline-none focus:ring-2 focus:ring-[#b2a7d1] text-[#6750a4]"
              style={{ fontFamily: 'Figma Hand, cursive', fontSize: '16px', lineHeight: '22.064px' }}
              placeholder=""
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          {onSwitchMode && (
            <button
              type="button"
              onClick={onSwitchMode}
              className="bg-white border-2 border-[#b2a7d1] rounded-[15px] px-3 md:px-4 py-2 md:py-2.5 text-[#37226f] hover:bg-gray-50 transition-all"
              style={{ fontFamily: 'Figma Hand, cursive', fontSize: '14px', lineHeight: '19.306px', minHeight: '39px' }}
            >
              {mode === 'login' ? 'Sign up' : 'Back to login'}
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-[#eaddff] border-2 border-[#b2a7d1] rounded-[15px] px-3 md:px-4 py-2 md:py-2.5 text-[#37226f] hover:bg-[#d4b5ff] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ fontFamily: 'Figma Hand, cursive', fontSize: '14px', lineHeight: '19.306px', minHeight: '39px' }}
          >
            {isLoading ? 'Loading...' : mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </div>
      </form>
    </div>
  );
}

export const AuthForm = memo(AuthFormComponent);

