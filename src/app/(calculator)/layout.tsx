// src/app/(calculator)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserWithPlan } from '@/lib/db/queries'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import type { CompanyRole } from '@/types'
import type { Plan } from '@prisma/client'

export default async function CalculatorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const userData = await getUserWithPlan(user.id)
  const role  = (userData?.companyMembers?.[0]?.role          ?? 'MEMBER') as CompanyRole
  const plan  = (userData?.companyMembers?.[0]?.company?.plan ?? 'FREE')   as Plan
  const name  = userData?.name  ?? null
  const email = userData?.email ?? null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-surface)' }}>
      <Sidebar role={role} plan={plan} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav userName={name} userEmail={email} plan={plan} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
