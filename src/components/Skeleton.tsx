import React from 'react';

interface SkeletonProps {
  className?: string;
  key?: React.Key;
}

export function Shimmer({ className = '' }: SkeletonProps) {
  return <div aria-hidden="true" className={`skeleton-shimmer animate-pulse bg-surface-container-high rounded-lg ${className}`} />;
}

function SkeletonSectionTitle({ width = 'w-32' }: { width?: string }) {
  return <Shimmer className={`h-4 ${width}`} />;
}

function SkeletonAvatar({ size = 'w-10 h-10' }: { size?: string }) {
  return <Shimmer className={`${size} rounded-full shrink-0`} />;
}

function SkeletonText({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Shimmer key={index} className={`h-3 ${index === lines - 1 ? 'w-4/5' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function StorySkeleton() {
  return (
    <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 space-y-4">
      <SkeletonSectionTitle width="w-28" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex w-14 shrink-0 flex-col items-center gap-2">
            <SkeletonAvatar size="w-14 h-14" />
            <Shimmer className="h-2.5 w-11" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function PostSkeleton() {
  return (
    <article className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest">
      <div className="flex items-center gap-3 p-4">
        <SkeletonAvatar />
        <div className="min-w-0 flex-1 space-y-2">
          <Shimmer className="h-3 w-28" />
          <Shimmer className="h-2.5 w-20" />
        </div>
        <Shimmer className="h-8 w-8 rounded-full" />
      </div>
      <div className="space-y-2 px-4 pb-3">
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-3/5" />
      </div>
      <Shimmer className="aspect-square w-full rounded-none" />
      <div className="flex items-center justify-between p-4">
        <div className="flex gap-5"><Shimmer className="h-5 w-12" /><Shimmer className="h-5 w-12" /><Shimmer className="h-5 w-8" /></div>
        <Shimmer className="h-5 w-5 rounded-full" />
      </div>
    </article>
  );
}

export function ExploreSkeleton() {
  return (
    <div className="space-y-5 p-3 md:p-0">
      <div className="space-y-2"><SkeletonSectionTitle width="w-36" /><Shimmer className="h-3 w-56" /></div>
      <Shimmer className="h-11 w-full rounded-full" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => <Shimmer key={i} className="h-8 w-20 shrink-0 rounded-full" />)}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }).map((_, i) => <Shimmer key={i} className="aspect-square w-full rounded-md" />)}
      </div>
    </div>
  );
}

export function ReelsSkeleton() {
  return (
    <div className="relative mx-auto h-dvh w-full max-w-[520px] overflow-hidden bg-black">
      <div className="absolute inset-0 bg-white/[0.035] animate-pulse" />
      <div className="absolute left-5 right-5 top-14 flex justify-between"><Shimmer className="h-8 w-16 bg-white/10" /><Shimmer className="h-8 w-24 bg-white/10 rounded-full" /></div>
      <div className="absolute bottom-28 left-5 right-20 space-y-3">
        <div className="flex items-center gap-2"><SkeletonAvatar size="w-9 h-9" /><Shimmer className="h-3 w-28 bg-white/10" /></div>
        <Shimmer className="h-3 w-4/5 bg-white/10" /><Shimmer className="h-3 w-3/5 bg-white/10" />
      </div>
      <div className="absolute bottom-32 right-4 flex flex-col gap-5">
        {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-10 w-10 rounded-full bg-white/10" />)}
      </div>
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div className="grid h-[calc(100dvh-5rem)] grid-cols-1 overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest md:grid-cols-[300px_1fr]">
      <aside className="hidden border-r border-outline-variant/20 p-4 md:block">
        <div className="mb-5 flex items-center justify-between"><SkeletonSectionTitle width="w-24" /><Shimmer className="h-8 w-8 rounded-full" /></div>
        <Shimmer className="mb-4 h-10 w-full rounded-full" />
        <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex items-center gap-3"><SkeletonAvatar /><div className="flex-1 space-y-2"><Shimmer className="h-3 w-2/3" /><Shimmer className="h-2.5 w-full" /></div></div>)}</div>
      </aside>
      <div className="flex min-w-0 flex-col p-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4"><SkeletonAvatar /><div className="space-y-2"><Shimmer className="h-3 w-28" /><Shimmer className="h-2.5 w-16" /></div></div>
        <div className="flex-1 space-y-5 py-6">
          <div className="flex justify-start"><Shimmer className="h-12 w-3/5 rounded-2xl" /></div>
          <div className="flex justify-end"><Shimmer className="h-14 w-2/3 rounded-2xl" /></div>
          <div className="flex justify-start"><Shimmer className="h-10 w-1/2 rounded-2xl" /></div>
        </div>
        <Shimmer className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

export function InsightsSkeleton() {
  return (
    <div className="space-y-5">
      <SkeletonSectionTitle width="w-40" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 space-y-3"><Shimmer className="h-3 w-20" /><Shimmer className="h-7 w-24" /><Shimmer className="h-2.5 w-16" /></div>)}
      </div>
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 space-y-4"><Shimmer className="h-4 w-32" /><Shimmer className="h-48 w-full rounded-xl" /></div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <Shimmer className="h-40 w-full rounded-2xl md:h-56" />
      <div className="flex items-end gap-4 px-4">
        <SkeletonAvatar size="h-20 w-20" />
        <div className="flex-1 space-y-2 pb-1"><Shimmer className="h-4 w-36" /><Shimmer className="h-3 w-24" /></div>
        <Shimmer className="h-9 w-24 rounded-full" />
      </div>
      <SkeletonText lines={2} />
      <div className="grid grid-cols-3 gap-1.5">{Array.from({ length: 9 }).map((_, i) => <Shimmer key={i} className="aspect-square w-full rounded-md" />)}</div>
    </div>
  );
}

export function NotificationsSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonSectionTitle width="w-36" />
      {Array.from({ length: 7 }).map((_, i) => <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-3"><SkeletonAvatar size="w-11 h-11" /><div className="flex-1 space-y-2"><Shimmer className="h-3 w-3/4" /><Shimmer className="h-2.5 w-1/3" /></div><Shimmer className="h-10 w-10 rounded-lg" /></div>)}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="max-w-2xl space-y-5">
      <div className="space-y-2"><SkeletonSectionTitle width="w-32" /><Shimmer className="h-3 w-52" /></div>
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4"><Shimmer className="h-10 w-10 rounded-xl" /><div className="flex-1 space-y-2"><Shimmer className="h-3 w-28" /><Shimmer className="h-2.5 w-44" /></div><Shimmer className="h-4 w-4 rounded-full" /></div>)}
    </div>
  );
}

export function ChatSkeleton() {
  return <div className="flex items-center gap-3 rounded-xl px-3 py-3"><SkeletonAvatar size="w-11 h-11" /><div className="flex-1 space-y-2"><Shimmer className="h-3 w-1/3" /><Shimmer className="h-2.5 w-2/3" /></div></div>;
}

export function NotificationSkeleton() {
  return <div className="flex items-center gap-3 rounded-xl px-3 py-3"><SkeletonAvatar /><div className="flex-1 space-y-2"><Shimmer className="h-3 w-3/4" /><Shimmer className="h-2.5 w-1/3" /></div></div>;
}

export function GridSkeleton() {
  return <div className="grid grid-cols-3 gap-1.5">{Array.from({ length: 9 }).map((_, i) => <Shimmer key={i} className="aspect-square w-full rounded-md" />)}</div>;
}

export function ReelSkeleton() {
  return <div className="relative h-dvh w-full overflow-hidden bg-black"><Shimmer className="absolute inset-0 rounded-none bg-white/[0.035]" /><div className="absolute bottom-24 left-5 right-20 space-y-2"><Shimmer className="h-4 w-28 bg-white/10" /><Shimmer className="h-3 w-48 bg-white/10" /></div></div>;
}

export function CreateSkeleton() {
  return <div className="mx-auto max-w-2xl space-y-4"><SkeletonSectionTitle width="w-36" /><Shimmer className="aspect-square w-full rounded-2xl" /><Shimmer className="h-24 w-full rounded-xl" /><Shimmer className="h-11 w-full rounded-full" /></div>;
}

export function BookmarksSkeleton() {
  return <div className="space-y-4"><div className="flex items-center justify-between"><SkeletonSectionTitle width="w-28" /><Shimmer className="h-8 w-8 rounded-full" /></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Shimmer key={i} className="aspect-square w-full rounded-xl" />)}</div></div>;
}

interface SkeletonSystemProps {
  type: 'home' | 'explore' | 'create' | 'reels' | 'messages' | 'profile' | 'settings' | 'insights' | 'notifications' | 'bookmarks';
}

export default function SkeletonSystem({ type }: SkeletonSystemProps) {
  switch (type) {
    case 'home': return <div className="flex flex-col gap-5"><StorySkeleton /><PostSkeleton /><PostSkeleton /></div>;
    case 'explore': return <ExploreSkeleton />;
    case 'create': return <CreateSkeleton />;
    case 'reels': return <ReelsSkeleton />;
    case 'messages': return <MessagesSkeleton />;
    case 'profile': return <ProfileSkeleton />;
    case 'settings': return <SettingsSkeleton />;
    case 'insights': return <InsightsSkeleton />;
    case 'notifications': return <NotificationsSkeleton />;
    case 'bookmarks': return <BookmarksSkeleton />;
    default: return <div className="space-y-3"><Shimmer className="h-5 w-36" /><Shimmer className="h-12 w-full" /><Shimmer className="h-12 w-full" /></div>;
  }
}
