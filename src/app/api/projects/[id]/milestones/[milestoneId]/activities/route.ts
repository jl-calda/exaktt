export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'
import { createActivity, getTasks, createTask } from '@/lib/db/queries'

type Ctx = { params: Promise<{ id: string; milestoneId: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { id: projectId, milestoneId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await requireAccess(user.id, 'projects', 'write')

    const body = await request.json()
    if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    if (body.startDate) body.startDate = new Date(body.startDate)
    if (body.endDate) body.endDate = new Date(body.endDate)

    const activity = await createActivity(milestoneId, ctx.companyId, body)

    // Auto-create a linked task when activity has an assignee
    if (body.assigneeId) {
      const linkedUrl = `/projects/${projectId}#activity-${activity.id}`
      const checklist = (body.requiredOutput ?? []).map((text: string, i: number) => ({
        id: `output-${i}`, text, checked: false,
      }))
      await createTask(ctx.companyId, ctx.userId, {
        title: body.name,
        description: body.description || null,
        assigneeId: body.assigneeId,
        targetDate: body.endDate ?? null,
        linkedUrl,
        linkedType: 'activity',
        linkedLabel: body.name,
        checklist,
      })
    }

    return NextResponse.json(activity, { status: 201 })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
