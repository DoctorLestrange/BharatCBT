import type { AccentColorId } from '../types/exam';

export interface AccentPreset {
  id: AccentColorId;
  name: string;
  description: string;
  swatchHex: string;
}

export const DEFAULT_ACCENT_COLOR: AccentColorId = 'blue';

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'blue',
    name: 'Classic CBT Blue',
    description: 'Default TCS iON / NTA blue',
    swatchHex: '#2563EB',
  },
  {
    id: 'orange',
    name: 'Saffron Orange',
    description: 'Vibrant saffron portal accent',
    swatchHex: '#EA580C',
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    description: 'Calm, high-readability green',
    swatchHex: '#059669',
  },
  {
    id: 'indigo',
    name: 'Royal Indigo',
    description: 'Deep academic indigo',
    swatchHex: '#4F46E5',
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'Modern rich violet',
    swatchHex: '#7C3AED',
  },
  {
    id: 'teal',
    name: 'Teal Cyan',
    description: 'Crisp ocean teal',
    swatchHex: '#0D9488',
  },
  {
    id: 'rose',
    name: 'Crimson Rose',
    description: 'Warm ruby crimson',
    swatchHex: '#E11D48',
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    description: 'Warm golden amber',
    swatchHex: '#D97706',
  },
];

export const VALID_ACCENT_IDS = new Set<AccentColorId>(ACCENT_PRESETS.map((p) => p.id));

export function isValidAccentColor(value: unknown): value is AccentColorId {
  return typeof value === 'string' && VALID_ACCENT_IDS.has(value as AccentColorId);
}
