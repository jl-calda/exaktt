// src/app/api/mto/systems/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMtoSystems, createMtoSystem, LimitError } from '@/lib/db/queries'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'read')
    return NextResponse.json({ data: await getMtoSystems(ctx.companyId) })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'write')
    const body   = await req.json()
    const system = await createMtoSystem(ctx.companyId, ctx.userId, body)
    return NextResponse.json({ data: system }, { status: 201 })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    if (err instanceof LimitError) return NextResponse.json({ error: err.message, limitCheck: err.feature }, { status: 402 })
    throw err
  }
}
