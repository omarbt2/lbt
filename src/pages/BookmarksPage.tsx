import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Grid2X2, List, FolderPlus, X } from 'lucide-react';
import { Post } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { getCollections, createCollection, deleteCollection, getSavedPostsByCollection, movePostToCollection, Collection } from '../lib/api/collections';

export default function BookmarksPage() {
  const navigate = useNavigate();
  const onPostSelect = (id: string) => navigate('/post/' + id);

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadCollections = useCallback(async () => {
    try {
      const data = await getCollections();
      setCollections(data);
    } catch (err) {
      console.error('Failed to load collections:', err);
    }
  }, []);

  const loadPosts = useCallback(async (collectionId: string | null) => {
    setIsLoading(true);
    try {
      const data = await getSavedPostsByCollection(collectionId);
      setPosts(data);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
    loadPosts(null);
  }, [loadCollections, loadPosts]);

  const handleCollectionClick = (collectionId: string | null) => {
    setActiveCollectionId(collectionId);
    loadPosts(collectionId);
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    setIsCreating(true);
    try {
      await createCollection(newCollectionName.trim());
      setNewCollectionName('');
      setShowNewCollectionModal(false);
      await loadCollections();
    } catch (err) {
      console.error('Failed to create collection:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!window.confirm('Delete this collection? Posts will be moved to All Posts.')) return;
    try {
      for (const post of posts) {
        await movePostToCollection(post.id, null);
      }
      await deleteCollection(id);
      if (activeCollectionId === id) {
        setActiveCollectionId(null);
        await loadPosts(null);
      }
      await loadCollections();
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };

  if (isLoading && collections.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4 max-w-2xl mx-auto animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-on-surface">Saved Posts</h1>
          <span className="text-xs font-bold text-outline bg-surface-container px-2 py-0.5 rounded-full">
            {posts.length}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-xl transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-outline hover:bg-surface-container'}`}
            aria-label="Grid view"
          >
            <Grid2X2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-outline hover:bg-surface-container'}`}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collections Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Collections</h2>
          <button
            onClick={() => setShowNewCollectionModal(true)}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <FolderPlus className="w-3.5 h-3.5" /> New
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => handleCollectionClick(null)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all shrink-0 min-w-[100px] ${
              activeCollectionId === null
                ? 'border-primary bg-primary/5'
                : 'border-outline-variant/30 hover:border-primary/30'
            }`}
          >
            <div className="w-14 h-14 rounded-xl bg-surface-container-high flex items-center justify-center">
              <Bookmark className="w-6 h-6 text-primary" />
            </div>
            <span className="text-[10px] font-bold text-on-surface">All Posts</span>
            <span className="text-[9px] text-outline">{posts.length}</span>
          </button>

          {collections.map((col) => (
            <div
              key={col.id}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all shrink-0 min-w-[100px] cursor-pointer relative group ${
                activeCollectionId === col.id
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant/30 hover:border-primary/30'
              }`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteCollection(col.id); }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-error text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-3 h-3" />
              </button>
              <div
                onClick={() => handleCollectionClick(col.id)}
                className="w-14 h-14 rounded-xl bg-surface-container-high overflow-hidden"
              >
                {col.cover_url ? (
                  <img src={col.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderPlus className="w-5 h-5 text-outline" />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold text-on-surface truncate max-w-[80px]">{col.name}</span>
              <span className="text-[9px] text-outline">{col.posts_count}</span>
            </div>
          ))}
        </div>
      </section>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Bookmark className="w-12 h-12 text-outline opacity-30" />
          <p className="text-sm font-semibold text-on-surface-variant">
            {activeCollectionId ? 'No posts in this collection.' : 'No saved posts yet.'}
          </p>
          <p className="text-xs text-outline">Tap the bookmark icon on any post to save it here.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map((p) => (
            <div
              key={p.id}
              onClick={() => onPostSelect(p.id)}
              className="aspect-square overflow-hidden bg-surface-container-highest cursor-pointer hover:opacity-85 transition-opacity relative group"
            >
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.caption}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-3 bg-surface-container-high">
                  <p className="text-[10px] font-semibold text-on-surface-variant text-center line-clamp-4">
                    {p.caption}
                  </p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white">
                <span className="flex items-center gap-1 text-xs font-bold">
                  ♥ {p.likes}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold">
                  💬 {p.commentsCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <div
              key={p.id}
              onClick={() => onPostSelect(p.id)}
              className="flex gap-3 p-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 cursor-pointer hover:bg-surface-container/50 transition-colors"
            >
              {p.imageUrl && (
                <img src={p.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                   <Avatar src={p.user.avatar} userId={p.user.id} name={p.user.name} size="xs" className="w-5 h-5" />
                  <span className="text-xs font-bold text-on-surface truncate">{p.user.name}</span>
                  <span className="text-[10px] text-outline ml-auto shrink-0">{p.timeLabel}</span>
                </div>
                <p className="text-xs text-on-surface-variant line-clamp-2">{p.caption}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewCollectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h3 className="text-sm font-bold text-on-surface">New Collection</h3>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name..."
              className="w-full bg-surface-container rounded-xl px-4 py-3 text-xs text-on-surface outline-none resize-none border border-outline-variant/30 focus:border-primary"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowNewCollectionModal(false); setNewCollectionName(''); }}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant rounded-full hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim() || isCreating}
                className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-full disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
