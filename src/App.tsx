import React, { useState } from 'react';
import OperaWriter from './components/OperaWriter';
import EbookWriter from './components/EbookWriter';
import { PenBox, BookOpen, Sparkles, Feather, LogIn, LogOut, User, Mail, Lock, UserCircle, Chrome } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function AdPlaceholder() {
  return (
    <div className="max-w-7xl mx-auto px-4 mb-8">
      <div className="bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-2xl p-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Sponsored Content</span>
          <div className="w-full h-24 flex items-center justify-center bg-white rounded-xl border border-neutral-100 shadow-sm">
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-400">Ad Container Ready</p>
              <p className="text-[10px] text-neutral-300 font-mono mt-1">ID: ca-app-pub-7630905345973270/6585884409</p>
            </div>
          </div>
          <p className="text-[9px] text-neutral-400 max-w-sm mx-auto mt-2 leading-relaxed">
            Note: AdMob IDs are used for Native Mobile Apps. For this web hub, consider using Google AdSense which is optimized for browser-based traffic.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginView() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const { login, loginWithEmail, signUp, continueAnonymously, authError, clearError } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);
    if (mode === 'signin') {
      await loginWithEmail(email, password);
    } else {
      await signUp(email, password, name, username);
    }
    setLocalLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6">
      <div className="max-w-md w-full bg-white p-10 rounded-[32px] shadow-2xl border border-neutral-100">
        <div className="bg-neutral-900 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3 hover:rotate-0 transition-transform">
          <Feather className="text-white" size={28} />
        </div>
        
        <h1 className="text-2xl font-serif font-bold text-neutral-900 text-center mb-2">
          {mode === 'signin' ? 'Sign in to All Hub' : 'Create Your Hub Account'}
        </h1>
        <p className="text-neutral-400 text-sm text-center mb-8 font-medium">
          Professional AI writing suite with cloud persistence
        </p>

        {authError && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-[11px] font-bold flex items-center justify-between animate-shake border border-red-100">
            <span className="flex-1">{authError}</span>
            <button onClick={clearError} className="ml-2 hover:underline text-xs">Dismiss</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={16} />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all font-medium"
                />
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 font-bold text-xs">@</span>
                <input
                  type="text"
                  placeholder="Username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all font-medium"
                />
              </div>
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={16} />
            <input
              type="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all font-medium"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" size={16} />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={localLoading}
            className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-neutral-800 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl disabled:opacity-50 disabled:hover:scale-100"
          >
            {localLoading ? 'Processing...' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
            <span className="bg-white px-4 text-neutral-300">Or continue with</span>
          </div>
        </div>

        <button
          onClick={(e) => { e.preventDefault(); login(); }}
          className="w-full bg-white text-neutral-900 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 border border-neutral-200 hover:bg-neutral-50 transition-all shadow-sm"
        >
          <Chrome size={18} /> Google Account
        </button>

        <button
          onClick={(e) => { e.preventDefault(); continueAnonymously(); }}
          className="w-full mt-3 bg-neutral-100 text-neutral-600 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-neutral-200 transition-all"
        >
          Continue as Guest
        </button>

        <p className="mt-8 text-center text-xs font-medium text-neutral-400">
          {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              clearError();
            }}
            className="text-neutral-900 font-bold hover:underline"
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
      <p className="mt-8 text-neutral-300 text-[10px] uppercase font-bold tracking-[0.4em]">All Hub Secure Architecture</p>
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<'opera' | 'ebook'>('opera');
  const { user, login, logout, loading, authError, clearError } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-neutral-900 p-4 rounded-2xl shadow-xl animate-bounce">
            <Feather className="text-white" size={32} />
          </div>
          <p className="text-neutral-400 font-medium animate-pulse uppercase tracking-widest text-xs">All Hub Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <ErrorBoundary>
        {/* Header */}
        <nav className="bg-white border-b border-neutral-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center gap-2">
                <div className="bg-neutral-900 p-1.5 rounded-lg shadow-sm">
                  <Feather className="text-white" size={20} />
                </div>
                <h1 className="text-xl font-serif font-bold tracking-tight text-neutral-900 border-l border-neutral-200 pl-3">
                  All Hub
                </h1>
              </div>
              
              <div className="hidden sm:flex bg-neutral-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('opera')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'opera'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  <PenBox size={16} />
                  Opera Hub
                </button>
                <button
                  onClick={() => setActiveTab('ebook')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'ebook'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  <BookOpen size={16} />
                  Pro E-book
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 text-neutral-400">
                  <Sparkles size={16} />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold">
                    {user.isAnonymous ? 'Guest Experience' : 'Logged In'}
                  </span>
                </div>
                <div className="flex items-center gap-3 border-l border-neutral-200 pl-4">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-neutral-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
                      <User size={16} className={user.isAnonymous ? "text-neutral-300" : "text-neutral-400"} />
                    </div>
                  )}
                  <button 
                    onClick={logout}
                    className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors tooltip"
                    title={user.isAnonymous ? "Leave Guest Session" : "Log Out"}
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Mobile Nav */}
            <div className="sm:hidden flex justify-center pb-4">
               <div className="flex bg-neutral-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('opera')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'opera'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500'
                  }`}
                >
                  Opera
                </button>
                <button
                  onClick={() => setActiveTab('ebook')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'ebook'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500'
                  }`}
                >
                  E-book
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="py-12">
          <AdPlaceholder />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {activeTab === 'opera' ? <OperaWriter /> : <EbookWriter />}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-12 border-t border-neutral-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3">
              Professional Data Persistence <Sparkles size={12} className="text-neutral-300" /> Powered by All Hub
            </p>
          </div>
        </footer>
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

