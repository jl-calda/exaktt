import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany, getLabourRates } from '@/lib/db/queries'
import { prisma } from '@/lib/db/prisma'
import SettingsLabourClient from './SettingsLabourClient'

export default async function SettingsLabourPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const member = await prisma.companyMember.findFirst({
    where: { userId: user.id, companyId: company.id },
    select: { role: true },
  })
  if (member?.role !== 'OWNER') redirect('/settings/info')

  const labourRates = await getLabourRates(company.id)
  return <SettingsLabourClient initialLabourRates={labourRates as any[]} />
}
