/**
 * Dynamic API URL configuration
 * - Production: Uses NEXT_PUBLIC_API_URL environment variable (must be set explicitly)
 * - Development: Auto-detects network IP for mobile/remote access
 */

export function getApiUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // Production: Always use explicit environment variable
  if (isProduction) {
    if (!envUrl) {
      console.error('NEXT_PUBLIC_API_URL must be set in production');
      throw new Error('NEXT_PUBLIC_API_URL environment variable is required in production');
    }
    return envUrl;
  }
  
  // Development: Server-side uses environment variable
  if (typeof window === 'undefined') {
    return envUrl || 'http://localhost:3001';
  }
  
  // Development: Client-side auto-detection for mobile/network access
  const hostname = window.location.hostname;
  const port = envUrl?.split(':').pop() || '3001';
  
  // If accessing via localhost, use localhost for API
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return envUrl || `http://localhost:${port}`;
  }
  
  // Network access - use current hostname for API
  // This allows mobile devices to connect to the backend on the same network
  return `http://${hostname}:${port}`;
}

// Export as a getter function that's called at runtime
export const API_URL = getApiUrl();

