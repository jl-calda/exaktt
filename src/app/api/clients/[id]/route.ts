// src/app/api/clients/[id]/route.ts
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { getClient, updateClient, archiveClient } from '@/lib/db/queries'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const client = await getClient(id, user.id)
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: client })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { name, contactPerson, email, phone, address, notes } = body

  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
  }

  const client = await updateClient(id, user.id, {
    ...(name            !== undefined && { name:          name.trim() }),
    ...(contactPerson   !== undefined && { contactPerson: contactPerson?.trim() || null }),
    ...(email           !== undefined && { email:         email?.trim() || null }),
    ...(phone           !== undefined && { phone:         phone?.trim() || null }),
    ...(address         !== undefined && { address:       address?.trim() || null }),
    ...(notes           !== undefined && { notes:         notes?.trim() || null }),
  })
  return NextResponse.json({ data: client })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await archiveClient(id, user.id)
  return NextResponse.json({ ok: true })
}
