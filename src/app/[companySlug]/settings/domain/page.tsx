import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'
import SettingsDomainClient from './SettingsDomainClient'

export default async function SettingsDomainPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const member = await prisma.companyMember.findFirst({
    where: { userId: user.id },
    select: { role: true },
  })
  if (member?.role !== 'OWNER') redirect('/settings/info')
  return <SettingsDomainClient />
}
