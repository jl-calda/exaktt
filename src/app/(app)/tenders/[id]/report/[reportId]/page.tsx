// src/app/(app)/tenders/[id]/report/[reportId]/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTender, getTenderReportById, getProfile, getUserCompany } from '@/lib/db/queries'
import { prisma } from '@/lib/db/prisma'
import { createQuotationPreset } from '@/lib/doc-builder/presets'
import type { DocBlock, DocBranding, DocEstimate } from '@/lib/doc-builder/types'
import TenderDocBuilderClient from './TenderDocBuilderClient'

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

  const templates = ((company as any).tenderTemplates ?? []) as { id: string; name: string; category: string; blockTitle?: string; blockContent?: string }[]

  // Build estimates from tender items (linked systems/jobs)
  const tenderItems = (tender as any).items ?? []
  const estimates: DocEstimate[] = tenderItems.map((ti: any) => {
    const job = ti.job
    const system = ti.system
    const amount = job?.lastResults?.totals?.grandTotal ?? 0
    return {
      id: ti.id,
      systemName: system?.name ?? 'Unknown System',
      jobName: job?.name ?? 'Unknown Job',
      description: `${system?.name ?? 'System'} — ${job?.name ?? 'Job'}`,
      amount,
      resultSnapshot: job?.lastResults ?? null,
    }
  })

  const branding: DocBranding = {
    companyName: (report as any).companyName ?? company.name,
    companyLogo: (report as any).companyLogo ?? profile?.logo ?? null,
    companyAddr: (report as any).companyAddr ?? profile?.address ?? null,
    registrationNo: (report as any).registrationNo ?? profile?.abn ?? null,
    registrationLabel: (report as any).registrationLabel ?? profile?.registrationLabel ?? null,
    accentColor: (report as any).accentColor ?? null,
    currency: (report as any).currency ?? 'SGD',
  }

  // Determine if sections contain DocBlocks (new format) or old TenderReportSection format
  const rawSections = ((report as any).sections ?? []) as any[]
  const isDocBlocks = rawSections.length > 0 && rawSections[0]?.data !== undefined

  let blocks: DocBlock[]
  if (isDocBlocks) {
    // Already in DocBlock format — use directly
    blocks = rawSections as DocBlock[]
  } else {
    // Generate fresh DocBlocks from tender data
    const tenderItems = (tender as any).items ?? []
    blocks = createQuotationPreset({
      branding,
      sourceData: {
        report,
        tender,
        tenderItems,
      },
    })

    // Persist the generated blocks so next load is instant
    await prisma.tenderReport.update({
      where: { id: reportId },
      data: { sections: blocks as any },
    })
  }

  return (
    <TenderDocBuilderClient
      tender={{ id: (tender as any).id, name: (tender as any).name, status: (tender as any).status }}
      report={{
        id: (report as any).id,
        title: (report as any).title,
        reference: (report as any).reference,
        status: (report as any).status,
        sections: blocks,
        currency: (report as any).currency ?? 'SGD',
      }}
      branding={branding}
      blocks={blocks}
      templates={templates}
      estimates={estimates}
    />
  )
}
