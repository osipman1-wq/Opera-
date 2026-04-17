import React from 'react';
import { Feather, Mail, Lock, UserCircle, Chrome } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useState } from 'react';

export default function Login() {
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
    </div>
  );
}
