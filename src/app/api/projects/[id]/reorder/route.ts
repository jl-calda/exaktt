export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'
import { prisma } from '@/lib/db/prisma'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await requireAccess(user.id, 'projects', 'write')

    const body = await request.json()
    const { type, parentId, orderedIds } = body as {
      type: 'milestones' | 'activities'
      parentId?: string
      orderedIds: string[]
    }

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds required' }, { status: 400 })
    }

    if (type === 'milestones') {
      await Promise.all(
        orderedIds.map((id, i) =>
          prisma.projectMilestone.update({
            where: { id },
            data: { sortOrder: i },
          })
        )
      )
    } else if (type === 'activities' && parentId) {
      await Promise.all(
        orderedIds.map((id, i) =>
          prisma.projectActivity.update({
            where: { id },
            data: { sortOrder: i },
          })
        )
      )
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('Reorder error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
