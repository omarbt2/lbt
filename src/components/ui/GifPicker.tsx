import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Search, X } from 'lucide-react';

export interface GifResult {
  url: string;
  preview: string;
  title: string;
}

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gif: GifResult) => void;
}

const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY;

async function getTrendingGifs(): Promise<GifResult[]> {
  if (!GIPHY_KEY) return [];
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`
    );
    const data = await res.json();
    return (data.data || []).map((g: any) => ({
      url: g.images?.original?.url || '',
      preview: g.images?.fixed_width_small?.url || g.images?.fixed_width?.url || '',
      title: g.title || '',
    }));
  } catch {
    return [];
  }
}

async function searchGifs(query: string): Promise<GifResult[]> {
  if (!GIPHY_KEY || !query.trim()) return [];
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
    );
    const data = await res.json();
    return (data.data || []).map((g: any) => ({
      url: g.images?.original?.url || '',
      preview: g.images?.fixed_width_small?.url || g.images?.fixed_width?.url || '',
      title: g.title || '',
    }));
  } catch {
    return [];
  }
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-1.5 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-square bg-surface-container rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

export default function GifPicker({ isOpen, onClose, onSelect }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    const results = await getTrendingGifs();
    setGifs(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && !searchQuery) {
      loadTrending();
    }
  }, [isOpen, searchQuery, loadTrending]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      loadTrending();
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchGifs(value);
      setGifs(results);
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10 w-full max-w-lg bg-surface-container-lowest rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ height: '60dvh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/20">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search GIFs..."
              className="w-full bg-surface-container rounded-full py-2 pl-9 pr-4 text-xs outline-none text-on-surface placeholder:text-outline-variant"
            />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant"
            aria-label="Close GIF picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* GIF Grid */}
        <div className="overflow-y-auto h-[calc(60dvh-56px-32px)]">
          {loading ? (
            <SkeletonGrid />
          ) : gifs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-outline text-xs font-semibold">
              {searchQuery ? 'No GIFs found' : 'No GIFs available'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 p-2">
              {gifs.map((gif, i) => (
                <button
                  key={`${gif.url}-${i}`}
                  onClick={() => { onSelect(gif); onClose(); }}
                  className="relative aspect-square rounded-xl overflow-hidden bg-surface-container hover:ring-2 hover:ring-primary transition-all group"
                >
                  <img
                    src={gif.preview}
                    alt={gif.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GIPHY Attribution */}
        <div className="h-8 flex items-center justify-center border-t border-outline-variant/20 shrink-0">
          <span className="text-[9px] font-semibold text-outline">Powered by GIPHY</span>
        </div>
      </motion.div>
    </div>
  );
}
