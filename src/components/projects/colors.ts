// src/components/projects/colors.ts
// Apple-inspired hierarchical color system
// Colors are auto-assigned by index — no user selection needed

// ── Milestone palette: bold, saturated Apple system colors ──
// Each milestone gets the next color in rotation
export const MILESTONE_PALETTE = [
  { bg: '#007AFF', label: 'Blue' },      // iOS Blue
  { bg: '#34C759', label: 'Green' },      // iOS Green
  { bg: '#FF9500', label: 'Orange' },     // iOS Orange
  { bg: '#AF52DE', label: 'Purple' },     // iOS Purple
  { bg: '#FF2D55', label: 'Pink' },       // iOS Pink
  { bg: '#5AC8FA', label: 'Teal' },       // iOS Teal
  { bg: '#FF3B30', label: 'Red' },        // iOS Red
  { bg: '#FFCC00', label: 'Yellow' },     // iOS Yellow
]

// ── Activity shades: lighter tints derived from parent milestone color ──
// Each activity under a milestone gets progressively lighter/shifted hues
const ACTIVITY_TINTS: Record<string, string[]> = {
  '#007AFF': ['#3395FF', '#66B0FF', '#99CAFF', '#CCE5FF', '#4DA3FF', '#80BDFF'],
  '#34C759': ['#5DD47A', '#86E09B', '#AEEDBC', '#D7F9DD', '#4ACF6B', '#73DB8D'],
  '#FF9500': ['#FFAA33', '#FFBF66', '#FFD599', '#FFEACC', '#FFB14D', '#FFC780'],
  '#AF52DE': ['#BF75E5', '#CF98EB', '#DFBBF2', '#EFDEF8', '#C064E8', '#D087EE'],
  '#FF2D55': ['#FF5777', '#FF8199', '#FFABBB', '#FFD5DD', '#FF4466', '#FF6E88'],
  '#5AC8FA': ['#7BD3FB', '#9BDEFC', '#BCE9FD', '#DCF4FE', '#6BCEFB', '#8CD9FC'],
  '#FF3B30': ['#FF6259', '#FF8982', '#FFB0AB', '#FFD7D4', '#FF4E44', '#FF756B'],
  '#FFCC00': ['#FFD633', '#FFE066', '#FFEB99', '#FFF5CC', '#FFDB4D', '#FFE580'],
}

/** Get milestone color by its index in the project */
export function getMilestoneColor(milestoneIndex: number): string {
  return MILESTONE_PALETTE[milestoneIndex % MILESTONE_PALETTE.length].bg
}

/** Get activity color by milestone color + activity index within that milestone */
export function getActivityColor(milestoneColor: string, activityIndex: number): string {
  const tints = ACTIVITY_TINTS[milestoneColor]
  if (!tints) return milestoneColor
  return tints[activityIndex % tints.length]
}

// ── Default emoji sets for milestones and activities ──
export const DEFAULT_MILESTONE_ICONS = ['🎯', '🏗️', '📋', '🚀', '✅', '📦', '🔧', '🎛️']
export const DEFAULT_ACTIVITY_ICONS = ['📝', '⚙️', '🔨', '📐', '🧪', '📊', '🗓️', '💼']

/** Get a default icon for a milestone by index */
export function getDefaultMilestoneIcon(index: number): string {
  return DEFAULT_MILESTONE_ICONS[index % DEFAULT_MILESTONE_ICONS.length]
}

/** Get a default icon for an activity by index */
export function getDefaultActivityIcon(index: number): string {
  return DEFAULT_ACTIVITY_ICONS[index % DEFAULT_ACTIVITY_ICONS.length]
}

// Legacy exports for backwards compat (used nowhere now, safe to remove later)
export const PROJECT_COLORS = MILESTONE_PALETTE.map(p => p.bg)
export const MILESTONE_COLORS = MILESTONE_PALETTE.map(p => p.bg)
export const ACTIVITY_COLORS = MILESTONE_PALETTE.map(p => p.bg)
export function getColor(palette: string[], index: number): string {
  return palette[index % palette.length]
}
