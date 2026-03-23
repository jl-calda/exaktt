// src/app/api/mto/jobs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMtoJobs, createMtoJob, LimitError } from '@/lib/db/queries'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const mtoSystemId = req.nextUrl.searchParams.get('systemId') ?? undefined
  return NextResponse.json({ data: await getMtoJobs(user.id, mtoSystemId) })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    if (!body.systemId) return NextResponse.json({ error: 'systemId required' }, { status: 400 })
    const job = await createMtoJob(user.id, body.systemId, body)
    return NextResponse.json({ data: job }, { status: 201 })
  } catch (err) {
    if (err instanceof LimitError) return NextResponse.json({ error: err.message, limitCheck: err.feature }, { status: 402 })
    throw err
  }
}
