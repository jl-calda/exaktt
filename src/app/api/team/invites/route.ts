// src/app/api/team/invites/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'
import { requireTeamAdmin, ForbiddenError } from '@/lib/auth/access'

// GET — list pending invites
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ctx = await requireTeamAdmin(user.id)
    const invites = await prisma.companyInvite.findMany({
      where: { companyId: ctx.companyId, acceptedAt: null },
      orderBy: { expiresAt: 'desc' },
    })
    return NextResponse.json({ data: invites })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }
}

// DELETE — revoke an invite
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ctx = await requireTeamAdmin(user.id)
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const invite = await prisma.companyInvite.findFirst({
      where: { id, companyId: ctx.companyId },
    })
    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

    await prisma.companyInvite.delete({ where: { id } })
    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }
}
