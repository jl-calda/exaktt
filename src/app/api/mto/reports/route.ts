// src/app/api/mto/reports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getReports, createReport, LimitError } from '@/lib/db/queries'
import { LIMIT_MESSAGES } from '@/lib/limits'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ data: await getReports(user.id) })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body   = await req.json()
    const report = await createReport(user.id, body)
    return NextResponse.json({ data: report }, { status: 201 })
  } catch (e) {
    if (e instanceof LimitError) {
      return NextResponse.json({ error: 'Limit reached', limit: { feature: e.feature, message: (LIMIT_MESSAGES as Record<string, string | undefined>)[e.feature] ?? e.message } }, { status: 403 })
    }
    throw e
  }
}
