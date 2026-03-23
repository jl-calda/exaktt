// src/app/api/tags/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGlobalTags, upsertGlobalTags } from '@/lib/db/queries'
import { getUserPlan } from '@/lib/db/queries'
import { getLimits } from '@/lib/limits'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ data: await getGlobalTags(user.id) })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const plan   = await getUserPlan(user.id)
  const limits = getLimits(plan)
  if (!limits.tags) return NextResponse.json({ error: 'Tags require Pro or Max plan', upgradeTo: 'PRO' }, { status: 402 })
  const { tags } = await req.json()
  await upsertGlobalTags(user.id, tags)
  return NextResponse.json({ data: { success: true } })
}
