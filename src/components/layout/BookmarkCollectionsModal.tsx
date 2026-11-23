import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Folder, Plus, Check, X, Bookmark } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface BookmarkCollectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onSave?: (collectionName: string) => void;
}

interface Collection {
  id: string;
  name: string;
  icon: string;
  count: number;
}

const DEFAULT_COLLECTIONS: { name: string; icon: string }[] = [
  { name: 'Inspiration', icon: '💡' },
  { name: 'Design', icon: '🎨' },
  { name: 'Photography', icon: '📸' },
  { name: 'Travel', icon: '✈️' },
  { name: 'Food', icon: '🍕' },
  { name: 'Fitness', icon: '💪' },
];

export default function BookmarkCollectionsModal({ isOpen, onClose, postId, onSave }: BookmarkCollectionsModalProps) {
  const { currentUser } = useAuthStore();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;
    const fetchCollections = async () => {
      const { data } = await (supabase.from('collections') as any)
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        setCollections(data.map((c: any) => ({
          id: c.id,
          name: c.name,
          icon: c.icon || '📌',
          count: c.post_count || 0,
        })));
      } else {
        setCollections(DEFAULT_COLLECTIONS.map((c, i) => ({
          id: `default-${i}`,
          name: c.name,
          icon: c.icon,
          count: 0,
        })));
      }
    };
    fetchCollections();
  }, [isOpen, currentUser?.id]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCollection(null);
      setShowCreateNew(false);
      setNewCollectionName('');
      setSaved(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!selectedCollection || !currentUser?.id) return;
    try {
      await (supabase.from('saved_posts') as any).insert({
        user_id: currentUser.id,
        post_id: postId,
        collection_id: selectedCollection === 'default-inspiration' ? null : selectedCollection,
      });
      setSaved(true);
      setTimeout(() => {
        onSave?.(selectedCollection);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Bookmark save failed:', err);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || !currentUser?.id) return;
    try {
      const { data } = await (supabase.from('collections') as any).insert({
        user_id: currentUser.id,
        name: newCollectionName.trim(),
      }).select().single();

      if (data) {
        setCollections(prev => [...prev, { id: data.id, name: data.name, icon: '📌', count: 0 }]);
        setSelectedCollection(data.id);
        setShowCreateNew(false);
        setNewCollectionName('');
      }
    } catch (err) {
      console.error('Create collection failed:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative w-full max-w-lg bg-surface-container-lowest dark:bg-surface-container-low rounded-t-3xl md:rounded-3xl max-h-[85dvh] flex flex-col z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-on-surface">Save to Collection</h3>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface-container dark:bg-surface-container-high flex items-center justify-center"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </motion.button>
            </div>

            {/* Collections */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {saved ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
                    <Check className="w-6 h-6 text-success" />
                  </div>
                  <p className="text-sm font-bold text-on-surface">Saved to collection!</p>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {collections.map(collection => {
                    const isSelected = selectedCollection === collection.id;
                    return (
                      <motion.button
                        key={collection.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedCollection(collection.id)}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all ${
                          isSelected
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-surface-container dark:hover:bg-surface-container-high border border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-surface-container dark:bg-surface-container-high flex items-center justify-center text-lg">
                          {collection.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-bold text-on-surface">{collection.name}</p>
                          <p className="text-xs text-outline">{collection.count} posts</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-primary border-primary' : 'border-outline-variant/40'
                        }`}>
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                              <Check className="w-3.5 h-3.5 text-white" />
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}

                  {/* Create new collection */}
                  {showCreateNew ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-2 p-3 bg-surface-container dark:bg-surface-container-high rounded-2xl"
                    >
                      <input
                        type="text"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        placeholder="Collection name..."
                        className="flex-1 bg-transparent text-sm outline-none text-on-surface placeholder:text-outline"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCollection(); }}
                      />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCreateCollection}
                        className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowCreateNew(true)}
                      className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-surface-container dark:hover:bg-surface-container-high transition-all border border-dashed border-outline-variant/30"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-sm font-bold text-primary">Create new collection</p>
                    </motion.button>
                  )}
                </div>
              )}
            </div>

            {/* Save button */}
            {!saved && selectedCollection && (
              <div className="px-5 pb-6 pt-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleSave}
                  className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors"
                >
                  Save Post
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
