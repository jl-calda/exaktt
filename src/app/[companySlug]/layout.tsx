// src/app/[companySlug]/layout.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getUserWithPlan } from '@/lib/db/queries'
import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import type { CompanyRole } from '@/types'
import type { Plan } from '@prisma/client'
import PermissionWrapper from '@/components/layout/PermissionWrapper'

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ companySlug: string }>
}) {
  const { companySlug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const userData = await getUserWithPlan(user.id)

  // Validate user has access to this company (matched by slug)
  const member = userData?.companyMembers?.find(
    m => (m.company as any)?.slug === companySlug
  ) ?? userData?.companyMembers?.[0] // Fallback to first company for backward compat

  if (!member) redirect('/auth/login')

  const role  = (member.role          ?? 'MEMBER') as CompanyRole
  const plan  = (member.company?.plan ?? 'FREE')   as Plan
  const name  = userData?.name  ?? null
  const email = userData?.email ?? null

  // Refresh company slug cookie if stale or missing
  const cookieStore = await cookies()
  const existingSlug = cookieStore.get('x-company-slug')?.value
  const currentSlug = (member.company as any)?.slug
  if (currentSlug && existingSlug !== currentSlug) {
    cookieStore.set('x-company-slug', currentSlug, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  return (
    <PermissionWrapper role={role} permissions={(member?.permissions as Record<string, string>) ?? {}}>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        <Sidebar role={role} plan={plan} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopNav userName={name} userEmail={email} plan={plan} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </PermissionWrapper>
  )
}
