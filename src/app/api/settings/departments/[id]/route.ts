export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireBilling, ForbiddenError } from '@/lib/auth/access'
import { prisma } from '@/lib/db/prisma'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await requireBilling(user.id)

    const body = await request.json()
    const department = await prisma.department.update({
      where: { id, companyId: ctx.companyId },
      data: {
        ...(body.name != null && { name: body.name.trim() }),
        ...(body.color != null && { color: body.color }),
        ...(body.sortOrder != null && { sortOrder: body.sortOrder }),
      },
    })
    return NextResponse.json(department)
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    if ((e as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'A department with this name already exists' }, { status: 409 })
    }
    throw e
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await requireBilling(user.id)

    // Check if any employees are assigned
    const count = await prisma.employee.count({ where: { departmentId: id, companyId: ctx.companyId } })
    if (count > 0) {
      return NextResponse.json({ error: `Cannot delete — ${count} employee(s) assigned to this department` }, { status: 400 })
    }

    await prisma.department.delete({ where: { id, companyId: ctx.companyId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    if (e instanceof Error) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }
}
