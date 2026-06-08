import React from 'react';

/**
 * Highly polished, professional, Swiss-style skeleton loaders.
 * These utilize soft gray pulsars with precise dimensions,
 * high-contrast micro-shadows, and elegant layouts to indicate raw mock-loading.
 */

interface SkeletonProps {
  className?: string;
  key?: React.Key;
}

export function Shimmer({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-shimmer rounded-xl ${className}`} />
  );
}

export function StorySkeleton() {
  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl py-4 px-5 border border-outline-variant/35 shadow-sm flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <Shimmer className="h-2.5 w-24 rounded" />
      </div>
      <div className="flex space-x-4 overflow-x-auto no-scrollbar pb-1">
        {/* Your Story button placeholder */}
        <div className="flex flex-col items-center space-y-1.5 shrink-0">
          <div className="w-14 h-14 rounded-full border border-dashed border-outline-variant/60 flex items-center justify-center bg-surface-container-low" />
          <Shimmer className="h-2.5 w-12" />
        </div>
        {/* Other Story avatars */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col items-center space-y-1.5 shrink-0">
            <Shimmer className="w-14 h-14 rounded-full" />
            <Shimmer className="h-2.5 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PostSkeleton() {
  return (
    <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl border border-outline-variant/35 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center space-x-3">
        <Shimmer className="w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Shimmer className="h-3 w-1/3" />
          <Shimmer className="h-2 w-1/4" />
        </div>
      </div>
      {/* Caption text blocks */}
      <div className="px-4 pb-3 space-y-1.5">
        <Shimmer className="h-2.5 w-full" />
        <Shimmer className="h-2.5 w-5/6" />
      </div>
      {/* Content Image Box */}
      <div className="w-full relative aspect-square sm:aspect-[4/3] bg-surface-container-low flex items-center justify-center">
        <Shimmer className="w-full h-full rounded-none" />
      </div>
      {/* Feedback elements */}
      <div className="p-4 flex justify-between items-center border-t border-outline-variant/20">
        <div className="flex space-x-4">
          <Shimmer className="h-4.5 w-12" />
          <Shimmer className="h-4.5 w-12" />
        </div>
        <Shimmer className="h-4.5 w-8" />
      </div>
    </div>
  );
}

export function ExploreSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Shimmer className="h-7 w-48" />
        <Shimmer className="h-4.5 w-72" />
      </div>
      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Shimmer key={i} className="h-9 w-24 rounded-full shrink-0" />
        ))}
      </div>
      {/* Grid columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-2">
            <Shimmer className="aspect-square w-full rounded-xl" />
            <div className="flex items-center space-x-2 px-1">
              <Shimmer className="w-5 h-5 rounded-full" />
              <Shimmer className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReelsSkeleton() {
  return (
    <div className="relative w-full max-w-md mx-auto aspect-[9/16] bg-surface-container-low rounded-3xl border border-outline-variant/35 shadow-xl overflow-hidden flex flex-col justify-between p-6">
      {/* Header overlay */}
      <div className="flex justify-between items-center">
        <Shimmer className="h-5 w-24" />
        <Shimmer className="h-5 w-8 rounded-full" />
      </div>
      
      {/* Middle sound animation layout blocker */}
      <div className="flex items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-surface-container-high/30 flex items-center justify-center animate-pulse">
          <Shimmer className="w-10 h-10 rounded-full" />
        </div>
      </div>

      {/* Floating meta & controls */}
      <div className="flex justify-between items-end">
        <div className="space-y-2.5 flex-1 max-w-[70%]">
          <div className="flex items-center space-x-2">
            <Shimmer className="w-8 h-8 rounded-full" />
            <Shimmer className="h-3.5 w-24" />
          </div>
          <Shimmer className="h-2.5 w-full" />
          <Shimmer className="h-2.5 w-4/5" />
          <Shimmer className="h-2.5 w-2/3" />
        </div>
        <div className="flex flex-col space-y-4 items-center">
          {[1, 2, 3, 4].map((i) => (
            <Shimmer key={i} className="w-10 h-10 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Column 1: Inbox items */}
      <div className="md:col-span-1 bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl border border-outline-variant/35 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Shimmer className="h-5 w-20" />
          <Shimmer className="h-4.5 w-16" />
        </div>
        <Shimmer className="h-9 w-full rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-3 p-2">
              <Shimmer className="w-11 h-11 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex justify-between">
                  <Shimmer className="h-3 w-1/2" />
                  <Shimmer className="h-2 w-8" />
                </div>
                <Shimmer className="h-2.5 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: Chat discussion pane */}
      <div className="md:col-span-2 bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl border border-outline-variant/35 shadow-sm p-4 flex flex-col justify-between min-h-[480px]">
        {/* Header */}
        <div className="pb-4 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shimmer className="w-10 h-10 rounded-full" />
            <div className="space-y-1.5">
              <Shimmer className="h-3.5 w-32" />
              <Shimmer className="h-2 w-16" />
            </div>
          </div>
          <div className="flex space-x-2">
            <Shimmer className="w-8 h-8 rounded-full" />
            <Shimmer className="w-8 h-8 rounded-full" />
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 py-4 space-y-4 overflow-y-auto">
          <div className="flex items-end space-x-2">
            <Shimmer className="w-8 h-8 rounded-full shrink-0" />
            <Shimmer className="h-10 w-44 rounded-2xl rounded-bl-none" />
          </div>
          <div className="flex items-end justify-end space-x-2">
            <Shimmer className="h-14 w-60 rounded-2xl rounded-br-none" />
          </div>
          <div className="flex items-end space-x-2">
            <Shimmer className="w-8 h-8 rounded-full shrink-0" />
            <Shimmer className="h-12 w-52 rounded-2xl rounded-bl-none" />
          </div>
        </div>

        {/* Footer Chat Input */}
        <div className="pt-4 border-t border-outline-variant/20 flex items-center space-x-2">
          <Shimmer className="w-9 h-9 rounded-full shrink-0" />
          <Shimmer className="h-10 flex-1 rounded-xl" />
          <Shimmer className="w-9 h-9 rounded-full shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <Shimmer className="h-6 w-48" />
          <Shimmer className="h-3.5 w-72" />
        </div>
        <Shimmer className="h-9 w-28 rounded-xl" />
      </div>

      {/* Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-container-lowest/90 border border-outline-variant/35 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <Shimmer className="h-3 w-20" />
              <Shimmer className="h-3.5 w-10 rounded-full" />
            </div>
            <div className="space-y-2">
              <Shimmer className="h-8 w-24" />
              <Shimmer className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart Block */}
      <div className="bg-surface-container-lowest/90 border border-outline-variant/35 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <Shimmer className="h-4.5 w-36" />
          <Shimmer className="h-8 w-44 rounded-full" />
        </div>
        <Shimmer className="h-56 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6">
        <Shimmer className="w-24 h-24 rounded-full shrink-0" />
        
        <div className="flex-1 space-y-4 w-full text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="space-y-1.5">
              <Shimmer className="h-5 w-36 mx-auto md:mx-0" />
              <Shimmer className="h-3 w-24 mx-auto md:mx-0" />
            </div>
            <div className="flex gap-2 justify-center md:justify-start">
              <Shimmer className="h-8 w-20 rounded-xl" />
              <Shimmer className="h-8 w-24 rounded-xl" />
            </div>
          </div>
          
          <div className="flex justify-center md:justify-start gap-6 pt-2 border-t border-outline-variant/20">
            <Shimmer className="h-6 w-16" />
            <Shimmer className="h-6 w-16" />
            <Shimmer className="h-6 w-16" />
          </div>

          <Shimmer className="h-3 w-5/6 mx-auto md:mx-0" />
        </div>
      </div>

      {/* Grid of posts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Shimmer key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function NotificationsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Shimmer className="h-6 w-32" />
        <Shimmer className="h-8 w-28 rounded-full" />
      </div>
      <div className="flex gap-2">
        {[1,2,3,4].map(i => <Shimmer key={i} className="h-8 w-20 rounded-full" />)}
      </div>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
          <Shimmer className="w-11 h-11 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Shimmer className="h-3 w-3/4" />
            <Shimmer className="h-2.5 w-1/2" />
          </div>
          <Shimmer className="w-12 h-12 rounded-xl shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-4 max-w-2xl">
      <Shimmer className="h-7 w-32" />
      {[1,2,3,4,5].map(i => (
        <div key={i} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
          <div className="flex items-center gap-3">
            <Shimmer className="w-9 h-9 rounded-full" />
            <div className="space-y-2">
              <Shimmer className="h-3 w-32" />
              <Shimmer className="h-2.5 w-48" />
            </div>
          </div>
          <Shimmer className="w-5 h-5 rounded" />
        </div>
      ))}
    </div>
  );
}

export function CreateSkeleton() {
  return (
    <div className="space-y-4 max-w-2xl">
      <Shimmer className="h-7 w-40" />
      <Shimmer className="w-full aspect-square rounded-2xl" />
      <Shimmer className="h-24 w-full rounded-2xl" />
      <Shimmer className="h-12 w-full rounded-full" />
    </div>
  );
}

export function BookmarksSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Shimmer className="h-6 w-32" />
        <div className="flex gap-1">
          <Shimmer className="h-8 w-8 rounded-xl" />
          <Shimmer className="h-8 w-8 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1,2,3,4,5,6].map(i => <Shimmer key={i} className="aspect-square w-full rounded-2xl" />)}
      </div>
    </div>
  );
}

interface SkeletonSystemProps {
  type: 'home' | 'explore' | 'create' | 'reels' | 'messages' | 'profile' | 'settings' | 'insights' | 'notifications' | 'bookmarks';
}

export default function SkeletonSystem({ type }: SkeletonSystemProps) {
  switch (type) {
    case 'home':
      return (
        <div className="flex flex-col gap-6">
          <StorySkeleton />
          <div className="flex flex-col gap-6">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        </div>
      );
    case 'explore':
      return <ExploreSkeleton />;
    case 'reels':
      return <ReelsSkeleton />;
    case 'messages':
      return <MessagesSkeleton />;
    case 'insights':
      return <InsightsSkeleton />;
    case 'profile':
      return <ProfileSkeleton />;
    case 'notifications': return <NotificationsSkeleton />;
    case 'settings': return <SettingsSkeleton />;
    case 'create': return <CreateSkeleton />;
    case 'bookmarks': return <BookmarksSkeleton />;
    default:
      return (
        <div className="space-y-4 p-4 bg-surface-container rounded-2xl">
          <Shimmer className="h-6 w-44" />
          <Shimmer className="h-3.5 w-full" />
          <Shimmer className="h-12 w-full" />
          <Shimmer className="h-12 w-full" />
        </div>
      );
  }
}
