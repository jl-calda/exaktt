export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'
import { updateActivity, deleteActivity, getTasks, createTask } from '@/lib/db/queries'

type Ctx = { params: Promise<{ id: string; milestoneId: string; activityId: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { id: projectId, milestoneId, activityId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await requireAccess(user.id, 'projects', 'write')

    const body = await request.json()
    if (body.startDate) body.startDate = new Date(body.startDate)
    if (body.endDate) body.endDate = new Date(body.endDate)
    const activity = await updateActivity(activityId, ctx.companyId, body)

    // Auto-create a linked task when assignee is set and no task exists yet
    if (body.assigneeId) {
      const linkedUrl = `/projects/${projectId}#activity-${activityId}`
      const existing = await getTasks(ctx.companyId, { linkedUrl })
      if (existing.length === 0) {
        const outputs = activity.requiredOutput ?? []
        const checklist = outputs.map((text: string, i: number) => ({
          id: `output-${i}`, text, checked: false,
        }))
        await createTask(ctx.companyId, ctx.userId, {
          title: activity.name,
          description: activity.description || null,
          assigneeId: body.assigneeId,
          startDate: activity.startDate ?? null,
          targetDate: activity.endDate ?? null,
          linkedUrl,
          linkedType: 'activity',
          linkedLabel: activity.name,
          checklist,
          metadata: {
            source: 'activity',
            projectId,
            milestoneId,
            activityId,
            estimatedHours: activity.estimatedHours ?? null,
            skills: activity.skills ?? [],
            teamId: activity.teamId ?? null,
          },
        })
      }
    }

    return NextResponse.json(activity)
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const { activityId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await requireAccess(user.id, 'projects', 'write')

    await deleteActivity(activityId, ctx.companyId)
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
