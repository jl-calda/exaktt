// src/app/api/tenders/[id]/items/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addTenderItem } from '@/lib/db/queries'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'tenders', 'write')
    const { systemId, jobId, notes, sortOrder } = await req.json()
    const item = await addTenderItem(ctx.companyId, id, { systemId, jobId, notes, sortOrder })
    return NextResponse.json({ data: item })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    return NextResponse.json({ error: (e as any).message }, { status: 400 })
  }
}
