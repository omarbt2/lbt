interface EditPostModalProps {
  editCaption: string;
  setEditCaption: (caption: string) => void;
  isSavingEdit: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export default function EditPostModal({ editCaption, setEditCaption, isSavingEdit, onSave, onCancel }: EditPostModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <h3 className="text-sm font-bold text-on-surface">Edit Post Caption</h3>
        <textarea
          value={editCaption}
          onChange={(e) => setEditCaption(e.target.value)}
          rows={4}
          className="w-full bg-surface-container rounded-xl px-4 py-3 text-xs text-on-surface outline-none resize-none border border-outline-variant/30 focus:border-primary"
          placeholder="Write a caption..."
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-on-surface-variant rounded-full hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!editCaption.trim() || isSavingEdit}
            className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-full disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {isSavingEdit ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
