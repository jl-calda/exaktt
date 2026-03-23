// src/app/api/tenders/[id]/items/[itemId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { removeTenderItem } from '@/lib/db/queries'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string; itemId: string }> }

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'tenders', 'write')
    await removeTenderItem(itemId, ctx.companyId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    return NextResponse.json({ error: (e as any).message }, { status: 400 })
  }
}
