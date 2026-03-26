// src/app/api/tenders/blocks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'tenders', 'read')
    const company = await prisma.company.findUnique({ where: { id: ctx.companyId }, select: { tenderTemplates: true } })
    return NextResponse.json({ data: company?.tenderTemplates ?? [] })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'tenders', 'write')
    const { blocks } = await req.json()
    if (!Array.isArray(blocks)) return NextResponse.json({ error: 'blocks must be an array' }, { status: 400 })
    await prisma.company.update({ where: { id: ctx.companyId }, data: { tenderTemplates: blocks } })
    return NextResponse.json({ data: blocks })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
