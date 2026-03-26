// src/app/(app)/logistics/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'
import { getLibraryItems, getSuppliers, getPurchaseOrders, getDeliveryOrders, getCompanyPlan, getMaterialCategories, getMaterialGrades, getManufacturers, getLabourRates, getWorkCategories, getWorkActivityRates, getUserCompany } from '@/lib/db/queries'
import LogisticsClient from '@/components/logistics/LogisticsClient'

export default async function LogisticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')
  const companyId = company.id

  const member = await prisma.companyMember.findFirst({ where: { userId: user.id, companyId }, select: { role: true } })
  const userRole = (member?.role ?? 'MEMBER') as string

  // Fetch each query individually to identify failures
  let library: any[] = [], suppliers: any[] = [], pos: any[] = [], dos: any[] = []
  let plan: any = 'FREE', categories: any[] = [], grades: any[] = [], manufacturers: any[] = []
  let labourRates: any[] = [], workCategories: any[] = [], workActivityRates: any[] = []

  try { library = await getLibraryItems(companyId) as any[] } catch (e: any) { console.error('getLibraryItems failed:', e.message) }
  try { suppliers = await getSuppliers(companyId) as any[] } catch (e: any) { console.error('getSuppliers failed:', e.message) }
  try { pos = await getPurchaseOrders(companyId) as any[] } catch (e: any) { console.error('getPurchaseOrders failed:', e.message) }
  try { dos = await getDeliveryOrders(companyId) as any[] } catch (e: any) { console.error('getDeliveryOrders failed:', e.message) }
  try { plan = await getCompanyPlan(user.id) } catch (e: any) { console.error('getCompanyPlan failed:', e.message) }
  try { categories = await getMaterialCategories(companyId) as any[] } catch (e: any) { console.error('getMaterialCategories failed:', e.message) }
  try { grades = await getMaterialGrades(companyId) as any[] } catch (e: any) { console.error('getMaterialGrades failed:', e.message) }
  try { manufacturers = await getManufacturers(companyId) as any[] } catch (e: any) { console.error('getManufacturers failed:', e.message) }
  try { labourRates = await getLabourRates(companyId) as any[] } catch (e: any) { console.error('getLabourRates failed:', e.message) }
  try { workCategories = await getWorkCategories(companyId) as any[] } catch (e: any) { console.error('getWorkCategories failed:', e.message) }
  try { workActivityRates = await getWorkActivityRates(companyId) as any[] } catch (e: any) { console.error('getWorkActivityRates failed:', e.message) }

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
      userRole={userRole as any}
    />
  )
}
