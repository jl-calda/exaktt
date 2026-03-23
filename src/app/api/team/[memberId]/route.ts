// src/app/api/team/[memberId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'
import { requireTeamAdmin, ForbiddenError } from '@/lib/auth/access'

// PATCH — update role/permissions of a member
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ctx = await requireTeamAdmin(user.id)
    const { memberId } = await params
    const { role, permissions } = await req.json()

    // Cannot change the owner's role
    const target = await prisma.companyMember.findFirst({
      where: { companyId: ctx.companyId, userId: memberId },
    })
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    if (target.role === 'OWNER' && ctx.role !== 'OWNER') {
      return NextResponse.json({ error: 'Cannot modify owner' }, { status: 403 })
    }
    // Only OWNER can promote to OWNER
    if (role === 'OWNER' && ctx.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owner can transfer ownership' }, { status: 403 })
    }

    const updated = await prisma.companyMember.update({
      where: { companyId_userId: { companyId: ctx.companyId, userId: memberId } },
      data: {
        ...(role !== undefined && { role }),
        ...(permissions !== undefined && { permissions }),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }
}

// DELETE — remove a member from the company
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ctx = await requireTeamAdmin(user.id)
    const { memberId } = await params

    // Cannot remove yourself if you're the owner
    if (memberId === ctx.userId && ctx.role === 'OWNER') {
      return NextResponse.json({ error: 'Owner cannot remove themselves' }, { status: 403 })
    }

    const target = await prisma.companyMember.findFirst({
      where: { companyId: ctx.companyId, userId: memberId },
    })
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    // Non-owner admins can't remove other admins or owners
    if (ctx.role === 'ADMIN' && (target.role === 'OWNER' || target.role === 'ADMIN')) {
      return NextResponse.json({ error: 'Cannot remove admin or owner' }, { status: 403 })
    }

    await prisma.companyMember.delete({
      where: { companyId_userId: { companyId: ctx.companyId, userId: memberId } },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }
}
