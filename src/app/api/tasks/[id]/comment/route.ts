// src/app/api/tasks/[id]/comment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addTaskComment } from '@/lib/db/queries'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'read')
    const body = await req.json()
    if (!body.content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    const comment = await addTaskComment(id, ctx.companyId, ctx.userId, body.content, body.attachments ?? [])
    return NextResponse.json({ data: comment })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
