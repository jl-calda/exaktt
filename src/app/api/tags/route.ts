// src/app/api/tags/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGlobalTags, upsertGlobalTags, getCompanyPlan } from '@/lib/db/queries'
import { getLimits } from '@/lib/limits'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'library', 'read')
    return NextResponse.json({ data: await getGlobalTags(ctx.companyId) })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'library', 'write')
    const plan   = await getCompanyPlan(ctx.companyId)
    const limits = getLimits(plan)
    if (!limits.tags) return NextResponse.json({ error: 'Tags require Pro or Max plan', upgradeTo: 'PRO' }, { status: 402 })
    const { tags } = await req.json()
    await upsertGlobalTags(ctx.companyId, ctx.userId, tags)
    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}
