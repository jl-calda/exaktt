// src/lib/auth/access.ts
// Per-module, role-based access control for company-scoped data

import { prisma } from '@/lib/db/prisma'
import type { CompanyRole } from '@prisma/client'

// ─── Types ───────────────────────────────────────────────────────────────────

export type Module = 'systems' | 'library' | 'reports' | 'logistics' | 'tenders'
export type Permission = 'write' | 'read' | 'none'
export type Action = 'read' | 'write'

export interface AccessContext {
  userId: string
  companyId: string
  role: CompanyRole
  permissions: Record<Module, Permission>
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const ALL_MODULES: Module[] = ['systems', 'library', 'reports', 'logistics', 'tenders']

export const DEFAULT_PERMISSIONS: Record<CompanyRole, Record<Module, Permission>> = {
  OWNER:  { systems: 'write', library: 'write', reports: 'write', logistics: 'write', tenders: 'write' },
  ADMIN:  { systems: 'write', library: 'write', reports: 'write', logistics: 'write', tenders: 'write' },
  MEMBER: { systems: 'write', library: 'write', reports: 'write', logistics: 'write', tenders: 'write' },
  VIEWER: { systems: 'read',  library: 'read',  reports: 'read',  logistics: 'read',  tenders: 'read' },
}

/** Build a valid permissions object from role defaults + any stored overrides */
export function resolvePermissions(
  role: CompanyRole,
  stored: Record<string, string> | null | undefined,
): Record<Module, Permission> {
  // OWNER/ADMIN always get full access regardless of stored overrides
  if (role === 'OWNER' || role === 'ADMIN') return DEFAULT_PERMISSIONS[role]

  const base = { ...DEFAULT_PERMISSIONS[role] }
  if (stored) {
    for (const mod of ALL_MODULES) {
      const v = stored[mod]
      if (v === 'write' || v === 'read' || v === 'none') {
        base[mod] = v
      }
    }
  }
  return base
}

// ─── Context resolution ──────────────────────────────────────────────────────

/** Resolves the authenticated user's company context + effective permissions */
export async function getAccessContext(userId: string): Promise<AccessContext> {
  const member = await prisma.companyMember.findFirst({
    where:  { userId },
    select: { companyId: true, role: true, permissions: true },
  })
  if (!member) throw new UnauthorizedError('No company membership')

  const permissions = resolvePermissions(member.role, member.permissions as any)
  return { userId, companyId: member.companyId, role: member.role, permissions }
}

// ─── Guards ──────────────────────────────────────────────────────────────────

/** Require read or write access to a specific module. Returns the access context. */
export async function requireAccess(
  userId: string,
  module: Module,
  action: Action,
): Promise<AccessContext> {
  const ctx = await getAccessContext(userId)
  const perm = ctx.permissions[module]

  if (action === 'write' && perm !== 'write') {
    throw new ForbiddenError(`No write access to ${module}`)
  }
  if (action === 'read' && perm === 'none') {
    throw new ForbiddenError(`No access to ${module}`)
  }
  return ctx
}

/** Require OWNER role — for billing management */
export async function requireBilling(userId: string): Promise<AccessContext> {
  const ctx = await getAccessContext(userId)
  if (ctx.role !== 'OWNER') throw new ForbiddenError('Only company owner can manage billing')
  return ctx
}

/** Require OWNER or ADMIN role — for team management */
export async function requireTeamAdmin(userId: string): Promise<AccessContext> {
  const ctx = await getAccessContext(userId)
  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    throw new ForbiddenError('Only owners and admins can manage the team')
  }
  return ctx
}

// ─── Error classes ───────────────────────────────────────────────────────────

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}
