// src/app/(app)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserWithPlan } from '@/lib/db/queries'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import type { CompanyRole } from '@/types'
import type { Plan } from '@prisma/client'
import { PermissionProvider, createPermissionValue } from '@/lib/hooks/usePermissions'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const userData = await getUserWithPlan(user.id)
  const member = userData?.companyMembers?.[0]
  const role  = (member?.role          ?? 'MEMBER') as CompanyRole
  const plan  = (member?.company?.plan ?? 'FREE')   as Plan
  const name  = userData?.name  ?? null
  const email = userData?.email ?? null

  const permValue = createPermissionValue(
    role as any,
    (member?.permissions as Record<string, string>) ?? {}
  )

  return (
    <PermissionProvider value={permValue}>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        <Sidebar role={role} plan={plan} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopNav userName={name} userEmail={email} plan={plan} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </PermissionProvider>
  )
}
