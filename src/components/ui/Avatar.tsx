import { useState } from 'react';
import { getDefaultAvatar } from '../../lib/defaultAvatars';

interface AvatarProps {
  src?: string | null;
  userId: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-14 h-14 text-sm',
  xl: 'w-20 h-20 text-base',
};

const BG_COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-green-600',
  'bg-orange-600', 'bg-teal-600', 'bg-indigo-600', 'bg-rose-600',
];

function getColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
}

function getInitial(name?: string, userId?: string): string {
  const source = name || userId || '?';
  return source.charAt(0).toUpperCase();
}

export function Avatar({ src, userId, name, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(!!src);
  const showFallback = imgError || !src;

  const sizeClasses = sizes[size];
  const initial = getInitial(name, userId);
  const bgColor = getColorFromId(userId);

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 ${sizeClasses.split(' ')[0]} ${sizeClasses.split(' ')[1]} ${className || ''}`}
    >
      {!showFallback && (
        <>
          {imgLoading && (
            <div className={`absolute inset-0 ${bgColor} animate-pulse`} />
          )}
          <img
            src={src || getDefaultAvatar(userId)}
            alt={name || 'User'}
            loading="lazy"
            onLoad={() => setImgLoading(false)}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover rounded-full"
          />
        </>
      )}
      {showFallback && (
        <div className={`w-full h-full flex items-center justify-center rounded-full ${bgColor} font-bold text-white select-none ${sizeClasses.split(' ').slice(2).join(' ')}`}>
          {initial}
        </div>
      )}
    </div>
  );
}
