// src/app/api/clients/route.ts
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { getClients, createClient } from '@/lib/db/queries'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'

export async function GET() {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const ctx = await requireAccess(user.id, 'tenders', 'read')
    const clients = await getClients(ctx.companyId)
    return NextResponse.json({ data: clients })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}

export async function POST(req: Request) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const ctx = await requireAccess(user.id, 'tenders', 'write')
    const body = await req.json()
    const { name, contactPerson, email, phone, address, notes } = body

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const client = await createClient(ctx.companyId, ctx.userId, {
      name: name.trim(),
      contactPerson: contactPerson?.trim() || undefined,
      email: email?.trim() || undefined,
      phone: phone?.trim() || undefined,
      address: address?.trim() || undefined,
      notes: notes?.trim() || undefined,
    })
    return NextResponse.json({ data: client }, { status: 201 })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
