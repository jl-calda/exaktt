// src/app/api/mto/activities/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActivityLibrary, createActivityLibraryItem } from '@/lib/db/queries'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'library', 'read')
    return NextResponse.json({ data: await getActivityLibrary(ctx.companyId) })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'library', 'write')
    const body = await req.json()
    return NextResponse.json({ data: await createActivityLibraryItem(ctx.companyId, ctx.userId, body) }, { status: 201 })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}
