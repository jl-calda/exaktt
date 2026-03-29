import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany } from '@/lib/db/queries'
import { prisma } from '@/lib/db/prisma'
import SettingsTeamClient from './SettingsTeamClient'

export default async function SettingsTeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const member = await prisma.companyMember.findFirst({
    where: { userId: user.id, companyId: company.id },
    select: { role: true },
  })
  const userRole = (member?.role ?? 'MEMBER') as string

  // Only OWNER and ADMIN can access team management
  if (userRole !== 'OWNER' && userRole !== 'ADMIN') redirect('/settings/info')

  const [members, invites] = await Promise.all([
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

  return (
    <SettingsTeamClient
      userRole={userRole as any}
      initialMembers={members as any[]}
      initialInvites={invites as any[]}
    />
  )
}
