// src/app/api/team/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'
import { getAccessContext, requireTeamAdmin, ForbiddenError, DEFAULT_PERMISSIONS, resolvePermissions } from '@/lib/auth/access'

// GET — list company members
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ctx = await getAccessContext(user.id)
    const members = await prisma.companyMember.findMany({
      where: { companyId: ctx.companyId },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' },
    })

    return NextResponse.json({
      data: members.map(m => ({
        companyId: m.companyId,
        userId: m.userId,
        role: m.role,
        permissions: resolvePermissions(m.role, m.permissions as any),
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }
}

// POST — invite a new member
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ctx = await requireTeamAdmin(user.id)
    const { email, role, permissions } = await req.json()

    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
    const inviteRole = role ?? 'MEMBER'

    // Check seat limit
    const company = await prisma.company.findUnique({ where: { id: ctx.companyId }, select: { seatLimit: true } })
    const memberCount = await prisma.companyMember.count({ where: { companyId: ctx.companyId } })
    if (company && company.seatLimit > 0 && memberCount >= company.seatLimit) {
      return NextResponse.json({ error: 'Seat limit reached' }, { status: 402 })
    }

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existingUser) {
      const existingMember = await prisma.companyMember.findFirst({
        where: { companyId: ctx.companyId, userId: existingUser.id },
      })
      if (existingMember) {
        return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
      }
    }

    const { nanoid } = await import('nanoid')
    const invite = await prisma.companyInvite.upsert({
      where: { companyId_email: { companyId: ctx.companyId, email } },
      update: {
        role: inviteRole,
        permissions: permissions ?? DEFAULT_PERMISSIONS[inviteRole as keyof typeof DEFAULT_PERMISSIONS] ?? {},
        token: nanoid(24),
        invitedById: ctx.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        acceptedAt: null,
      },
      create: {
        companyId: ctx.companyId,
        email,
        role: inviteRole,
        permissions: permissions ?? DEFAULT_PERMISSIONS[inviteRole as keyof typeof DEFAULT_PERMISSIONS] ?? {},
        token: nanoid(24),
        invitedById: ctx.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    // Send invite email via Supabase Auth (if service role key configured)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        const adminSupabase = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        await adminSupabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${appUrl}/invite/${invite.token}`,
          data: { invited_to: ctx.companyId, role: inviteRole },
        })
      } catch (emailErr) {
        // Email sending is best-effort — invite record still created
        console.error('Failed to send invite email:', emailErr)
      }
    }

    return NextResponse.json({ data: invite }, { status: 201 })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    throw err
  }
}
