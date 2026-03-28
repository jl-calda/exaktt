// src/app/(app)/tenders/settings/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany } from '@/lib/db/queries'
import TenderSettingsClient from './TenderSettingsClient'

export default async function TenderSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')
  const blocks = (company as any).tenderTemplates ?? []
  const reportDefaults = (company as any).tenderReportDefaults ?? {}
  const predefinedItemsLibrary = (company as any).predefinedItemsLibrary ?? []
  return (
    <TenderSettingsClient
      initialBlocks={blocks}
      initialReportDefaults={reportDefaults}
      initialPredefinedItemsLibrary={predefinedItemsLibrary}
    />
  )
}
