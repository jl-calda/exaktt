// src/app/(app)/logistics/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLibraryItems, getSuppliers, getPurchaseOrders, getDeliveryOrders, getCompanyPlan, getMaterialCategories, getMaterialGrades, getManufacturers } from '@/lib/db/queries'
import LogisticsClient from '@/components/logistics/LogisticsClient'

export default async function LogisticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [library, suppliers, pos, dos, plan, categories, grades, manufacturers] = await Promise.all([
    getLibraryItems(user.id),
    getSuppliers(user.id),
    getPurchaseOrders(user.id),
    getDeliveryOrders(user.id),
    getCompanyPlan(user.id),
    getMaterialCategories(user.id),
    getMaterialGrades(user.id),
    getManufacturers(user.id),
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
    />
  )
}
