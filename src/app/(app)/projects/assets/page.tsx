// src/app/(app)/projects/assets/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjectAssets, getUserCompany } from '@/lib/db/queries'
import AssetsClient from './AssetsClient'

export default async function AssetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const assets = await getProjectAssets(company.id)
  return <AssetsClient initialAssets={assets as any[]} />
}
