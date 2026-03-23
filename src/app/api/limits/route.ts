// src/app/api/limits/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompanyPlan } from '@/lib/db/queries'
import { getLimits, PLAN_META } from '@/lib/limits'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan   = await getCompanyPlan(user.id)
  const limits = getLimits(plan)

  const [systemCount, jobCount, libraryCount] = await Promise.all([
    prisma.mtoSystem.count({ where: { userId: user.id, isArchived: false } }),
    prisma.mtoJob.count({ where: { userId: user.id, isArchived: false } }),
    prisma.libraryItem.count({ where: { userId: user.id } }),
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
}
