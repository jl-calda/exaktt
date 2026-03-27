export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'
import { updateMilestone, deleteMilestone } from '@/lib/db/queries'

type Ctx = { params: Promise<{ id: string; milestoneId: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { milestoneId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await requireAccess(user.id, 'projects', 'write')

    const body = await request.json()
    const milestone = await updateMilestone(milestoneId, ctx.companyId, body)
    return NextResponse.json(milestone)
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const { milestoneId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await requireAccess(user.id, 'projects', 'write')

    await deleteMilestone(milestoneId, ctx.companyId)
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
