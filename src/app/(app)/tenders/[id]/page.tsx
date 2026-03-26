// src/app/(app)/tenders/[id]/page.tsx
export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTender, getMtoJobs, getUserCompany, getProfile, getTenderReports, getClients } from '@/lib/db/queries'
import TenderDetailClient from './TenderDetailClient'

interface PageProps { params: Promise<{ id: string }> }

export default async function TenderDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const [tender, allJobs, profile, tenderReports, clients] = await Promise.all([
    getTender(id, company.id),
    getMtoJobs(company.id),
    getProfile(user.id),
    getTenderReports(id, company.id),
    getClients(company.id),
  ])

  if (!tender) notFound()

  const templates = (company as any).tenderTemplates ?? []

  return (
    <TenderDetailClient
      tender={tender as any}
      allJobs={allJobs as any[]}
      profile={profile}
      tenderReports={tenderReports as any[]}
      clients={clients as any[]}
      templates={templates}
    />
  )
}
