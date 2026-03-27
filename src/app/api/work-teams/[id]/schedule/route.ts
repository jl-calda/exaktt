export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'
import { getTeamSchedule } from '@/lib/db/queries'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await requireAccess(user.id, 'projects', 'read')

    const schedule = await getTeamSchedule(id, ctx.companyId)
    return NextResponse.json(schedule)
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
