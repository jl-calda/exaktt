import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany } from '@/lib/db/queries'
import { prisma } from '@/lib/db/prisma'
import SettingsDepartmentsClient from './SettingsDepartmentsClient'

export default async function SettingsDepartmentsPage() {
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

  const departments = await prisma.department.findMany({
    where: { companyId: company.id },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { employees: true } } },
  })

  return <SettingsDepartmentsClient initialDepartments={departments as any[]} />
}
