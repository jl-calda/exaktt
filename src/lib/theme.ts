// src/lib/theme.ts

export type ThemeId = 'default' | 'amber' | 'ocean' | 'rose'
export type ThemeMode = 'light' | 'dark'

export interface ThemePreset {
  id:          ThemeId
  name:        string
  description: string
  accent:      string   // preview swatch colour
  surface:     string   // preview bg colour
  border:      string   // preview border
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id:          'default',
    name:        'Zinc',
    description: 'Clean neutral grays with an emerald accent',
    accent:      '#34c759',
    surface:     '#f4f4f5',
    border:      '#d1d1d6',
  },
  {
    id:          'amber',
    name:        'Amber',
    description: 'Warm cream tones with a gold accent',
    accent:      '#c9a225',
    surface:     '#f6f3ee',
    border:      '#cec5b8',
  },
  {
    id:          'ocean',
    name:        'Ocean',
    description: 'Cool slate tones with a blue accent',
    accent:      '#2563eb',
    surface:     '#f8fafc',
    border:      '#cbd5e1',
  },
  {
    id:          'rose',
    name:        'Rose',
    description: 'Minimal white with a rose accent',
    accent:      '#e11d48',
    surface:     '#fafafa',
    border:      '#d1d1d6',
  },
]

export const THEME_STORAGE_KEY  = 'exakt-theme'
export const DARK_STORAGE_KEY   = 'exakt-dark'
