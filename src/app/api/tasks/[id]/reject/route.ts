// src/app/api/tasks/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateTask, addTaskComment } from '@/lib/db/queries'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'read')
    const body = await req.json().catch(() => ({}))
    const task = await updateTask(id, ctx.companyId, { status: 'rejected' })
    if (body.comment?.trim()) {
      await addTaskComment(id, ctx.companyId, ctx.userId, body.comment)
    }
    return NextResponse.json({ data: task })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
