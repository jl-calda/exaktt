// src/app/(app)/products/page.tsx — Products hub
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMtoSystems, getReports, getUserWithPlan, getUserCompany } from '@/lib/db/queries'
import ProductsClient from './ProductsClient'

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')
  const companyId = company.id

  const [userData, systems, reports] = await Promise.all([
    getUserWithPlan(user.id),
    getMtoSystems(companyId),
    getReports(companyId),
  ])

  const plan = userData?.companyMembers?.[0]?.company?.plan ?? 'FREE'

  return (
    <ProductsClient
      user={{
        email:   user.email ?? '',
        name:    userData?.name,
        plan,
        profile: userData?.profile as any,
      }}
      initialSystems={systems as any[]}
      initialReports={reports as any[]}
    />
  )
}
