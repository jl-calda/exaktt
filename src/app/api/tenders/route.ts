// src/app/api/tenders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenders, createTender } from '@/lib/db/queries'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenders = await getTenders(user.id)
  return NextResponse.json({ data: tenders })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { name, clientId, clientName, projectName, reference, submissionDate, notes } = body
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const tender = await createTender(user.id, {
    name: name.trim(), clientId, clientName, projectName, reference,
    submissionDate: submissionDate ? new Date(submissionDate) : null,
    notes,
  })
  return NextResponse.json({ data: tender })
}
