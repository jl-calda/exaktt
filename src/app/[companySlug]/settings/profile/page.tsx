import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany } from '@/lib/db/queries'
import { prisma } from '@/lib/db/prisma'
import SettingsProfileClient from './SettingsProfileClient'

export default async function SettingsProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const member = await prisma.companyMember.findFirst({
    where: { userId: user.id, companyId: company.id },
    select: { role: true },
  })
  const role = (member?.role ?? 'MEMBER') as string

  const [dbUser, employee, departments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, email: true, name: true, avatarUrl: true,
        phone: true, bio: true, dateOfBirth: true, nationality: true,
      },
    }),
    prisma.employee.findUnique({
      where: { userId: user.id },
      include: { department: { select: { id: true, name: true, color: true } } },
    }),
    prisma.department.findMany({
      where: { companyId: company.id },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, color: true },
    }),
  ])

  return (
    <SettingsProfileClient
      initialUser={dbUser as any}
      initialEmployee={employee as any}
      departments={departments as any[]}
      role={role}
    />
  )
}
