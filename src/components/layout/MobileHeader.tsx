import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Settings as SettingsIcon, ChevronLeft } from 'lucide-react';
import { Notification } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../ui/Avatar';

interface MobileHeaderProps {
  liveNotifications: Notification[];
  currentUser: { id: string; avatar: string };
  headerVisible: boolean;
  isReelsPage: boolean;
}

const ROUTE_DEPTH: Record<string, number> = {
  '/': 0,
  '/explore': 0,
  '/reels': 0,
  '/messages': 0,
  '/notifications': 0,
  '/bookmarks': 0,
  '/settings': 0,
};

export default function MobileHeader({ liveNotifications, currentUser, headerVisible, isReelsPage }: MobileHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const depth = ROUTE_DEPTH[location.pathname];
  const isDeepNavigation = depth === undefined && location.pathname !== '/';

  const canGoBack = isDeepNavigation;
  const pageTitle = isDeepNavigation
    ? location.pathname.includes('/profile/') ? 'Profile'
      : location.pathname.includes('/post/') ? 'Post'
      : location.pathname.includes('/hashtag/') ? 'Hashtag'
      : location.pathname.includes('/close-friends') ? 'Close Friends'
      : location.pathname.includes('/edit-profile') ? 'Edit Profile'
      : location.pathname.includes('/insights') ? 'Insights'
      : 'Back'
    : null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 bg-surface-container-lowest/95 dark:bg-surface-container-low/95 backdrop-blur-xl border-b border-outline-variant/5 flex md:hidden items-center justify-between transition-all duration-300 ease-in-out ${
        !headerVisible || isReelsPage ? '-translate-y-full' : 'translate-y-0'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(4rem + env(safe-area-inset-top, 0px))' }}
    >
      <div className="flex items-center min-w-0 flex-1 h-16 px-4">
        {canGoBack ? (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 -ml-1 mr-2 min-w-[44px] min-h-[44px] justify-center rounded-xl hover:bg-surface-container dark:hover:bg-surface-container-high/50 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-on-surface" />
          </motion.button>
        ) : null}
        {isDeepNavigation ? (
          <span className="text-base font-bold text-on-surface truncate">{pageTitle}</span>
        ) : (
          <motion.div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer"
            whileTap={{ scale: 0.96 }}
          >
            <img
              src="/logo.png"
              alt="LBT Social"
              className="h-8 md:h-10 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/web/icon-192.png';
              }}
            />
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-1 h-16 pr-4">
        {isDeepNavigation ? (
          <motion.div whileTap={{ scale: 0.9 }} onClick={() => navigate('/profile/' + currentUser.id)}>
            <Avatar
              src={currentUser.avatar}
              userId={currentUser.id}
              name="My Profile"
              size="sm"
              className="cursor-pointer hover:border-primary transition-all duration-300 border border-outline-variant/30"
            />
          </motion.div>
        ) : (
          <>
            <motion.div
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/notifications')}
              className="relative p-2.5 hover:bg-surface-container dark:hover:bg-surface-container-high/50 rounded-xl transition-all cursor-pointer text-on-surface-variant hover:text-on-surface"
            >
              <Bell className="w-5 h-5" />
              {liveNotifications.some((n) => n.isUnread) && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-error ring-2 ring-surface-container-lowest animate-pulse-glow"
                />
              )}
            </motion.div>

            <motion.div
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/settings')}
              className="p-2.5 hover:bg-surface-container dark:hover:bg-surface-container-high/50 rounded-xl transition-all cursor-pointer text-on-surface-variant hover:text-on-surface"
            >
              <SettingsIcon className="w-5 h-5" />
            </motion.div>

            <motion.div whileTap={{ scale: 0.9 }} onClick={() => navigate('/profile/' + currentUser.id)}>
              <Avatar
                src={currentUser.avatar}
                userId={currentUser.id}
                name="My Profile"
                size="sm"
                className="cursor-pointer hover:border-primary transition-all duration-300 border border-outline-variant/30"
              />
            </motion.div>
          </>
        )}
      </div>
    </header>
  );
}
