import { supabase } from '../supabase';

export interface LinkPreviewData {
  url: string;
  title: string;
  description: string;
  image: string | null;
}

export async function getLinkPreview(url: string): Promise<LinkPreviewData | null> {
  try {
    const { data: cached } = await (supabase as any)
      .from('link_previews')
      .select('*')
      .eq('url', url)
      .maybeSingle();

    if (cached) return { url: cached.url, title: cached.title, description: cached.description, image: cached.image };

    const res = await fetch(`https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    const preview: LinkPreviewData = {
      url: data.url || url,
      title: data.title || '',
      description: data.description || '',
      image: data.images?.[0] || null,
    };

    try {
      await (supabase as any).rpc('cache_link_preview', {
        p_url: url,
        p_title: preview.title,
        p_description: preview.description,
        p_image: preview.image,
      });
    } catch {}

    return preview;
  } catch {
    return null;
  }
}

export function extractUrls(text: string): string[] {
  const regex = /https?:\/\/[^\s]+/g;
  return text.match(regex) ?? [];
}
