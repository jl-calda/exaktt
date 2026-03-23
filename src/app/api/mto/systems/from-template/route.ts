// src/app/api/mto/systems/from-template/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMtoSystem, LimitError } from '@/lib/db/queries'
import { getSampleSystem } from '@/lib/sample-systems'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { templateKey } = await req.json()
  const sample = getSampleSystem(templateKey)
  if (!sample) return NextResponse.json({ error: 'Unknown template' }, { status: 400 })

  try {
    const ctx = await requireAccess(user.id, 'systems', 'write')
    const system = await createMtoSystem(ctx.companyId, ctx.userId, sample.template)
    return NextResponse.json({ data: system }, { status: 201 })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    if (err instanceof LimitError) return NextResponse.json({ error: err.message, limitCheck: err.feature }, { status: 402 })
    throw err
  }
}
