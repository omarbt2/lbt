import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Home as HomeIcon, Compass, Plus, Film, MessageCircle, Zap, Image, Video } from 'lucide-react';

interface MobileNavProps {
  navVisible: boolean;
  isReelsPage: boolean;
  unreadMessages: number;
  showCreateMenu: boolean;
  setShowCreateMenu: (show: boolean | ((prev: boolean) => boolean)) => void;
  setCreatePostType: (type: 'post' | 'reel') => void;
  setShowCreatePost: (show: boolean) => void;
  setShowNoteInput: (show: boolean) => void;
}

export default function MobileNav({ navVisible, isReelsPage, unreadMessages, showCreateMenu, setShowCreateMenu, setCreatePostType, setShowCreatePost, setShowNoteInput }: MobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const navButtonClass = (path: string) =>
    `flex flex-col items-center justify-center rounded-2xl min-w-[48px] min-h-[48px] relative transition-all duration-200 ${
      isActive(path)
        ? 'text-on-surface font-bold'
        : 'text-on-surface-variant/70 hover:text-on-surface-variant'
    }`;

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 w-full bg-surface-container-lowest/80 dark:bg-surface-container-low/80 backdrop-blur-3xl border-t border-outline-variant/10 flex justify-around items-center px-3 select-none transition-transform duration-300 ease-in-out ${
        !navVisible || isReelsPage ? 'translate-y-full' : 'translate-y-0'
      }`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)', minHeight: '58px' }}
    >
      {/* Home */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => navigate('/')}
        className={navButtonClass('/')}
      >
        <HomeIcon className={`w-[22px] h-[22px] ${isActive('/') ? 'fill-on-surface' : ''}`} strokeWidth={isActive('/') ? 2.5 : 2} />
        {isActive('/') && (
          <motion.div
            layoutId="nav-active-dot"
            className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-on-surface"
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
        )}
      </motion.button>

      {/* Explore */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => navigate('/explore')}
        className={navButtonClass('/explore')}
      >
        <Compass className={`w-[22px] h-[22px] ${isActive('/explore') ? 'fill-on-surface' : ''}`} strokeWidth={isActive('/explore') ? 2.5 : 2} />
        {isActive('/explore') && (
          <motion.div
            layoutId="nav-active-dot"
            className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-on-surface"
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
        )}
      </motion.button>

      {/* Center — Create button */}
      <div className="relative flex items-center justify-center -mt-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCreateMenu((v) => !v)}
          className={`w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
            showCreateMenu
              ? 'bg-primary shadow-primary/30 rotate-90'
              : 'bg-primary shadow-primary/30'
          }`}
        >
          <motion.div animate={{ rotate: showCreateMenu ? 45 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            {showCreateMenu ? (
              <span className="text-white text-2xl font-light leading-none">×</span>
            ) : (
              <Plus className="text-white w-6 h-6" strokeWidth={2.5} />
            )}
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {showCreateMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                onClick={() => setShowCreateMenu(false)}
              />

              {/* Post */}
              <motion.button
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: 1, y: -80, scale: 1 }}
                exit={{ opacity: 0, y: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28, delay: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setCreatePostType('post'); setShowCreateMenu(false); setShowCreatePost(true); }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[52px] h-[52px] rounded-full bg-white dark:bg-surface-container-high border border-outline-variant/20 shadow-xl flex flex-col items-center justify-center z-50"
              >
                <Image className="w-5 h-5 text-primary" strokeWidth={2} />
              </motion.button>

              {/* Reel */}
              <motion.button
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: 1, x: -72, y: -56, scale: 1 }}
                exit={{ opacity: 0, y: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28, delay: 0.04 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setCreatePostType('reel'); setShowCreateMenu(false); setShowCreatePost(true); }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[52px] h-[52px] rounded-full bg-white dark:bg-surface-container-high border border-outline-variant/20 shadow-xl flex flex-col items-center justify-center z-50"
              >
                <Video className="w-5 h-5 text-primary" strokeWidth={2} />
              </motion.button>

              {/* Note */}
              <motion.button
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: 1, x: 72, y: -56, scale: 1 }}
                exit={{ opacity: 0, y: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28, delay: 0.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setShowCreateMenu(false); setShowNoteInput(true); }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[52px] h-[52px] rounded-full bg-white dark:bg-surface-container-high border border-outline-variant/20 shadow-xl flex flex-col items-center justify-center z-50"
              >
                <Zap className="w-5 h-5 text-amber-500" strokeWidth={2.5} />
              </motion.button>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Reels */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => navigate('/reels')}
        className={navButtonClass('/reels')}
      >
        <Film className={`w-[22px] h-[22px] ${isActive('/reels') ? 'fill-on-surface' : ''}`} strokeWidth={isActive('/reels') ? 2.5 : 2} />
        {isActive('/reels') && (
          <motion.div
            layoutId="nav-active-dot"
            className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-on-surface"
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
        )}
      </motion.button>

      {/* Messages */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => navigate('/messages')}
        className={navButtonClass('/messages')}
      >
        <div className="relative">
          <MessageCircle className={`w-[22px] h-[22px] ${isActive('/messages') ? 'fill-on-surface' : ''}`} strokeWidth={isActive('/messages') ? 2.5 : 2} />
          {unreadMessages > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none px-1"
            >
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </motion.span>
          )}
        </div>
        {isActive('/messages') && (
          <motion.div
            layoutId="nav-active-dot"
            className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-on-surface"
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
        )}
      </motion.button>
    </nav>
  );
}
