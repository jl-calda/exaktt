import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany } from '@/lib/db/queries'
import { prisma } from '@/lib/db/prisma'
import SettingsSidebar from './SettingsSidebar'

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  const memberCount = await prisma.companyMember.count({
    where: { companyId: company.id },
  })

  const plan = (company as any).plan ?? 'FREE'

  return (
    <div className="min-h-full flex">
      <SettingsSidebar role={role} memberCount={memberCount} plan={plan} />
      <main className="flex-1 min-w-0 px-4 py-4 md:px-6 md:py-5">
        {children}
      </main>
    </div>
  )
}
