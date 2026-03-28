export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'
import { getActivityCategories, getCompanyHoursPerDay, updateCompanyHoursPerDay } from '@/lib/db/queries'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await requireAccess(user.id, 'projects', 'read')

    const [categories, hoursPerDay] = await Promise.all([
      getActivityCategories(ctx.companyId),
      getCompanyHoursPerDay(ctx.companyId),
    ])
    return NextResponse.json({ categories, hoursPerDay })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await requireAccess(user.id, 'projects', 'write')

    const body = await request.json()
    const hoursPerDay = Number(body.hoursPerDay)
    if (!hoursPerDay || hoursPerDay < 1 || hoursPerDay > 24) {
      return NextResponse.json({ error: 'Hours per day must be between 1 and 24' }, { status: 400 })
    }

    const result = await updateCompanyHoursPerDay(ctx.companyId, hoursPerDay)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
