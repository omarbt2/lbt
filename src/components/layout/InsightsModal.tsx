import { motion } from 'motion/react';

interface InsightsModalProps {
  postInsights: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    saves: number;
    reach: number;
  } | null;
  onClose: () => void;
}

export default function InsightsModal({ postInsights, onClose }: InsightsModalProps) {
  if (!postInsights) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60">
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        className="w-full bg-surface-container rounded-t-3xl p-6 space-y-4"
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />
        <h3 className="text-base font-bold text-on-surface text-center">Post Insights</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Likes', value: postInsights.likes, icon: '❤️' },
            { label: 'Comments', value: postInsights.comments, icon: '💬' },
            { label: 'Shares', value: postInsights.shares, icon: '↗️' },
            { label: 'Views', value: postInsights.views, icon: '👁️' },
            { label: 'Saves', value: postInsights.saves, icon: '🔖' },
            { label: 'Reach', value: postInsights.reach, icon: '📡' },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-container-highest rounded-2xl p-3 text-center">
              <div className="text-xl">{stat.icon}</div>
              <div className="text-lg font-black text-on-surface">{stat.value ?? 0}</div>
              <div className="text-[10px] text-outline font-semibold">{stat.label}</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full py-3 rounded-2xl border border-outline-variant/30 text-sm font-semibold text-on-surface">Close</button>
      </motion.div>
    </div>
  );
}
