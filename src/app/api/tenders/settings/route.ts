// src/app/api/tenders/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'tenders', 'read')
    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { tenderReportDefaults: true, predefinedItemsLibrary: true },
    })
    return NextResponse.json({ data: {
      reportDefaults: company?.tenderReportDefaults ?? {},
      predefinedItemsLibrary: company?.predefinedItemsLibrary ?? [],
    }})
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'tenders', 'write')
    const body = await req.json()
    const update: any = {}
    if (body.reportDefaults !== undefined) update.tenderReportDefaults = body.reportDefaults
    if (body.predefinedItemsLibrary !== undefined) update.predefinedItemsLibrary = body.predefinedItemsLibrary
    await prisma.company.update({ where: { id: ctx.companyId }, data: update })
    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
