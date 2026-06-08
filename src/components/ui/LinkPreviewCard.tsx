import React, { useState, useEffect, memo } from 'react';
import { getLinkPreview } from '../../lib/api/linkPreview';
import type { LinkPreviewData } from '../../lib/api/linkPreview';

interface LinkPreviewCardProps {
  url: string;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-outline-variant/30 bg-surface-container p-3 flex gap-3 max-w-[280px]">
      <div className="w-16 h-16 rounded-xl bg-surface-container-high animate-pulse shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3 bg-surface-container-high rounded animate-pulse w-3/4" />
        <div className="h-2.5 bg-surface-container-high rounded animate-pulse w-full" />
        <div className="h-2.5 bg-surface-container-high rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}

function LinkPreviewCard({ url }: LinkPreviewCardProps) {
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getLinkPreview(url).then(result => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [url]);

  if (loading) return <SkeletonCard />;
  if (!data) return null;

  const domain = (() => {
    try { return new URL(data.url).hostname.replace('www.', ''); } catch { return data.url; }
  })();

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="block rounded-2xl border border-outline-variant/30 bg-surface-container p-3 flex gap-3 max-w-[280px] hover:bg-surface-container-high transition-colors"
    >
      {data.image && (
        <img
          src={data.image}
          alt=""
          className="w-16 h-16 rounded-xl object-cover shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-on-surface truncate">{data.title || data.url}</p>
        {data.description && (
          <p className="text-[9px] text-on-surface-variant line-clamp-2 mt-0.5">{data.description}</p>
        )}
        <p className="text-[8px] text-outline mt-1 font-semibold uppercase tracking-wider">{domain}</p>
      </div>
    </a>
  );
}

export default memo(LinkPreviewCard);
