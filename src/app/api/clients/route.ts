// src/app/api/clients/route.ts
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { getClients, createClient } from '@/lib/db/queries'

export async function GET() {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const clients = await getClients(user.id)
  return NextResponse.json({ data: clients })
}

export async function POST(req: Request) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { name, contactPerson, email, phone, address, notes } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const client = await createClient(user.id, {
    name: name.trim(),
    contactPerson: contactPerson?.trim() || undefined,
    email: email?.trim() || undefined,
    phone: phone?.trim() || undefined,
    address: address?.trim() || undefined,
    notes: notes?.trim() || undefined,
  })
  return NextResponse.json({ data: client }, { status: 201 })
}
