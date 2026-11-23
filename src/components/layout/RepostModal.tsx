import { motion } from 'motion/react';
import { Repeat2, X } from 'lucide-react';

interface RepostModalProps {
  repostTargetPost: any;
  repostCaption: string;
  setRepostCaption: (caption: string) => void;
  isReposting: boolean;
  onRepost: () => void;
  onClose: () => void;
}

export default function RepostModal({ repostTargetPost, repostCaption, setRepostCaption, isReposting, onRepost, onClose }: RepostModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 md:items-center" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-md max-h-[85dvh] overflow-y-auto bg-surface-container rounded-t-3xl p-6 space-y-4 md:rounded-3xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
            <Repeat2 className="w-5 h-5 text-primary" /> Repost
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-surface-container-highest rounded-2xl p-4 border border-outline-variant/30">
          <div className="flex items-center gap-2 mb-2">
            <img src={repostTargetPost.user?.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
            <span className="text-xs font-bold text-on-surface">{repostTargetPost.user?.name}</span>
          </div>
          {repostTargetPost.imageUrl && (
            <img src={repostTargetPost.imageUrl} alt="" className="w-full aspect-video object-cover rounded-xl mb-2" />
          )}
          <p className="text-xs text-on-surface-variant line-clamp-2">{repostTargetPost.caption}</p>
        </div>
        <textarea
          value={repostCaption}
          onChange={e => setRepostCaption(e.target.value)}
          rows={3}
          maxLength={2200}
          placeholder="Add a caption (optional)"
          className="w-full bg-surface-container-highest rounded-2xl px-4 py-3 text-xs text-on-surface outline-none resize-none border border-outline-variant/30 focus:border-primary"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-outline-variant/30 text-on-surface font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onRepost}
            disabled={isReposting}
            className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isReposting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Repeat2 className="w-4 h-4" />
                Repost
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
