export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'
import { getActivityCategories, createActivityCategory } from '@/lib/db/queries'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await requireAccess(user.id, 'projects', 'read')

    const categories = await getActivityCategories(ctx.companyId)
    return NextResponse.json(categories)
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await requireAccess(user.id, 'projects', 'write')

    const body = await request.json()
    if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const category = await createActivityCategory(ctx.companyId, {
      name: body.name.trim(),
      color: body.color || undefined,
      sortOrder: body.sortOrder ?? undefined,
    })
    return NextResponse.json(category, { status: 201 })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    if ((e as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })
    }
    throw e
  }
}
