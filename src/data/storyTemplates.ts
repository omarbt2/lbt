export interface StoryTemplate {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  pattern?: 'dots' | 'lines' | 'waves' | 'none';
}

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'gradient-sunset',
    name: 'Sunset',
    emoji: '🌅',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 50%, #FFC857 100%)',
    pattern: 'none',
  },
  {
    id: 'gradient-ocean',
    name: 'Ocean',
    emoji: '🌊',
    gradient: 'linear-gradient(135deg, #667EEA 0%, #764BA2 50%, #F093FB 100%)',
    pattern: 'waves',
  },
  {
    id: 'gradient-forest',
    name: 'Forest',
    emoji: '🌲',
    gradient: 'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)',
    pattern: 'dots',
  },
  {
    id: 'gradient-cosmic',
    name: 'Cosmic',
    emoji: '🌌',
    gradient: 'linear-gradient(135deg, #0F0C29 0%, #302B63 50%, #24243E 100%)',
    pattern: 'dots',
  },
  {
    id: 'gradient-fire',
    name: 'Fire',
    emoji: '🔥',
    gradient: 'linear-gradient(135deg, #F12711 0%, #F5AF19 100%)',
    pattern: 'none',
  },
  {
    id: 'gradient-ice',
    name: 'Ice',
    emoji: '❄️',
    gradient: 'linear-gradient(135deg, #E0EAFC 0%, #CFDEF3 100%)',
    pattern: 'lines',
  },
  {
    id: 'gradient-candy',
    name: 'Candy',
    emoji: '🍬',
    gradient: 'linear-gradient(135deg, #FF9A9E 0%, #FAD0C4 50%, #FFDDE1 100%)',
    pattern: 'none',
  },
  {
    id: 'gradient-neon',
    name: 'Neon',
    emoji: '💜',
    gradient: 'linear-gradient(135deg, #FC5C7D 0%, #6A82FB 100%)',
    pattern: 'waves',
  },
];
