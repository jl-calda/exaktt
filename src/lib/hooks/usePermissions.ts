// src/lib/hooks/usePermissions.ts
'use client'
import { createContext, useContext } from 'react'
import type { CompanyRole, ModuleName, ModulePermission } from '@/types'

export interface PermissionContextValue {
  role: CompanyRole
  permissions: Record<ModuleName, ModulePermission>
  canWrite: (module: ModuleName) => boolean
  canRead: (module: ModuleName) => boolean
  isOwner: boolean
  isAdmin: boolean
}

const defaults: Record<ModuleName, ModulePermission> = {
  systems: 'write', library: 'write', reports: 'write', logistics: 'write', tenders: 'write',
}

const PermCtx = createContext<PermissionContextValue>({
  role: 'MEMBER',
  permissions: defaults,
  canWrite: () => true,
  canRead: () => true,
  isOwner: false,
  isAdmin: false,
})

export function createPermissionValue(role: CompanyRole, permissions: Record<string, string>): PermissionContextValue {
  const perms = { ...defaults, ...permissions } as Record<ModuleName, ModulePermission>
  // OWNER/ADMIN always have full access
  if (role === 'OWNER' || role === 'ADMIN') {
    return {
      role, permissions: defaults,
      canWrite: () => true, canRead: () => true,
      isOwner: role === 'OWNER', isAdmin: role === 'ADMIN',
    }
  }
  return {
    role, permissions: perms,
    canWrite: (mod) => perms[mod] === 'write',
    canRead: (mod) => perms[mod] === 'write' || perms[mod] === 'read',
    isOwner: false, isAdmin: false,
  }
}

export const PermissionProvider = PermCtx.Provider
export const usePermissions = () => useContext(PermCtx)
