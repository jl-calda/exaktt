export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany, getTenders } from '@/lib/db/queries'
import AllTendersClient from './AllTendersClient'

export default async function AllTendersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')
  const tenders = await getTenders(company.id)
  return <AllTendersClient initialTenders={tenders as any[]} />
}
