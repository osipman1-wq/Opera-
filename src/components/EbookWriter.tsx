import React, { useState, useEffect } from 'react';
import { generateEbook } from '../services/aiClient';
import { Loader2, BookOpen, Download, User, Building2, Type, History, Trash2, AlertCircle, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';

interface Ebook {
  id: number;
  title: string;
  author_name: string;
  publisher: string;
  type: 'story' | 'educational';
  content: string;
  created_at: string;
}

export default function EbookWriter() {
  const [topic, setTopic] = useState('');
  const [publisher, setPublisher] = useState('');
  const [author, setAuthor] = useState('');
  const [type, setType] = useState<'story' | 'educational'>('story');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Ebook[]>([]);
  const { token } = useAuth();

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (!token) return;
    fetch('/api/content/ebooks', { headers: authHeaders })
      .then(r => {
        if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) return [];
        return r.json();
      })
      .then(data => Array.isArray(data) ? setHistory(data) : null)
      .catch(() => null);
  }, [token]);

  const saveEbook = async (ebookContent: string) => {
    if (!token) return;
    const res = await fetch('/api/content/ebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ title: topic, authorName: author, publisher, type, content: ebookContent })
    });
    if (res.ok) {
      const saved = await res.json();
      setHistory(prev => [saved, ...prev]);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    await fetch(`/api/content/ebooks/${id}`, { method: 'DELETE', headers: authHeaders });
    setHistory(prev => prev.filter(e => e.id !== id));
  };

  const handleGenerate = async () => {
    if (!topic.trim() || !publisher.trim() || !author.trim()) return;
    setLoading(true);
    setError('');
    setContent('');
    try {
      const result = await generateEbook(topic, publisher, author, type);
      setContent(result || '');
      if (result) await saveEbook(result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate eBook. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-8">
            <h2 className="text-2xl font-serif font-bold mb-2 flex items-center gap-2">
              <BookOpen className="text-blue-600" />
              Book Architect
            </h2>
            <p className="text-neutral-500 mb-8 text-sm">
              Design structured manuscripts with full AI assistance.
            </p>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                    <User size={12} /> Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Name"
                    className="w-full px-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                    <Building2 size={12} /> Publisher
                  </label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="Entity"
                    className="w-full px-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                  <Type size={12} /> Genre
                </label>
                <div className="flex p-1 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <button
                    onClick={() => setType('story')}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${type === 'story' ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                  >
                    Fiction
                  </button>
                  <button
                    onClick={() => setType('educational')}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${type === 'educational' ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                  >
                    Educational
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                  Concept / Outline
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={4}
                  placeholder={type === 'story' ? "A journey of a thousand miles..." : "Modern history of West Africa..."}
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all text-sm resize-none"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !topic || !publisher || !author}
                className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-neutral-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Generate Manuscript'}
              </button>

              {error && (
                <div className="p-4 bg-red-50 text-red-500 rounded-2xl flex items-center gap-2 text-[10px] font-bold uppercase border border-red-100">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </div>
          </div>

          {history.length > 0 && (
            <div className="bg-white rounded-3xl border border-neutral-100 p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                <History size={14} /> Library ({history.length})
              </h3>
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-between group">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        setTopic(item.title);
                        setAuthor(item.author_name);
                        setPublisher(item.publisher);
                        setType(item.type);
                        setContent(item.content);
                      }}
                    >
                      <h4 className="text-[11px] font-bold text-neutral-800 line-clamp-1">{item.title}</h4>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-neutral-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {content ? (
              <motion.div
                key="content"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white rounded-[32px] shadow-2xl border border-neutral-100 h-full flex flex-col min-h-[600px]"
              >
                <div className="bg-neutral-50 px-8 py-5 border-b border-neutral-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-400">Digital Manuscript</span>
                    <span className="text-xs font-serif italic text-neutral-600">{author}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCopy}
                      className="bg-white px-4 py-2 rounded-xl border border-neutral-200 text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-100 transition-all flex items-center gap-2"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => {
                        const el = document.createElement('a');
                        const file = new Blob([content], { type: 'text/plain' });
                        el.href = URL.createObjectURL(file);
                        el.download = `${topic.slice(0, 20)}.md`;
                        document.body.appendChild(el);
                        el.click();
                        document.body.removeChild(el);
                      }}
                      className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg"
                    >
                      <Download size={14} /> Export .md
                    </button>
                  </div>
                </div>
                <div className="p-12 flex-1 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/notebook.png')]">
                  <div className="max-w-prose mx-auto">
                    <div className="markdown-body book-preview">
                      <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center bg-neutral-50/50 rounded-[32px] border-2 border-dashed border-neutral-200 min-h-[600px]"
              >
                <BookOpen className="text-neutral-200 mb-4" size={48} />
                <p className="text-neutral-400 font-medium text-sm">Design your masterpiece to start writing.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
