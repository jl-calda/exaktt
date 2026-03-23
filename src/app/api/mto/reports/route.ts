// src/app/api/mto/reports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getReports, createReport, LimitError } from '@/lib/db/queries'
import { LIMIT_MESSAGES } from '@/lib/limits'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'read')
    return NextResponse.json({ data: await getReports(ctx.companyId) })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'write')
    const body   = await req.json()
    const report = await createReport(ctx.companyId, ctx.userId, body)
    return NextResponse.json({ data: report }, { status: 201 })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: e.message }, { status: 401 })
    if (e instanceof LimitError) {
      return NextResponse.json({ error: 'Limit reached', limit: { feature: e.feature, message: (LIMIT_MESSAGES as Record<string, string | undefined>)[e.feature] ?? e.message } }, { status: 403 })
    }
    throw e
  }
}
