// src/app/api/team/accept/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'

// POST — accept an invite by token
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const invite = await prisma.companyInvite.findUnique({ where: { token } })
  if (!invite) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
  if (invite.acceptedAt) return NextResponse.json({ error: 'Invite already accepted' }, { status: 409 })
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 })

  // Check seat limit
  const company = await prisma.company.findUnique({ where: { id: invite.companyId }, select: { seatLimit: true, name: true } })
  const memberCount = await prisma.companyMember.count({ where: { companyId: invite.companyId } })
  if (company && company.seatLimit > 0 && memberCount >= company.seatLimit) {
    return NextResponse.json({ error: 'Company seat limit reached' }, { status: 402 })
  }

  // Check if already a member
  const existing = await prisma.companyMember.findFirst({
    where: { companyId: invite.companyId, userId: user.id },
  })
  if (existing) return NextResponse.json({ error: 'Already a member of this company' }, { status: 409 })

  // Accept: create membership + mark invite
  await prisma.$transaction([
    prisma.companyMember.create({
      data: {
        companyId: invite.companyId,
        userId: user.id,
        role: invite.role,
        permissions: invite.permissions as any,
      },
    }),
    prisma.companyInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ])

  return NextResponse.json({ data: { companyId: invite.companyId, companyName: company?.name } })
}
