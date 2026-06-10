import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Image as ImageIcon,

  Tag,
  Send,
  Loader,
  X,
  Search,
  Globe,
  Users,
  ChevronDown,
  Video,
  Check,
} from 'lucide-react';
import { User, Post } from '../types';
import { useStorage } from '../hooks/useStorage';
import { createPost } from '../lib/api/posts';
import { searchProfiles } from '../lib/api/profiles';
import { Avatar } from './ui/Avatar';
import { supabase } from '../lib/supabase';

interface CreatePostProps {
  currentUser: User;
  onPostCreated: (post: Post) => Promise<void>;
  onNavigateToFeed: (postId?: string) => void;
  type?: 'post' | 'reel';
}

export default function CreatePostView({
  currentUser,
  onPostCreated,
  onNavigateToFeed,
  type = 'post',
}: CreatePostProps) {
  const navigate = useNavigate();
  const { uploadFile, isUploading } = useStorage();
  const [isPublishing, setIsPublishing] = useState(false);

  const [caption, setCaption] = useState('');
  const [audience, setAudience] = useState<'everyone' | 'followers'>('everyone');
  const [showAudienceMenu, setShowAudienceMenu] = useState(false);
  const [closeFriendsOnly, setCloseFriendsOnly] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [tagSearchResults, setTagSearchResults] = useState<User[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<User[]>([]);
  const [isTagSearching, setIsTagSearching] = useState(false);
  const [showTagPanel, setShowTagPanel] = useState(false);

  const [collabSearchQuery, setCollabSearchQuery] = useState('');
  const [collabSearchResults, setCollabSearchResults] = useState<User[]>([]);
  const [collabUser, setCollabUser] = useState<User | null>(null);
  const [isCollabSearching, setIsCollabSearching] = useState(false);
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const collabSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isReelMode = type === 'reel';
  const isImageFile = !isReelMode;

  const canPublish =
    isPublishing || isUploading
      ? false
      : caption.trim().length > 0 || selectedFile !== null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const loadFile = (file: File) => {
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const removeMedia = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTagSearch = useCallback((query: string) => {
    setTagSearchQuery(query);
    if (tagSearchTimer.current) clearTimeout(tagSearchTimer.current);
    if (!query.trim()) {
      setTagSearchResults([]);
      return;
    }
    tagSearchTimer.current = setTimeout(async () => {
      setIsTagSearching(true);
      try {
        const results = await searchProfiles(query);
        setTagSearchResults(results.filter((u) => !taggedUsers.some((t) => t.id === u.id)));
      } catch {
        setTagSearchResults([]);
      } finally {
        setIsTagSearching(false);
      }
    }, 300);
  }, [taggedUsers]);

  const handleCollabSearch = useCallback((query: string) => {
    setCollabSearchQuery(query);
    if (collabSearchTimer.current) clearTimeout(collabSearchTimer.current);
    if (!query.trim()) {
      setCollabSearchResults([]);
      return;
    }
    collabSearchTimer.current = setTimeout(async () => {
      setIsCollabSearching(true);
      try {
        const results = await searchProfiles(query);
        setCollabSearchResults(results.filter((u) => u.id !== currentUser.id));
      } catch {
        setCollabSearchResults([]);
      } finally {
        setIsCollabSearching(false);
      }
    }, 300);
  }, [currentUser.id]);

  const addTaggedUser = (user: User) => {
    if (!taggedUsers.some((t) => t.id === user.id)) {
      setTaggedUsers((prev) => [...prev, user]);
    }
    setTagSearchQuery('');
    setTagSearchResults([]);
  };

  const removeTaggedUser = (userId: string) => {
    setTaggedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handlePublish = async () => {
    if (!canPublish) return;
    setIsPublishing(true);
    setPublishError(null);

    try {
      if (isReelMode && selectedFile) {
        const videoUrl = await uploadFile('reels', selectedFile);
        if (!videoUrl || !videoUrl.trim()) {
          throw new Error('Upload returned empty URL. Check Supabase Storage bucket.');
        }

        const { error: insertError } = await supabase.from('reels').insert({
          user_id: currentUser.id,
          video_url: videoUrl,
          thumbnail_url: null,
          caption: caption.trim() || '',
          audio_name: 'Original Audio',
          duration_sec: 0,
        });

        if (insertError) {
          console.error('Reel insert error:', insertError);
          setPublishError(insertError.message || 'Failed to publish reel');
          return;
        }
        await onPostCreated({} as Post);
        onNavigateToFeed();
        return;
      }

      let finalMediaUrl = '';
      if (selectedFile) {
        finalMediaUrl = await uploadFile('post-media', selectedFile);
        if (!finalMediaUrl || !finalMediaUrl.trim()) {
          throw new Error('Upload returned empty URL. Check Supabase Storage bucket.');
        }
      }

      const mediaType = selectedFile && selectedFile.type.startsWith('video/') ? 'video' : (finalMediaUrl ? 'image' : 'text');

      const p = await createPost({
        caption: caption.trim(),
        category: 'General',
        media_urls: finalMediaUrl ? [finalMediaUrl] : [],
        media_type: mediaType as 'image' | 'video' | 'carousel',
        tags: caption.match(/#[a-zA-Z0-9]+/g) || [],
        close_friends_only: closeFriendsOnly,
        collab_user_id: collabUser?.id || null,
      } as any);

      if (!p || !p.id) throw new Error('createPost returned invalid data');
      await onPostCreated(p);
      navigate('/post/' + p.id);
    } catch (err: any) {
      setPublishError(err?.message || 'Failed to publish. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 pt-12 sm:pt-20">
      <div className="w-full max-w-2xl bg-surface-container-lowest dark:bg-surface-container-low rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30">
          <h2 className="text-base font-bold text-on-surface">
            {isReelMode ? 'New Reel' : 'New Post'}
          </h2>
          <button
            onClick={() => onNavigateToFeed()}
            className="text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* ── User row + audience selector ── */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Avatar
            src={currentUser.avatar}
            userId={currentUser.id}
            name={currentUser.name}
            size="md"
            className="bg-surface-container"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-on-surface truncate">
              {currentUser.name}
            </p>
            <div className="relative inline-block mt-0.5">
              <button
                onClick={() => setShowAudienceMenu((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors bg-surface-container dark:bg-surface-container-high rounded-full px-2.5 py-1"
              >
                {audience === 'everyone' ? (
                  <>
                    <Globe className="w-3 h-3" />
                    <span>Everyone</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3" />
                    <span>Followers</span>
                  </>
                )}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showAudienceMenu && (
                <div className="absolute top-full left-0 mt-1 bg-surface-container-lowest dark:bg-surface-container-high border border-outline-variant/30 rounded-xl shadow-xl z-10 min-w-[140px] py-1">
                  <button
                    onClick={() => { setAudience('everyone'); setShowAudienceMenu(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Everyone
                    {audience === 'everyone' && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                  </button>
                  <button
                    onClick={() => { setAudience('followers'); setShowAudienceMenu(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Followers
                    {audience === 'followers' && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Caption textarea ── */}
        <div className="px-5 pb-2">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's on your mind?"
            rows={5}
            aria-label="Post caption"
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-on-surface placeholder:text-on-surface-variant leading-relaxed"
          />
        </div>

        {/* ── Close Friends toggle ── */}
        <div className="px-5 pb-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-on-surface-variant">Audience:</span>
          <button
            onClick={() => setCloseFriendsOnly(a => !a)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              closeFriendsOnly
                ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/20'
            }`}
          >
            {closeFriendsOnly ? '🟢 Close Friends' : '🌍 Everyone'}
          </button>
        </div>

        {/* ── Media preview (if selected) ── */}
        {imagePreview && (
          <div className="px-5 pb-3 relative group">
            <div className="relative rounded-xl overflow-hidden bg-surface-container dark:bg-surface-container-high">
              {isReelMode || (selectedFile && selectedFile.type.startsWith('video/')) ? (
                <video
                  src={imagePreview}
                  controls
                  className="w-full max-h-80 object-contain"
                />
              ) : (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-80 object-contain"
                />
              )}
              <button
                onClick={removeMedia}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Tagged users chips ── */}
        {taggedUsers.length > 0 && (
          <div className="px-5 pb-2 flex flex-wrap gap-2">
            {taggedUsers.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold rounded-full pl-2.5 pr-1.5 py-1"
              >
                @{u.username || u.name}
                <button
                  onClick={() => removeTaggedUser(u.id)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ── Tag People panel ── */}
        {showTagPanel && (
          <div className="px-5 pb-3 border-t border-outline-variant/30 pt-3">
            <div className="flex items-center gap-2 bg-surface-container dark:bg-surface-container-high rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-outline shrink-0" />
              <input
                type="text"
                value={tagSearchQuery}
                onChange={(e) => handleTagSearch(e.target.value)}
                placeholder="Search people to tag..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-on-surface-variant"
                autoFocus
              />
              {isTagSearching && <Loader className="w-4 h-4 animate-spin text-outline" />}
            </div>
            {tagSearchResults.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-outline-variant/30">
                {tagSearchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => addTaggedUser(user)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors text-left"
                  >
                    <Avatar
                      src={user.avatar}
                      userId={user.id}
                      name={user.name}
                      size="sm"
                      className="bg-surface-container"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-on-surface-variant truncate">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Collab search panel ── */}
        {showCollabPanel && (
          <div className="px-5 pb-3 border-t border-outline-variant/30 pt-3">
            <div className="flex items-center gap-2 bg-surface-container dark:bg-surface-container-high rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-outline shrink-0" />
              <input
                type="text"
                value={collabSearchQuery}
                onChange={(e) => handleCollabSearch(e.target.value)}
                placeholder="Search collaborator..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-on-surface-variant"
                autoFocus
              />
              {isCollabSearching && <Loader className="w-4 h-4 animate-spin text-outline" />}
            </div>
            {collabUser && (
              <div className="mt-2 flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2">
                <Avatar src={collabUser.avatar} userId={collabUser.id} name={collabUser.name} size="sm" className="bg-surface-container" />
                <span className="text-xs font-semibold text-primary flex-1 truncate">{collabUser.name}</span>
                <button onClick={() => setCollabUser(null)} className="text-primary hover:text-error transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {collabSearchResults.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-outline-variant/30">
                {collabSearchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => { setCollabUser(user); setCollabSearchQuery(''); setCollabSearchResults([]); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors text-left"
                  >
                    <Avatar src={user.avatar} userId={user.id} name={user.name} size="sm" className="bg-surface-container" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{user.name}</p>
                      <p className="text-xs text-on-surface-variant truncate">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Bottom toolbar ── */}
        <div className="border-t border-outline-variant/30 px-5 py-3">
          <div className="flex items-center gap-1">
            {/* Photo */}
            <button
              onClick={() => {
                if (isReelMode) return;
                fileInputRef.current?.click();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isReelMode
                  ? 'text-outline/50 cursor-not-allowed'
                  : 'text-on-surface-variant hover:bg-surface-container dark:hover:bg-surface-container-high'
              }`}
              disabled={isReelMode}
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Photo</span>
            </button>

            {/* Reel */}
            <button
              onClick={() => {
                if (!isReelMode) return;
                fileInputRef.current?.click();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                !isReelMode
                  ? 'text-outline/50 cursor-not-allowed'
                  : 'text-on-surface-variant hover:bg-surface-container dark:hover:bg-surface-container-high'
              }`}
              disabled={!isReelMode}
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Reel</span>
            </button>

            {/* Tag People */}
            <button
              onClick={() => setShowTagPanel((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                showTagPanel
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container dark:hover:bg-surface-container-high'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Tag People</span>
            </button>

            {/* Collab */}
            <button
              onClick={() => setShowCollabPanel((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                showCollabPanel
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container dark:hover:bg-surface-container-high'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Collab</span>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={isReelMode ? 'video/*' : 'image/*,video/*'}
            className="hidden"
          />
        </div>

        {/* ── Error ── */}
        {publishError && (
          <div className="mx-5 mb-3 bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-xs text-error font-medium">
            {publishError}
          </div>
        )}

        {/* ── Publish button ── */}
        <div className="px-5 pb-5">
          <button
            onClick={handlePublish}
            disabled={!canPublish}
            className="w-full py-3 rounded-full bg-primary hover:bg-primary/90 active:bg-primary/80 text-white font-bold text-sm shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isPublishing || isUploading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <span>Publish</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
