// src/app/api/tenders/[id]/items/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addTenderItem } from '@/lib/db/queries'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { systemId, jobId, notes, sortOrder } = await req.json()
  try {
    const item = await addTenderItem(user.id, id, { systemId, jobId, notes, sortOrder })
    return NextResponse.json({ data: item })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
