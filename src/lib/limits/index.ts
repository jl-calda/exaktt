// src/lib/limits/index.ts
// Plan limits — enforced server-side on every mutating API call

import type { Plan } from '@prisma/client'

export interface PlanLimits {
  maxSystems:       number   // -1 = unlimited
  maxMaterials:     number   // per system
  maxRuns:          number   // per job
  maxJobs:          number   // saved jobs total
  maxJobsSaved:     number   // alias for maxJobs
  maxLibraryItems:  number
  maxSeats:         number   // team members per company
  canUsePricing:    boolean
  canBrandReports:  boolean
  canShareReports:  boolean
  canUseTags:       boolean
  reportsWatermark: boolean
  // short aliases used in components
  stockInfo:        boolean  // stock lengths + supplier info (Pro)
  pricing:          boolean  // unit pricing (Pro)
  tags:             boolean  // global tags (Pro)
  customDims:       boolean  // custom dims + variants (Pro)
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxSystems:      1,
    maxMaterials:    5,
    maxRuns:         1,
    maxJobs:         5,
    maxJobsSaved:    5,
    maxLibraryItems: 10,
    maxSeats:        1,
    canUsePricing:   false,
    canBrandReports: false,
    canShareReports: false,
    canUseTags:      false,
    reportsWatermark:true,
    stockInfo:       false,
    pricing:         false,
    tags:            false,
    customDims:      false,
  },
  PRO: {
    maxSystems:      -1,
    maxMaterials:    -1,
    maxRuns:         -1,
    maxJobs:         -1,
    maxJobsSaved:    -1,
    maxLibraryItems: -1,
    maxSeats:        5,
    canUsePricing:   true,
    canBrandReports: true,
    canShareReports: true,
    canUseTags:      true,
    reportsWatermark:false,
    stockInfo:       true,
    pricing:         true,
    tags:            true,
    customDims:      true,
  },
}

export function getLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE
}

export const PLAN_META: Record<Plan, { name: string; color: string }> = {
  FREE: { name: 'Free',  color: '#6b7280' },
  PRO:  { name: 'Pro',   color: '#7917de' },
}

export function isUnlimited(n: number) { return n === -1 }

export function atLimit(current: number, max: number) {
  return max !== -1 && current >= max
}

export function withinLimit(current: number, max: number) {
  return max === -1 || current < max
}

// Human-readable limit messages shown in upgrade prompts
export const LIMIT_MESSAGES: Partial<Record<keyof PlanLimits, string>> = {
  maxSystems:      'Free plan is limited to 1 system. Upgrade to Pro for unlimited systems.',
  maxMaterials:    'Free plan is limited to 5 materials per system. Upgrade to Pro for unlimited materials.',
  maxRuns:         'Free plan supports 1 run per job. Upgrade to Pro for multi-run calculations.',
  maxJobs:         'Free plan saves up to 5 jobs. Upgrade to Pro for unlimited job history.',
  maxLibraryItems: 'Free plan supports 10 library items. Upgrade to Pro for an unlimited library.',
  canUsePricing:   'Material pricing and costing is a Pro feature.',
  canBrandReports: 'Custom company branding on reports is a Pro feature.',
  canShareReports: 'Shareable report links are a Pro feature.',
  canUseTags:      'Material tags and filtering is a Pro feature.',
}
