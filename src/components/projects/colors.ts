// src/components/projects/colors.ts
// 8 curated Apple-style color combos that cycle
export const PROJECT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b']
export const MILESTONE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#64748b']
export const ACTIVITY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b']

// Get next color in rotation based on index
export function getColor(palette: string[], index: number): string {
  return palette[index % palette.length]
}
