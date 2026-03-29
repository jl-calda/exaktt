// src/app/(app)/dashboard/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserWithPlan, upsertUser, getUserCompany, getMtoSystems, getTenders, getReports, getClients } from '@/lib/db/queries'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  await upsertUser(user.id, user.email ?? '', user.user_metadata?.full_name ?? user.user_metadata?.name)

  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')
  const companyId = company.id

  const [userData, systems, tenders, reports, clients] = await Promise.all([
    getUserWithPlan(user.id),
    getMtoSystems(companyId),
    getTenders(companyId),
    getReports(companyId),
    getClients(companyId),
  ])
  const plan = userData?.companyMembers?.[0]?.company?.plan ?? 'FREE'

  const activeTenders = tenders.filter((t: any) => t.status === 'DRAFT' || t.status === 'SUBMITTED')

  return (
    <DashboardClient
      plan={plan as any}
      userName={userData?.name ?? null}
      systems={systems.slice(0, 3) as any[]}
      systemsCount={systems.length}
      tenders={activeTenders.slice(0, 3) as any[]}
      tendersCount={tenders.length}
      reportsCount={reports.length}
      clientsCount={clients.length}
    />
  )
}
