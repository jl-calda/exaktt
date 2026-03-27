// src/app/(app)/projects/teams/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkTeams, getUserCompany } from '@/lib/db/queries'
import { prisma } from '@/lib/db/prisma'
import TeamsClient from './TeamsClient'

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const [teams, companyMembers] = await Promise.all([
    getWorkTeams(company.id),
    prisma.companyMember.findMany({
      where: { companyId: company.id },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    }),
  ])

  const users = companyMembers.map(m => ({
    id: m.user.id,
    name: m.user.name ?? m.user.email,
    avatarUrl: m.user.avatarUrl,
  }))

  return <TeamsClient initialTeams={teams as any[]} companyUsers={users} />
}
