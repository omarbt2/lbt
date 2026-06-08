import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { OutletContextType } from '../types/context';
import { Post } from '../types';
import { getPostById } from '../lib/api/posts';
import PostDetailView from '../components/PostDetailView';

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, posts, handleLikeToggle, handleBookmarkToggle, handleAddComment, handleDeletePost } = useOutletContext<OutletContextType>();

  const [fetchedPost, setFetchedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPostById(id!).then(setFetchedPost).finally(() => setLoading(false));
  }, [id]);

  const post = useMemo(() => {
    const shared = posts.find((p) => p.id === id);
    if (shared) return shared;
    return fetchedPost;
  }, [posts, fetchedPost, id]);

  if (loading && !post) return <LoadingSpinner />;

  if (!post) {
    return (
      <div className="flex justify-center py-20 text-sm text-on-surface-variant">
        Post not found.
      </div>
    );
  }

  return (
    <PostDetailView
      post={post}
      currentUser={currentUser}
      onBack={() => navigate(-1)}
      onLikeToggle={handleLikeToggle}
      onBookmarkToggle={handleBookmarkToggle}
      onAddComment={handleAddComment}
      onDeletePost={handleDeletePost}
    />
  );
}
