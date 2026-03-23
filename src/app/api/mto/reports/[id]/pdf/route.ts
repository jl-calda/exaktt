// src/app/api/mto/reports/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getReport, getMaterialSpecs } from '@/lib/db/queries'
import { renderToBuffer } from '@react-pdf/renderer'
import { ReportDocument } from '@/lib/pdf/ReportDocument'
import React from 'react'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'read')
    const report = await getReport(id, ctx.companyId)
    if (!report) return new NextResponse('Not found', { status: 404 })
    const specs    = await getMaterialSpecs(ctx.companyId)
    const specsMap = Object.fromEntries(specs.map(s => [s.productCode ?? s.id, s]))
    const element  = React.createElement(ReportDocument, { report: report as any, results: (report.resultsSnapshot as any) ?? null, specs: specsMap as any }) as any
    const buffer   = await renderToBuffer(element)
    const filename = ((report.title ?? 'report') as string).replace(/[^a-z0-9]/gi, '_') + '.pdf'
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="' + filename + '"', 'Content-Length': buffer.byteLength.toString() },
    })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}
