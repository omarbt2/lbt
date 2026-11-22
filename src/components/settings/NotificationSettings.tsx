import React from 'react';
import {
  Heart, MessageSquare, Mail, Star
} from 'lucide-react';

interface NotificationSettingsProps {
  notifLikes: boolean;
  notifComments: boolean;
  notifDMs: boolean;
  notifFollowers: boolean;
  toggleNotifLikes: () => void;
  toggleNotifComments: () => void;
  toggleNotifDMs: () => void;
  toggleNotifFollowers: () => void;
}

export default function NotificationSettings({
  notifLikes, notifComments, notifDMs, notifFollowers,
  toggleNotifLikes, toggleNotifComments, toggleNotifDMs, toggleNotifFollowers,
}: NotificationSettingsProps) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden animate-fadeIn">
      {[
        { label: 'Likes', icon: <Heart className="w-4 h-4 text-error" />, state: notifLikes, toggle: toggleNotifLikes },
        { label: 'Comments', icon: <MessageSquare className="w-4 h-4 text-primary" />, state: notifComments, toggle: toggleNotifComments },
        { label: 'Direct Messages', icon: <Mail className="w-4 h-4 text-on-surface" />, state: notifDMs, toggle: toggleNotifDMs },
        { label: 'New Followers', icon: <Star className="w-4 h-4 text-on-surface-variant" />, state: notifFollowers, toggle: toggleNotifFollowers },
      ].map((item, i) => (
        <div key={i} onClick={item.toggle}
          className={`flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container/30 transition-all ${i > 0 ? 'border-t border-outline-variant/10' : ''}`}>
          <div className="flex items-center gap-3">
            {item.icon}
            <span className="text-xs font-bold text-on-surface">{item.label}</span>
          </div>
          <div className={`w-10 h-5.5 rounded-full p-0.5 transition-all ${item.state ? 'bg-primary' : 'bg-outline-variant'}`}>
            <div className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-all ${item.state ? 'translate-x-[18px]' : ''}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
