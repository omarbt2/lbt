export interface EmojiItem {
  name: string;
  category: string;
  group: string;
  htmlCode: string[];
  unicode: string[];
  char: string;
}

let emojiCache: EmojiItem[] | null = null;

// BUG #10 FIX: the previous implementation set `el.innerHTML = code` to decode
// HTML entities. If the external API ever returned malicious markup (e.g.
// `<img src=x onerror=...>`) instead of a plain entity like `&#128512;`,
// the browser would parse/execute it as real DOM, creating an XSS vector.
// DOMParser with 'text/html' also parses markup, but by reading back
// `.body.textContent` from a *detached* document (never inserted into the
// live DOM and never rendered), any script/element tags are inert — only
// their text content is extracted, so no handlers can fire and nothing is
// rendered. This safely decodes entities like `&#128512;` -> 😀 without risk.
function decodeHtmlCode(code: string): string {
  try {
    const doc = new DOMParser().parseFromString(code, 'text/html');
    return doc.body.textContent ?? '';
  } catch {
    return '';
  }
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
