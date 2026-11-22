/* From Uiverse.io by mymiamo - https://uiverse.io/mymiamo/yellow-rattlesnake-26
 * MIT License, Copyright (c) mymiamo (Eray Durupınar)
 * Adapted for LBT's four primary destinations; Create remains a separate central action.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home as HomeIcon, Compass, Plus, Film, MessageCircle, Zap, Image, Video, Camera
} from 'lucide-react';
import './MobileNav.css';

interface MobileNavProps {
  navVisible: boolean;
  isReelsPage: boolean;
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

  const navItems = [
    { path: '/', label: 'Home', Icon: HomeIcon },
    { path: '/explore', label: 'Explore', Icon: Compass },
    { path: '/reels', label: 'Reels', Icon: Film },
    { path: '/messages', label: 'Messages', Icon: MessageCircle },
  ];

  const openCreate = (kind: 'post' | 'reel') => {
    setCreatePostType(kind);
    setShowCreateMenu(false);
    setShowCreatePost(true);
  };

  return (
    <nav
      className={`lbt-mobile-nav md:hidden ${navVisible ? 'is-visible' : 'is-hidden'}`}
      aria-label="Primary navigation"
    >
      <div className="lbt-mobile-nav-inner">
        <div className="lbt-mobile-menu">
          {navItems.map(({ path, label, Icon }) => {
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
                    <span className="lbt-mobile-unread-badge">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCreateMenu((value) => !value)}
          className={`lbt-mobile-create-trigger ${showCreateMenu ? 'is-open' : ''}`}
          aria-label={showCreateMenu ? 'Close create menu' : 'Create'}
          aria-expanded={showCreateMenu}
        >
          <motion.span
            animate={{ rotate: showCreateMenu ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          >
            <Plus aria-hidden="true" />
          </motion.span>
        </motion.button>

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
                initial={{ opacity: 0, y: 12, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                role="group"
                aria-label="Create content"
              >
                <button type="button" onClick={() => openCreate('post')}>
                  <Image aria-hidden="true" /><span>Post</span>
                </button>
                <button type="button" onClick={() => openCreate('reel')}>
                  <Video aria-hidden="true" /><span>Reel</span>
                </button>
                <button type="button" onClick={() => { setShowCreateMenu(false); setShowAddStoryModal(true); }}>
                  <Camera aria-hidden="true" /><span>Story</span>
                </button>
                <button type="button" onClick={() => { setShowCreateMenu(false); setShowNoteInput(true); }}>
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
