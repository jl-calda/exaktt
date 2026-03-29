import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany, getActivityCategories, getCompanyHoursPerDay } from '@/lib/db/queries'
import { prisma } from '@/lib/db/prisma'
import ProjectSettingsClient from './ProjectSettingsClient'

export default async function SettingsProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const member = await prisma.companyMember.findFirst({
    where: { userId: user.id, companyId: company.id },
    select: { role: true },
  })
  if (member?.role !== 'OWNER' && member?.role !== 'ADMIN') redirect('/settings/info')

  const [categories, hoursPerDay] = await Promise.all([
    getActivityCategories(company.id),
    getCompanyHoursPerDay(company.id),
  ])

  return (
    <ProjectSettingsClient
      initialCategories={categories as any[]}
      initialHoursPerDay={hoursPerDay}
    />
  )
}
