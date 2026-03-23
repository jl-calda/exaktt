// src/app/api/mto/specs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompanyPlan, getLibraryItems, updateLibraryItem } from '@/lib/db/queries'
import { getLimits } from '@/lib/limits'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'read')
    const plan   = await getCompanyPlan(ctx.companyId)
    const limits = getLimits(plan)
    if (!limits.stockInfo && !limits.pricing) {
      return NextResponse.json({ error: 'Requires Pro plan', upgradeTo: 'PRO' }, { status: 402 })
    }
    return NextResponse.json({ data: await getLibraryItems(ctx.companyId) })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'systems', 'write')
    const plan   = await getCompanyPlan(ctx.companyId)
    const limits = getLimits(plan)
    if (!limits.stockInfo && !limits.pricing) {
      return NextResponse.json({ error: 'Requires Pro plan', upgradeTo: 'PRO' }, { status: 402 })
    }
    const { id, spec } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    return NextResponse.json({ data: await updateLibraryItem(id, ctx.companyId, { spec }) })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}
