// src/app/api/tenders/[id]/report/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenderReportById } from '@/lib/db/queries'
import { renderToBuffer } from '@react-pdf/renderer'
import { TenderReportPDF } from '@/components/tender/TenderReportPDF'
import React from 'react'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  try {
    const ctx = await requireAccess(user.id, 'tenders', 'read')
    const reportId = req.nextUrl.searchParams.get('reportId')
    if (!reportId) return NextResponse.json({ error: 'reportId required' }, { status: 400 })

    const report = await getTenderReportById(reportId, ctx.companyId)
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const element = React.createElement(TenderReportPDF, { report: report as any }) as any
    const buffer = await renderToBuffer(element)
    const filename = ((report.title ?? 'quotation') as string).replace(/[^a-z0-9_-]/gi, '_') + '.pdf'

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}
