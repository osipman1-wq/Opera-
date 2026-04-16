import React, { useState, useEffect } from 'react';
import { generateEbook } from '../services/gemini';
import { Loader2, BookOpen, Download, User, Building2, Type, History, Trash2, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

export default function EbookWriter() {
  const [topic, setTopic] = useState('');
  const [publisher, setPublisher] = useState('');
  const [author, setAuthor] = useState('');
  const [type, setType] = useState<'story' | 'educational'>('story');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'ebooks'),
      where('authorUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(items);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'ebooks');
    });

    return () => unsubscribe();
  }, [user]);

  const saveToFirestore = async (ebookContent: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'ebooks'), {
        authorUid: user.uid,
        title: topic,
        authorName: author,
        publisher,
        type,
        content: ebookContent,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'ebooks');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ebooks', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `ebooks/${id}`);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim() || !publisher.trim() || !author.trim()) return;
    setLoading(true);
    setError('');
    setContent('');
    try {
      const result = await generateEbook(topic, publisher, author, type);
      setContent(result || '');
      if (result) {
        await saveToFirestore(result);
      }
    } catch (err) {
      setError('Failed to generate eBook. This process is intensive, please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-8 mb-8">
        <h2 className="text-2xl font-serif font-bold mb-2 flex items-center gap-2">
          <BookOpen className="text-blue-600" />
          Professional E-book & Story Creator
        </h2>
        <p className="text-neutral-500 mb-6 text-sm">
          Generate structured books with copyright pages, introductions, and full chapters.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
             <div>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                <User size={14} /> Author Name
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author Name"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                <Building2 size={14} /> Publisher Name
              </label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Publisher Entity"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                <Type size={14} /> Book Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setType('story')}
                  className={`flex-1 py-3 rounded-xl font-medium border transition-all ${
                    type === 'story'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-blue-200'
                  }`}
                >
                  Story / Fiction
                </button>
                <button
                  onClick={() => setType('educational')}
                  className={`flex-1 py-3 rounded-xl font-medium border transition-all ${
                    type === 'educational'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-blue-200'
                  }`}
                >
                  Educational / Non-Fiction
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
            Book Subject or Story Concept
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder={type === 'story' ? "Enter a story prompt or idea..." : "Enter the educational topic or title..."}
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !topic || !publisher || !author}
          className="w-full bg-neutral-900 text-white py-4 rounded-xl font-semibold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Writing Your Masterpiece...
            </>
          ) : (
            'Generate Professional eBook'
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm">
            <Loader2 className="opacity-0 w-0" />
            {error}
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-8 pt-8 border-t border-neutral-100 px-2 sm:px-0">
             <button 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors mb-4"
             >
               <History size={16} /> {showHistory ? 'Hide Saved Books' : `View Saved Books (${history.length})`}
             </button>

             <AnimatePresence>
               {showHistory && (
                 <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3"
                 >
                   {history.map((item) => (
                     <div key={item.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between group">
                       <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setTopic(item.title);
                            setAuthor(item.authorName);
                            setPublisher(item.publisher);
                            setType(item.type);
                            setContent(item.content);
                            window.scrollTo({ top: 500, behavior: 'smooth' });
                          }}
                       >
                         <h4 className="font-semibold text-neutral-800 line-clamp-1">{item.title}</h4>
                         <div className="flex items-center gap-3 mt-1">
                           <span className="text-[10px] bg-white border border-neutral-200 px-2 py-0.5 rounded text-neutral-500 uppercase font-bold tracking-wider">{item.type}</span>
                           <span className="text-[10px] text-neutral-400 flex items-center gap-1 font-medium">
                             <Clock size={10} /> {new Date(item.createdAt).toLocaleDateString()}
                           </span>
                         </div>
                       </div>
                       <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                       >
                         <Trash2 size={16} />
                       </button>
                     </div>
                   ))}
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {content && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden"
          >
            <div className="bg-neutral-50 px-8 py-4 border-b border-neutral-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-500 flex items-center gap-2">
                <BookOpen size={16} /> Manuscript Preview
              </span>
              <button
                onClick={() => {
                   const element = document.createElement("a");
                   const file = new Blob([content], {type: 'text/plain'});
                   element.href = URL.createObjectURL(file);
                   element.download = `${topic.slice(0, 20)}.md`;
                   document.body.appendChild(element);
                   element.click();
                }}
                className="bg-white px-4 py-2 rounded-lg border border-neutral-200 text-xs font-semibold hover:bg-neutral-100 transition-all flex items-center gap-2"
              >
                <Download size={14} /> Download (.md)
              </button>
            </div>
            <div className="p-12 max-h-[600px] overflow-y-auto custom-scrollbar">
              <div className="markdown-body">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
