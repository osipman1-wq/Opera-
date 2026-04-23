import React, { useEffect, useRef, useState } from 'react';
import { Feather } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import Boundary from './components/Boundary';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

async function pingServer(timeoutMs = 4000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch('/api/health', {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(): Promise<void> {
  // Try up to 10 times with short delays — but always proceed after that.
  // Never block the user indefinitely.
  for (let i = 0; i < 10; i++) {
    const ok = await pingServer(3000);
    if (ok) return;
    await new Promise(r => setTimeout(r, 1500));
  }
  // Server might be slow but proceed anyway — individual calls have retry logic.
  console.warn('[App] Server health check timed out — proceeding anyway.');
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-neutral-900 p-4 rounded-2xl shadow-xl animate-bounce">
          <Feather className="text-white" size={32} />
        </div>
        <p className="text-neutral-400 font-medium uppercase tracking-[0.3em] text-[10px]">
          {message}
        </p>
      </div>
    </div>
  );
}

function AppContent() {
  const { loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  if (loading) return <LoadingScreen message="Initializing Hub..." />;
  if (showLogin) return <Login onBack={() => setShowLogin(false)} />;
  return <Dashboard onShowLogin={() => setShowLogin(true)} />;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    waitForServer().then(() => {
      console.log('[App] Proceeding to render.');
      setReady(true);
    });
  }, []);

  if (!ready) return <LoadingScreen message="Connecting to server..." />;

  return (
    <Boundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Boundary>
  );
}
