export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireBilling, ForbiddenError } from '@/lib/auth/access'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await requireBilling(user.id)

    const departments = await prisma.department.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(departments)
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
    const ctx = await requireBilling(user.id)

    const body = await request.json()
    if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const department = await prisma.department.create({
      data: {
        companyId: ctx.companyId,
        name: body.name.trim(),
        color: body.color || '#64748b',
        sortOrder: body.sortOrder ?? 0,
      },
    })
    return NextResponse.json(department, { status: 201 })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    if ((e as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'A department with this name already exists' }, { status: 409 })
    }
    throw e
  }
}
