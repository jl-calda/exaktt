// src/app/(app)/products/templates/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMtoSystems, getUserWithPlan, getUserCompany } from '@/lib/db/queries'
import TemplatesClient from './TemplatesClient'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const [userData, systems] = await Promise.all([
    getUserWithPlan(user.id),
    getMtoSystems(company.id),
  ])

  const plan = userData?.companyMembers?.[0]?.company?.plan ?? 'FREE'

  return (
    <TemplatesClient
      plan={plan}
      systemCount={systems.length}
    />
  )
}
