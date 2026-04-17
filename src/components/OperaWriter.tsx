import React, { useState, useEffect } from 'react';
import { generateOperaArticle } from '../services/geminiService';
import { Loader2, PenLine, CheckCircle2, AlertCircle, Image as ImageIcon, History, Trash2, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

const CATEGORIES = [
  'Entertainment', 'Politics', 'Lifestyle', 'Society', 'Sports', 'Technology', 'Business', 'Education'
];

export default function OperaWriter() {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    let unsubscribe: () => void = () => {};

    if (!(user as any).isLocal) {
      const q = query(
        collection(db, 'articles'),
        where('authorUid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setHistory(items);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'articles');
      });
    } else {
      // Local Guest Mode
      const localData = localStorage.getItem('hubLocalArticles') || '[]';
      try {
        setHistory(JSON.parse(localData));
      } catch (e) {
        console.error("Local data corruption:", e);
        setHistory([]);
      }
    }

    return () => unsubscribe();
  }, [user]);

  const saveToFirestore = async (articleContent: string, imageUrl: string) => {
    if (!user) return;
    
    const newArticle = {
      authorUid: user.uid,
      title: topic,
      topic,
      category,
      content: articleContent,
      imageUrl,
      createdAt: new Date().toISOString()
    };

    if (!(user as any).isLocal) {
      try {
        await addDoc(collection(db, 'articles'), newArticle);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'articles');
      }
    } else {
      // Save locally
      const updatedHistory = [{ id: `local_${Date.now()}`, ...newArticle }, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('hubLocalArticles', JSON.stringify(updatedHistory));
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    if (!(user as any).isLocal) {
      try {
        await deleteDoc(doc(db, 'articles', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `articles/${id}`);
      }
    } else {
      // Delete locally
      const updatedHistory = history.filter(item => item.id !== id);
      setHistory(updatedHistory);
      localStorage.setItem('hubLocalArticles', JSON.stringify(updatedHistory));
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setContent('');
    setImage('');
    try {
      const data = await generateOperaArticle(topic, category);
      setContent(data.content || '');
      setImage(data.imageUrl || '');
      
      // Save to Firestore/Local
      if (data.content) {
        await saveToFirestore(data.content, data.imageUrl || '');
      }
    } catch (err) {
      setError('Failed to generate article. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-8 mb-8">
        <h2 className="text-2xl font-serif font-bold mb-2 flex items-center gap-2">
          <PenLine className="text-orange-600" />
          Opera News Hub AI Writer
        </h2>
        <p className="text-neutral-500 mb-6 text-sm">
          Optimized for high acceptance rates. Our AI follows all Opera guidelines to ensure your content is professional and engaging.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Article Topic / News Headline
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. The impact of remote work on productivity in 2024"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    category === cat
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !topic}
            className="w-full bg-neutral-900 text-white py-4 rounded-xl font-semibold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Crafting Your Article...
              </>
            ) : (
              'Generate Pro Article'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-neutral-50 text-neutral-500 rounded-xl flex items-center gap-2 text-xs font-medium border border-neutral-100">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-8 pt-8 border-t border-neutral-100 px-2 sm:px-0">
             <button 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors mb-4"
             >
               <History size={16} /> {showHistory ? 'Hide Saved Articles' : `View Saved Articles (${history.length})`}
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
                            setTopic(item.topic);
                            setCategory(item.category);
                            setContent(item.content);
                            setImage(item.imageUrl);
                            window.scrollTo({ top: 500, behavior: 'smooth' });
                          }}
                       >
                         <h4 className="font-semibold text-neutral-800 line-clamp-1">{item.title}</h4>
                         <div className="flex items-center gap-3 mt-1">
                           <span className="text-[10px] bg-white border border-neutral-200 px-2 py-0.5 rounded text-neutral-500 uppercase font-bold tracking-wider">{item.category}</span>
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-8"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100">
              <span className="flex items-center gap-2 text-green-600 font-medium text-sm">
                <CheckCircle2 size={18} />
                Opera Hub Compliant
              </span>
              <button
                onClick={() => {
                   navigator.clipboard.writeText(content);
                }}
                className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                Copy Markdown
              </button>
            </div>

            {generatingImage && (
              <div className="aspect-video w-full bg-neutral-100 animate-pulse rounded-xl mb-8 flex flex-col items-center justify-center gap-2 text-neutral-400">
                <Loader2 className="animate-spin" />
                <span className="text-xs font-medium uppercase tracking-wider">Generating Supporting Image...</span>
              </div>
            )}

            {image && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 rounded-xl overflow-hidden shadow-lg border border-neutral-100"
              >
                <img 
                  src={image} 
                  alt={topic} 
                  className="w-full aspect-video object-cover"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            )}

            <div className="markdown-body">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
