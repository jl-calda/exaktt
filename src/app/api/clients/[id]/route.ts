// src/app/api/clients/[id]/route.ts
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { getClient, updateClient, archiveClient } from '@/lib/db/queries'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const ctx = await requireAccess(user.id, 'tenders', 'read')
    const client = await getClient(id, ctx.companyId)
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: client })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const ctx = await requireAccess(user.id, 'tenders', 'write')
    const body = await req.json()
    const { name, contactPerson, email, phone, address, notes } = body

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const client = await updateClient(id, ctx.companyId, {
      ...(name            !== undefined && { name:          name.trim() }),
      ...(contactPerson   !== undefined && { contactPerson: contactPerson?.trim() || null }),
      ...(email           !== undefined && { email:         email?.trim() || null }),
      ...(phone           !== undefined && { phone:         phone?.trim() || null }),
      ...(address         !== undefined && { address:       address?.trim() || null }),
      ...(notes           !== undefined && { notes:         notes?.trim() || null }),
    })
    return NextResponse.json({ data: client })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const ctx = await requireAccess(user.id, 'tenders', 'write')
    await archiveClient(id, ctx.companyId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
