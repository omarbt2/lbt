import { getDefaultAvatar } from '../../lib/defaultAvatars';

interface AvatarProps {
  src?: string | null;
  userId: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

export function Avatar({ src, userId, name, size = 'md', className }: AvatarProps) {
  return (
    <img
      src={src || getDefaultAvatar(userId)}
      onError={(e) => { e.currentTarget.src = getDefaultAvatar(userId); }}
      alt={name || 'User'}
      className={`${sizes[size]} rounded-full object-cover ${className || ''}`}
    />
  );
}
