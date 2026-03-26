export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTender, getTenderReportById, getProfile, getUserCompany } from '@/lib/db/queries'
import TenderReportBuilder from '@/components/tender/TenderReportBuilder'

export default async function TenderReportPage({ params }: { params: Promise<{ id: string; reportId: string }> }) {
  const { id, reportId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const [tender, report, profile] = await Promise.all([
    getTender(id, company.id),
    getTenderReportById(reportId, company.id),
    getProfile(user.id),
  ])

  if (!tender) redirect('/tenders')
  if (!report) redirect(`/tenders/${id}`)

  return (
    <TenderReportBuilder
      tender={tender}
      tenderItems={(tender as any).items ?? []}
      profile={profile}
      existingReport={report}
    />
  )
}
