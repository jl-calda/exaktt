// src/app/api/mto/systems/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMtoSystems, createMtoSystem, LimitError } from '@/lib/db/queries'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ data: await getMtoSystems(user.id) })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body   = await req.json()
    const system = await createMtoSystem(user.id, body)
    return NextResponse.json({ data: system }, { status: 201 })
  } catch (err) {
    if (err instanceof LimitError) return NextResponse.json({ error: err.message, limitCheck: err.feature }, { status: 402 })
    throw err
  }
}
