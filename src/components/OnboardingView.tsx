import React, { useState, useRef } from 'react';
import { ChevronRight, Sparkles, Users, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingViewProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    icon: <Sparkles className="w-10 h-10 text-primary" />,
    title: 'Welcome to LBT',
    description: 'A creative social platform for designers and creators to share their work.',
    color: 'from-primary/20 to-primary/10',
  },
  {
    icon: <Users className="w-10 h-10 text-primary" />,
    title: 'Connect & Share',
    description: 'Follow creators, share posts, reels, and stories with your community.',
    color: 'from-primary/15 to-primary/10',
  },
  {
    icon: <Shield className="w-10 h-10 text-primary" />,
    title: 'You Control Privacy',
    description: 'Make your account private, control who follows you, and manage your data.',
    color: 'from-primary/10 to-primary/15',
  },
];

export default function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50 && currentSlide < SLIDES.length - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    } else if (diff < -50 && currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  };

  const goToSlide = (i: number) => {
    setDirection(i > currentSlide ? 1 : -1);
    setCurrentSlide(i);
  };

  const goNext = () => {
    setDirection(1);
    setCurrentSlide(prev => prev + 1);
  };

  const isLast = currentSlide === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-[200] bg-surface flex flex-col items-center justify-between select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 max-w-md w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col items-center"
          >
            <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${SLIDES[currentSlide].color} flex items-center justify-center mb-8`}>
              {SLIDES[currentSlide].icon}
            </div>
            <h2 className="text-xl font-black text-on-surface text-center mb-3">
              {SLIDES[currentSlide].title}
            </h2>
            <p className="text-sm text-on-surface-variant text-center leading-relaxed">
              {SLIDES[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="w-full max-w-md px-8 pb-12 space-y-6">
        {/* Dot indicators */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className="h-2 rounded-full overflow-hidden"
              style={{ width: i === currentSlide ? 24 : 8 }}
              aria-label={`Go to slide ${i + 1}`}
            >
              <motion.div
                className="h-full bg-primary rounded-full"
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                style={{ width: '100%' }}
              />
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {isLast ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onComplete}
              className="w-full bg-primary text-white font-bold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
            >
              Get Started <ChevronRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={goNext}
              className="w-full bg-primary text-white font-bold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}

          {!isLast && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onComplete}
              className="w-full text-on-surface-variant font-bold text-xs py-2 rounded-xl hover:bg-surface-container transition-colors"
            >
              Skip
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
