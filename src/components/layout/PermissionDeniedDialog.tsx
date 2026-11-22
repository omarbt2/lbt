import { getPermissionDeniedMessage } from '../../lib/permissions';

interface PermissionDeniedDialogProps {
  type: 'camera' | 'microphone';
  onClose: () => void;
}

export default function PermissionDeniedDialog({ type, onClose }: PermissionDeniedDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto">
          {type === 'camera' ? (
            <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-error">
              <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 6.93z"/>
            </svg>
          )}
        </div>
        <h3 className="text-sm font-bold text-on-surface text-center">
          {getPermissionDeniedMessage(type)}
        </h3>
        <p className="text-xs text-on-surface-variant text-center">
          {type === 'camera'
            ? 'Camera access is needed to take photos and record stories.'
            : 'Microphone access is needed to record voice messages and make calls.'}
        </p>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold text-white bg-primary rounded-full hover:bg-primary/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
