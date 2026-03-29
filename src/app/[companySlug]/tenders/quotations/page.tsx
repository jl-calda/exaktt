// src/app/(app)/tenders/quotations/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany, getAllTenderReports } from '@/lib/db/queries'
import QuotationsClient from './QuotationsClient'

export default async function QuotationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')
  const allReports = await getAllTenderReports(company.id)
  return <QuotationsClient initialReports={allReports as any[]} />
}
