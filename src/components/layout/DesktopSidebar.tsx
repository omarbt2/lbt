import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Home as HomeIcon, Compass, Plus, Film, MessageCircle, BarChart3, Bell, User as UserIcon,
  Settings as SettingsIcon, LogOut, Bookmark, Moon, Sun
} from 'lucide-react';
import { Notification } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface DesktopSidebarProps {
  liveNotifications: Notification[];
  darkMode: boolean;
  toggleDarkMode: () => void;
  setShowCreateMenu: (show: boolean) => void;
  triggerToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const navItems = [
  { path: '/', icon: HomeIcon, label: 'Home Feed' },
  { path: '/explore', icon: Compass, label: 'Explore Designs' },
  { path: '/reels', icon: Film, label: 'Cinematic Reels' },
  { path: '/messages', icon: MessageCircle, label: 'Messaging DM' },
  { path: '/insights', icon: BarChart3, label: 'Insights & Graph' },
  { path: '/notifications', icon: Bell, label: 'Notifications', hasBadge: true },
  { path: '/bookmarks', icon: Bookmark, label: 'Saved Posts' },
  { path: '/profile/me', icon: UserIcon, label: 'My Profile' },
  { path: '/settings', icon: SettingsIcon, label: 'Settings' },
];

function SidebarTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tooltip">
      {children}
      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 z-50 shadow-xl">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900 dark:border-r-zinc-800" />
      </div>
    </div>
  );
}

export default function DesktopSidebar({ liveNotifications, darkMode, toggleDarkMode, setShowCreateMenu, triggerToast }: DesktopSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <aside className="hidden md:flex flex-col h-screen sticky top-0 w-16 lg:w-64 border-r border-outline-variant/10 bg-surface-container-lowest dark:bg-surface-container-lowest p-2 lg:p-4 justify-between select-none shrink-0 overflow-clip z-30 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]" id="desktop_sidebar">
      <div className="flex flex-col gap-2 lg:gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer px-2 py-2 rounded-2xl hover:bg-surface-container dark:hover:bg-surface-container-high/50 transition-colors" onClick={() => navigate('/')}>
          <img
            src="/logo.png"
            alt="LBT Social"
            className="h-10 w-10 object-contain rounded-2xl shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/web/icon-192.png';
            }}
          />
          <div className="hidden lg:block">
            <h1 className="text-base font-black tracking-tight text-on-surface leading-none">LBT Social</h1>
            <p className="text-[10px] font-semibold text-on-surface-variant mt-0.5">Studio Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-0.5 text-xs py-2">
          {/* Create button */}
          <SidebarTooltip label="Create New">
            <button
              onClick={() => setShowCreateMenu(true)}
              className="mx-0 mb-2 flex items-center gap-3 bg-primary text-white rounded-2xl px-3 py-3 font-bold text-sm hover:bg-primary/90 transition-all active:scale-[0.96] min-h-[44px]"
            >
              <Plus className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block">Create</span>
            </button>
          </SidebarTooltip>

          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            const unreadCount = item.hasBadge
              ? liveNotifications.filter(n => n.isUnread).length
              : 0;
            const hasUnread = item.hasBadge && unreadCount > 0;

            return (
              <SidebarTooltip key={item.path} label={item.label}>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => navigate(item.path)}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`flex items-center gap-3 w-full px-3 py-3 rounded-2xl font-bold transition-all min-h-[44px] relative ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container dark:hover:bg-surface-container-high/50 hover:text-on-surface'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5 shrink-0" />
                    {hasUnread && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-error rounded-full flex items-center justify-center"
                      >
                        <span className="text-[7px] font-bold text-white leading-none">
                          {unreadCount > 9 ? '9' : unreadCount}
                        </span>
                      </motion.span>
                    )}
                  </div>
                  <span className="hidden lg:block text-sm">{item.label}</span>
                </motion.button>
              </SidebarTooltip>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-1 border-t border-outline-variant/10 pt-3 text-xs font-bold text-on-surface-variant">
        <SidebarTooltip label={darkMode ? 'Light Theme' : 'Dark Theme'}>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={toggleDarkMode}
            className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-surface-container dark:hover:bg-surface-container-high/50 transition-all select-none min-h-[44px]"
          >
            <motion.div
              key={darkMode ? 'sun' : 'moon'}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {darkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            </motion.div>
            <span className="hidden lg:block text-sm">{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
          </motion.button>
        </SidebarTooltip>

        <SidebarTooltip label="Log Out">
          <motion.button
            whileTap={{ scale: 0.94 }}
          onClick={() => {
            useAuthStore.getState().logout();
            triggerToast('Logged out successfully');
          }}
            className="flex items-center gap-3 px-3 py-3 rounded-2xl text-error hover:bg-error/5 transition-all min-h-[44px]"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="hidden lg:block text-sm">Log out</span>
          </motion.button>
        </SidebarTooltip>
      </div>
    </aside>
  );
}
