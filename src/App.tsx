import React, { useEffect } from 'react';
import { Feather } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import Boundary from './components/Boundary';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-neutral-900 p-4 rounded-2xl shadow-xl animate-bounce">
            <Feather className="text-white" size={32} />
          </div>
          <p className="text-neutral-400 font-medium uppercase tracking-[0.3em] text-[10px]">Initializing Hub...</p>
        </div>
      </div>
    );
  }

  // If no user and not a local session, show login
  // Note: Local session users are considered authenticated in our app logic
  if (!user) {
    return <Login />;
  }

  return <Dashboard />;
}

export default function App() {
  useEffect(() => {
    // Diagnostic Ping
    fetch("/api/health")
      .then(r => r.json())
      .then(d => console.log("[App] Backend ping success:", d))
      .catch(e => console.error("[App] Backend ping failed:", e));
  }, []);

  return (
    <Boundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Boundary>
  );
}

