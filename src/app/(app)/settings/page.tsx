// src/app/settings/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'
import { getUserWithPlan, getProfile, getGlobalTags, getUserCompany, getLabourRates } from '@/lib/db/queries'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')
  const member = await prisma.companyMember.findFirst({ where: { userId: user.id, companyId: company.id }, select: { role: true } })
  const userRole = (member?.role ?? 'MEMBER') as string
  const [dbUser, profile, tags, labourRates, members, invites] = await Promise.all([
    getUserWithPlan(user.id),
    getProfile(user.id),
    getGlobalTags(company.id),
    getLabourRates(company.id),
    prisma.companyMember.findMany({
      where: { companyId: company.id },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.companyInvite.findMany({
      where: { companyId: company.id, acceptedAt: null },
      orderBy: { expiresAt: 'desc' },
    }),
  ])
  const plan = dbUser?.companyMembers?.[0]?.company?.plan ?? 'FREE'
  return (
    <SettingsClient
      user={{ id: user.id, email: user.email ?? '', name: dbUser?.name, subscription: { plan } }}
      initialProfile={profile as any}
      initialTags={tags as any[]}
      initialLabourRates={labourRates as any[]}
      userRole={userRole as any}
      members={members as any[]}
      invites={invites as any[]}
    />
  )
}
