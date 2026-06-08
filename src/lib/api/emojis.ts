export interface EmojiItem {
  name: string;
  category: string;
  group: string;
  htmlCode: string[];
  unicode: string[];
  char: string;
}

let emojiCache: EmojiItem[] | null = null;

function decodeHtmlCode(code: string): string {
  const el = document.createElement('textarea');
  el.innerHTML = code;
  return el.value;
}

export async function getAllEmojis(): Promise<EmojiItem[]> {
  if (emojiCache) return emojiCache;
  try {
    const res = await fetch('https://emojihub.yurace.pro/api/all');
    const data: Omit<EmojiItem, 'char'>[] = await res.json();
    emojiCache = data.map(e => ({
      ...e,
      char: e.htmlCode[0] ? decodeHtmlCode(e.htmlCode[0]) : '',
    }));
    return emojiCache;
  } catch {
    return [];
  }
}

export function getEmojisByCategory(emojis: EmojiItem[], category: string): EmojiItem[] {
  return emojis.filter(e => e.category === category);
}

export const EMOJI_CATEGORIES = [
  'smileys and people',
  'animals and nature',
  'food and drink',
  'activities',
  'objects',
  'symbols',
  'flags',
];

export const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍', '🔥', '🎉'];
