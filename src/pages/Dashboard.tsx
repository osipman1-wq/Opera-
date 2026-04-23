import React, { useState, useEffect } from 'react';
import OperaWriter from '../components/OperaWriter';
import EbookWriter from '../components/EbookWriter';
import AdBanner from '../components/AdBanner';
import { PenBox, BookOpen, Sparkles, Feather, LogOut, User, Rss, LogIn } from 'lucide-react';
import { useAuth } from '../AuthContext';
import Boundary from '../components/Boundary';

export default function Dashboard({ onShowLogin }: { onShowLogin?: () => void } = {}) {
  const [activeTab, setActiveTab] = useState<'opera' | 'ebook'>('opera');
  const [learnerStatus, setLearnerStatus] = useState<any>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    fetch('/api/learning/status')
      .then(r => r.json())
      .then(setLearnerStatus)
      .catch(() => null);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <Boundary>
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
                    activeTab === 'opera' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  <PenBox size={16} />
                  Opera Hub
                </button>
                <button
                  onClick={() => setActiveTab('ebook')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'ebook' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  <BookOpen size={16} />
                  Pro E-book
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2">
                  {learnerStatus?.status === 'ready' ? (
                    <span className="flex items-center gap-1.5 text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      <Rss size={10} className="animate-pulse" />
                      AI Learning Active · {learnerStatus.newsSamplesCount} articles
                    </span>
                  ) : learnerStatus?.status === 'learning' ? (
                    <span className="flex items-center gap-1.5 text-orange-500 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      <Rss size={10} />
                      AI Learning...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                      <Sparkles size={14} />
                      Professional Account
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 border-l border-neutral-200 pl-4">
                  {user ? (
                    <>
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-neutral-200 object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
                          <User size={16} className="text-neutral-400" />
                        </div>
                      )}
                      <span className="hidden md:block text-xs font-semibold text-neutral-600 max-w-[120px] truncate">
                        {user.displayName || user.email}
                      </span>
                      <button
                        onClick={logout}
                        className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors"
                        title="Log Out"
                      >
                        <LogOut size={20} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={onShowLogin}
                      className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-sm"
                    >
                      <LogIn size={14} />
                      Sign In
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="sm:hidden flex justify-center pb-4">
              <div className="flex bg-neutral-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('opera')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'opera' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                  }`}
                >
                  Opera
                </button>
                <button
                  onClick={() => setActiveTab('ebook')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'ebook' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                  }`}
                >
                  E-book
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="w-full bg-white border-b border-neutral-100 py-2 px-4">
          <div className="max-w-7xl mx-auto">
            <AdBanner format="horizontal" label="Sponsored" />
          </div>
        </div>

        <main className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {activeTab === 'opera' ? <OperaWriter /> : <EbookWriter />}
          </div>
        </main>

        <div className="w-full bg-neutral-50 border-t border-neutral-100 py-4 px-4">
          <div className="max-w-3xl mx-auto">
            <AdBanner format="rectangle" label="Advertisement" />
          </div>
        </div>

        <footer className="py-10 border-t border-neutral-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3">
              Powered by All Hub <Sparkles size={12} className="text-neutral-300" /> AI Writing Suite
            </p>
          </div>
        </footer>
      </Boundary>
    </div>
  );
}
