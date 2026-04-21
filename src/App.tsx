import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Feather } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import Boundary from './components/Boundary';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

const MAX_WAIT_ATTEMPTS = 15;
const RETRY_DELAY_MS = 1200;

async function waitForServer(): Promise<boolean> {
  for (let i = 0; i < MAX_WAIT_ATTEMPTS; i++) {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (res.ok) return true;
    } catch {
    }
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
  }
  return false;
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-neutral-900 p-4 rounded-2xl shadow-xl animate-bounce">
          <Feather className="text-white" size={32} />
        </div>
        <p className="text-neutral-400 font-medium uppercase tracking-[0.3em] text-[10px]">{message}</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen message="Initializing Hub..." />;
  if (!user) return <Login />;
  return <Dashboard />;
}

export default function App() {
  const [serverReady, setServerReady] = useState(false);
  const [serverFailed, setServerFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    waitForServer().then(ok => {
      if (ok) {
        console.log('[App] Server is ready.');
        setServerReady(true);
      } else {
        console.error('[App] Server did not become ready in time.');
        setServerFailed(true);
      }
    });
  }, []);

  if (serverFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border border-neutral-100 p-10 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-5 mx-auto">
            <Feather className="text-red-400" size={28} />
          </div>
          <h2 className="text-xl font-serif font-bold text-neutral-900 mb-3">Server Unavailable</h2>
          <p className="text-neutral-500 text-sm mb-6">
            The server took too long to respond. This can happen after a cold start — please try refreshing.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-neutral-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-neutral-800 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!serverReady) {
    return <LoadingScreen message="Connecting to server..." />;
  }

  return (
    <Boundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Boundary>
  );
}
