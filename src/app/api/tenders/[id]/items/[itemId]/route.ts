// src/app/api/tenders/[id]/items/[itemId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { removeTenderItem } from '@/lib/db/queries'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string; itemId: string }> }

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await removeTenderItem(itemId, user.id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
