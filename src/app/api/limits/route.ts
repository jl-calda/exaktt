// src/app/api/limits/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompanyPlan } from '@/lib/db/queries'
import { getLimits, PLAN_META } from '@/lib/limits'
import { prisma } from '@/lib/db/prisma'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ctx = await requireAccess(user.id, 'systems', 'read')

    const plan   = await getCompanyPlan(ctx.companyId)
    const limits = getLimits(plan)

    const [systemCount, jobCount, libraryCount] = await Promise.all([
      prisma.mtoSystem.count({ where: { companyId: ctx.companyId, isArchived: false } }),
      prisma.mtoJob.count({ where: { companyId: ctx.companyId, isArchived: false } }),
      prisma.libraryItem.count({ where: { companyId: ctx.companyId } }),
    ])

    return NextResponse.json({
      data: {
        plan,
        planMeta: PLAN_META[plan],
        limits,
        usage: {
          systems:      systemCount,
          jobs:         jobCount,
          libraryItems: libraryCount,
        },
      },
    })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
