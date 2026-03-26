// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTasks, createTask } from '@/lib/db/queries'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'read')
    const url = new URL(req.url)
    const filters = {
      assigneeId: url.searchParams.get('assigneeId') ?? undefined,
      createdById: url.searchParams.get('createdById') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      linkedUrl: url.searchParams.get('linkedUrl') ?? undefined,
    }
    const tasks = await getTasks(ctx.companyId, filters)
    return NextResponse.json({ data: tasks })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'read')
    const body = await req.json()
    if (!body.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if (!body.assigneeId) return NextResponse.json({ error: 'Assignee is required' }, { status: 400 })
    const task = await createTask(ctx.companyId, ctx.userId, body)
    return NextResponse.json({ data: task })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
