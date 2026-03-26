// src/components/layout/PermissionWrapper.tsx
'use client'
import { PermissionProvider, createPermissionValue } from '@/lib/hooks/usePermissions'
import type { CompanyRole } from '@/types'

interface Props {
  role: string
  permissions: Record<string, string>
  children: React.ReactNode
}

export default function PermissionWrapper({ role, permissions, children }: Props) {
  const value = createPermissionValue(role as CompanyRole, permissions)
  return <PermissionProvider value={value}>{children}</PermissionProvider>
}
