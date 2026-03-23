// src/lib/engine/segments.ts
import type { Segment } from '@/types'

export const SEGMENT_TYPES = [
  { value: 'end_end',    label: 'End → End',    ends: 2, corners: 0, color: '#0369a1' },
  { value: 'end_corner', label: 'End → Corner', ends: 1, corners: 1, color: '#7c3aed' },
  { value: 'corner_corner', label: 'Corner → Corner', ends: 0, corners: 2, color: '#9333ea' },
  { value: 'loop',       label: 'Loop',          ends: 0, corners: 0, color: '#059669' },
]

export interface ResolvedSegments {
  length:  number
  ends:    number
  corners: number
}

export function resolveSegments(segments: Segment[]): ResolvedSegments {
  return {
    length:  segments.reduce((a, s) => a + (parseFloat(s.length as any) || 0), 0),
    ends:    segments.reduce((a, s) => a + (SEGMENT_TYPES.find(t => t.value === s.type)?.ends    ?? 0), 0),
    corners: segments.reduce((a, s) => a + (SEGMENT_TYPES.find(t => t.value === s.type)?.corners ?? 0), 0),
  }
}
