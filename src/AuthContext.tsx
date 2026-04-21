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

async function apiFetch(path: string, options?: RequestInit, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(path, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
      });

      const contentType = res.headers.get('content-type') || '';

      // Transient server/proxy errors — retry automatically
      if ((res.status === 404 || res.status === 502 || res.status === 503) && attempt < retries) {
        await new Promise(r => setTimeout(r, 800 * attempt));
        continue;
      }

      if (!contentType.includes('application/json')) {
        const text = await res.text();
        const clean = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
        throw new Error(`Server unreachable (${res.status}). Please refresh and try again.`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
      return data;

    } catch (err: any) {
      const isNetworkError = err.name === 'TypeError' || err.message === 'Failed to fetch';
      if (isNetworkError && attempt < retries) {
        await new Promise(r => setTimeout(r, 800 * attempt));
        continue;
      }
      throw err;
    }
  }
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
      setAuthError(err.message || 'Login failed.');
      throw err;
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
      setAuthError(err.message || 'Sign up failed.');
      throw err;
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
      setAuthError(err.message || 'Google sign-in failed.');
      throw err;
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
