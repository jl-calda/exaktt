// src/app/api/mto/systems/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMtoSystem, updateMtoSystem, archiveMtoSystem, LimitError } from '@/lib/db/queries'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sys = await getMtoSystem(id, user.id)
  if (!sys) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: sys })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const sys  = await updateMtoSystem(id, user.id, body)
    return NextResponse.json({ data: sys })
  } catch (err) {
    if (err instanceof LimitError) return NextResponse.json({ error: err.message, limitCheck: err.feature }, { status: 402 })
    throw err
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await archiveMtoSystem(id, user.id)
  return NextResponse.json({ data: { success: true } })
}
