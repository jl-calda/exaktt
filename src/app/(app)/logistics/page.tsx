// src/app/(app)/logistics/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLibraryItems, getSuppliers, getPurchaseOrders, getDeliveryOrders, getCompanyPlan, getMaterialCategories, getMaterialGrades, getManufacturers, getLabourRates, getWorkCategories, getWorkActivityRates, getUserCompany } from '@/lib/db/queries'
import LogisticsClient from '@/components/logistics/LogisticsClient'

export default async function LogisticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')
  const companyId = company.id

  const [library, suppliers, pos, dos, plan, categories, grades, manufacturers, labourRates, workCategories, workActivityRates] = await Promise.all([
    getLibraryItems(companyId),
    getSuppliers(companyId),
    getPurchaseOrders(companyId),
    getDeliveryOrders(companyId),
    getCompanyPlan(user.id),
    getMaterialCategories(companyId),
    getMaterialGrades(companyId),
    getManufacturers(companyId),
    getLabourRates(companyId),
    getWorkCategories(companyId),
    getWorkActivityRates(companyId),
  ])

  return (
    <LogisticsClient
      library={library as any[]}
      suppliers={suppliers as any[]}
      pos={pos as any[]}
      dos={dos as any[]}
      plan={plan}
      categories={categories as any[]}
      grades={grades as any[]}
      manufacturers={manufacturers as any[]}
      labourRates={labourRates as any[]}
      workCategories={workCategories as any[]}
      workActivityRates={workActivityRates as any[]}
    />
  )
}
