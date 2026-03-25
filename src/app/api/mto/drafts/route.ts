// src/app/api/mto/drafts/route.ts — auto-saved run drafts per user per system
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRunDraft, upsertRunDraft, deleteRunDraft } from '@/lib/db/queries'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'read')
    const systemId = req.nextUrl.searchParams.get('systemId')
    if (!systemId) return NextResponse.json({ error: 'systemId required' }, { status: 400 })
    const draft = await getRunDraft(ctx.userId, systemId)
    return NextResponse.json({ data: draft })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'write')
    const body = await req.json()
    if (!body.systemId) return NextResponse.json({ error: 'systemId required' }, { status: 400 })
    const draft = await upsertRunDraft(ctx.companyId, ctx.userId, body.systemId, {
      runs: body.runs ?? [],
      stockOptimMode: body.stockOptimMode ?? 'min_waste',
    })
    return NextResponse.json({ data: draft })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'write')
    const systemId = req.nextUrl.searchParams.get('systemId')
    if (!systemId) return NextResponse.json({ error: 'systemId required' }, { status: 400 })
    await deleteRunDraft(ctx.userId, systemId)
    return NextResponse.json({ data: null })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}
