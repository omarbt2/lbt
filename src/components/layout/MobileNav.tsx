/* LBT mobile navigation — four destinations with Create centered between Explore and Reels. */
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home as HomeIcon, Compass, Plus, Film, MessageCircle, Zap, Image, Video, Camera
} from 'lucide-react';
import './MobileNav.css';

interface MobileNavProps {
  navVisible: boolean;
  unreadMessages: number;
  showCreateMenu: boolean;
  setShowCreateMenu: (show: boolean | ((prev: boolean) => boolean)) => void;
  setCreatePostType: (type: 'post' | 'reel') => void;
  setShowCreatePost: (show: boolean) => void;
  setShowNoteInput: (show: boolean) => void;
  setShowAddStoryModal: (show: boolean) => void;
}

export default function MobileNav({
  navVisible,
  unreadMessages,
  showCreateMenu,
  setShowCreateMenu,
  setCreatePostType,
  setShowCreatePost,
  setShowNoteInput,
  setShowAddStoryModal,
}: MobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => path === '/'
    ? location.pathname === '/'
    : location.pathname === path || location.pathname.startsWith(path + '/');

  const openCreate = (kind: 'post' | 'reel') => {
    setCreatePostType(kind);
    setShowCreateMenu(false);
    setShowCreatePost(true);
  };

  const renderNavItem = (path: string, label: string, Icon: typeof HomeIcon) => {
    const active = isActive(path);
    return (
      <button
        key={path}
        type="button"
        onClick={() => navigate(path)}
        className={`lbt-mobile-menu-item ${active ? 'active' : ''}`}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
      >
        <span className="lbt-mobile-menu-icon">
          <Icon aria-hidden="true" />
          {path === '/messages' && unreadMessages > 0 && (
            <span className="lbt-mobile-unread-badge">{unreadMessages > 99 ? '99+' : unreadMessages}</span>
          )}
        </span>
        <span>{label}</span>
      </button>
    );
  };

  return (
    <nav
      className={`lbt-mobile-nav md:hidden ${navVisible ? 'is-visible' : 'is-hidden'} ${showCreateMenu ? 'is-create-open' : ''}`}
      aria-label="Primary navigation"
    >
      <div className="lbt-mobile-nav-inner">
        <div className="lbt-mobile-menu">
          {renderNavItem('/', 'Home', HomeIcon)}
          {renderNavItem('/explore', 'Explore', Compass)}

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowCreateMenu((value) => !value)}
            className={`lbt-mobile-create-trigger ${showCreateMenu ? 'is-open' : ''}`}
            aria-label={showCreateMenu ? 'Close create menu' : 'Create'}
            aria-expanded={showCreateMenu}
            aria-haspopup="dialog"
          >
            <motion.span
              animate={{ rotate: showCreateMenu ? 45 : 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            >
              <Plus aria-hidden="true" />
            </motion.span>
          </motion.button>

          {renderNavItem('/reels', 'Reels', Film)}
          {renderNavItem('/messages', 'Messages', MessageCircle)}
        </div>

        <AnimatePresence>
          {showCreateMenu && (
            <>
              <motion.button
                type="button"
                aria-label="Close create menu"
                className="lbt-create-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCreateMenu(false)}
              />
              <motion.div
                className="lbt-create-popover"
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                role="dialog"
                aria-label="Create content"
              >
                <div className="lbt-create-popover-heading">Create something</div>
                <button type="button" aria-label="Create post" title="Post" onClick={() => openCreate('post')}>
                  <Image aria-hidden="true" /><span>Post</span>
                </button>
                <button type="button" aria-label="Create reel" title="Reel" onClick={() => openCreate('reel')}>
                  <Video aria-hidden="true" /><span>Reel</span>
                </button>
                <button type="button" aria-label="Create story" title="Story" onClick={() => { setShowCreateMenu(false); setShowAddStoryModal(true); }}>
                  <Camera aria-hidden="true" /><span>Story</span>
                </button>
                <button type="button" aria-label="Create note" title="Note" onClick={() => { setShowCreateMenu(false); setShowNoteInput(true); }}>
                  <Zap aria-hidden="true" /><span>Note</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
