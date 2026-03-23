// src/app/(app)/tenders/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenders, getClients, getUserCompany } from '@/lib/db/queries'
import TendersClient from './TendersClient'

export default async function TendersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')
  const [tenders, clients] = await Promise.all([getTenders(company.id), getClients(company.id)])
  return <TendersClient initialTenders={tenders as any[]} initialClients={clients} />
}
