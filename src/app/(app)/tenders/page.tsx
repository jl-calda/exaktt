// src/app/(app)/tenders/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenders, getUserCompany, getAllTenderReports, getCompanyMembers, getTenderTaskCounts } from '@/lib/db/queries'
import TendersClient from './TendersClient'

export default async function TendersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')
  const [tenders, allReports, members, taskCounts] = await Promise.all([
    getTenders(company.id),
    getAllTenderReports(company.id),
    getCompanyMembers(company.id),
    getTenderTaskCounts(company.id),
  ])
  const memberUsers = members.map(m => ({ id: m.user.id, name: m.user.name, email: m.user.email }))
  return (
    <TendersClient
      initialTenders={tenders as any[]}
      initialReports={allReports as any[]}
      members={memberUsers}
      taskCounts={taskCounts}
    />
  )
}
