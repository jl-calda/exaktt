export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'
import { addTeamMember } from '@/lib/db/queries'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const access = await requireAccess(user.id, 'projects', 'write')

    const body = await request.json()
    if (!body.name && !body.userId) {
      return NextResponse.json({ error: 'Name or userId is required' }, { status: 400 })
    }

    const member = await addTeamMember(id, access.companyId, body)
    return NextResponse.json(member, { status: 201 })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
