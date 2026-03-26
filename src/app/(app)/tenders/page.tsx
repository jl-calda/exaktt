// src/app/(app)/tenders/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenders, getUserCompany } from '@/lib/db/queries'
import { prisma } from '@/lib/db/prisma'
import TendersClient from './TendersClient'

export default async function TendersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')
  const tenders = await getTenders(company.id)
  const blocks = (company as any).tenderTemplates ?? []
  return <TendersClient initialTenders={tenders as any[]} initialBlocks={blocks} />
}
