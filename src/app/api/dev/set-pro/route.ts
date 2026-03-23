// src/app/api/dev/set-pro/route.ts
// DEV ONLY — promotes the current user's company to PRO plan.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  try {
    const ctx = await requireAccess(user.id, 'systems', 'write')

    const company = await prisma.company.update({
      where: { id: ctx.companyId },
      data: { plan: 'PRO' },
    })

    return NextResponse.json({ ok: true, message: `Company ${company.name} upgraded to PRO` })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
