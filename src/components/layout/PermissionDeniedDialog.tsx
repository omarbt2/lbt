import { Camera, Mic } from 'lucide-react';
import { getPermissionDeniedMessage } from '../../lib/permissions';

interface PermissionDeniedDialogProps {
  type: 'camera' | 'microphone';
  onClose: () => void;
}

export default function PermissionDeniedDialog({ type, onClose }: PermissionDeniedDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          {type === 'camera' ? <Camera className="h-6 w-6" strokeWidth={1.9} /> : <Mic className="h-6 w-6" strokeWidth={1.9} />}
        </div>
        <h3 className="text-sm font-bold text-on-surface text-center">
          {getPermissionDeniedMessage(type)}
        </h3>
        <p className="text-xs text-on-surface-variant text-center">
          {type === 'camera'
            ? 'Allow camera access in your device settings, then try taking a photo again.'
            : 'Allow LBT to use your microphone in Android app permissions or browser settings, then try recording again. LBT uses it only for voice messages.'}
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
