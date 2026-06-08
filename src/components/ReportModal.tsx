import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { reportContent, REPORT_REASONS, type ReportType } from '../lib/api/reports';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedId: string;
  reportType: ReportType;
  reporterId: string;
  onSuccess?: () => void;
}

export default function ReportModal({ isOpen, onClose, reportedId, reportType, reporterId, onSuccess }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setIsSubmitting(true);
    try {
      await reportContent(reportedId, reportType, selectedReason, reporterId);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setSelectedReason(null);
        onSuccess?.();
      }, 1500);
    } catch {
      // silently fail
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-[80]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[90] bg-surface-container-lowest rounded-t-3xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-outline-variant/50" />
            </div>

            <div className="px-5 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-on-surface">Report {reportType}</h3>
                <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-full">
                  <X className="w-4 h-4 text-on-surface-variant" />
                </button>
              </div>

              {submitted ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-primary text-lg">✓</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface">Report submitted</p>
                  <p className="text-xs text-outline mt-1">Thank you for helping keep LBT safe</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-on-surface-variant mb-3">Why are you reporting this?</p>
                  <div className="flex flex-col gap-1.5 mb-4">
                    {REPORT_REASONS.map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setSelectedReason(reason)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold transition-all ${
                          selectedReason === reason
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-on-surface hover:bg-surface-container/50 border border-transparent'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedReason === reason ? 'border-primary' : 'border-outline-variant'
                        }`}>
                          {selectedReason === reason && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        {reason}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!selectedReason || isSubmitting}
                    className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
