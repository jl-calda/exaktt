// src/app/api/settings/domain/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireBilling } from '@/lib/auth/access'
import { prisma } from '@/lib/db/prisma'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ctx = await requireBilling(user.id)
    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { slug: true, customDomain: true, domainVerified: true },
    })
    return NextResponse.json({ data: company })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 })
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ctx = await requireBilling(user.id)
    const body = await req.json()
    const { customDomain } = body

    // Validate domain format
    if (customDomain && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(customDomain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
    }

    const company = await prisma.company.update({
      where: { id: ctx.companyId },
      data: {
        customDomain: customDomain || null,
        domainVerified: false, // Reset verification when domain changes
      },
      select: { slug: true, customDomain: true, domainVerified: true },
    })
    return NextResponse.json({ data: company })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'This domain is already in use' }, { status: 409 })
    return NextResponse.json({ error: e.message }, { status: 403 })
  }
}
