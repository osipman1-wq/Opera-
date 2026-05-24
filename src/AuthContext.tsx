import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  token: string | null;
  loading: boolean;
  authError: string | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

async function apiFetch(path: string, options?: RequestInit, maxRetries = 6): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(path, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
      });

      const contentType = res.headers.get('content-type') || '';

      // Non-JSON response = proxy/infra not ready yet — always retry
      if (!contentType.includes('application/json')) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1200 * attempt));
          continue;
        }
        throw new Error('Server is still starting up. Please wait a moment and try again.');
      }

      const data = await res.json();
      // App-level errors (wrong password, duplicate email, etc.) — throw immediately, no retry
      if (!res.ok) {
        const serverMsg = typeof data.error === 'string' ? data.error : typeof data.message === 'string' ? data.message : typeof data.detail === 'string' ? data.detail : JSON.stringify(data);
        throw new Error(serverMsg || `Request failed (${res.status})`);
      }
      return data;

    } catch (err: any) {
      // Normalize error — err.message can be an object in some fetch error scenarios
      let errMsg = String(err?.message || err);
      if (errMsg === '[object Object]' && typeof err === 'object') {
        errMsg = JSON.stringify(err);
      }
      const cleanErr = new Error(errMsg);
      cleanErr.name = err?.name || 'Error';

      // Re-throw app errors immediately (they're not retryable)
      if (errMsg && !errMsg.includes('starting up') && cleanErr.name !== 'TypeError') throw cleanErr;

      const isNetworkError = cleanErr.name === 'TypeError';
      if ((isNetworkError || errMsg?.includes('starting up')) && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1200 * attempt));
        continue;
      }
      throw new Error('Could not reach the server. Please refresh and try again.');
    }
  }
  throw new Error('Could not reach the server. Please refresh and try again.');
}

function normalizeError(err: any): Error {
  if (err instanceof Error) {
    if (String(err.message) === '[object Object]' && typeof err === 'object') {
      return new Error(JSON.stringify(err));
    }
    return err;
  }
  if (typeof err === 'string') return new Error(err);
  if (typeof err === 'object') return new Error(JSON.stringify(err));
  return new Error(String(err));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hub_token'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem('hub_token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function saveSession(newToken: string, newUser: AppUser) {
    localStorage.setItem('hub_token', newToken);
    setToken(newToken);
    setUser(newUser);
  }

  const loginWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      saveSession(data.token, data.user);
    } catch (err: any) {
      const clean = normalizeError(err);
      setAuthError(clean.message || 'Login failed.');
      throw clean;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    setAuthError(null);
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      saveSession(data.token, data.user);
    } catch (err: any) {
      const clean = normalizeError(err);
      setAuthError(clean.message || 'Sign up failed.');
      throw clean;
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    setAuthError(null);
    try {
      const data = await apiFetch('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });
      saveSession(data.token, data.user);
    } catch (err: any) {
      const clean = normalizeError(err);
      setAuthError(clean.message || 'Google sign-in failed.');
      throw clean;
    }
  };

  const logout = () => {
    localStorage.removeItem('hub_token');
    setToken(null);
    setUser(null);
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{ user, token, loading, authError, loginWithEmail, signUp, loginWithGoogle, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};
