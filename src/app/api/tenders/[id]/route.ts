// src/app/api/tenders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTender, updateTender, archiveTender } from '@/lib/db/queries'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tender = await getTender(id, user.id)
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: tender })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const tender = await updateTender(id, user.id, body)
  return NextResponse.json({ data: tender })
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await archiveTender(id, user.id)
  return NextResponse.json({ ok: true })
}
