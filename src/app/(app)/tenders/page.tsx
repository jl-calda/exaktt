// src/app/(app)/tenders/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenders, getClients } from '@/lib/db/queries'
import TendersClient from './TendersClient'

export default async function TendersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const [tenders, clients] = await Promise.all([getTenders(user.id), getClients(user.id)])
  return <TendersClient initialTenders={tenders as any[]} initialClients={clients} />
}
