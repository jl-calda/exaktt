// src/app/api/billing/portal/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPortalSession } from '@/lib/stripe'
import { prisma } from '@/lib/db/prisma'
import { requireBilling, ForbiddenError } from '@/lib/auth/access'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ctx = await requireBilling(user.id)

    const company = await prisma.company.findUnique({
      where:  { id: ctx.companyId },
      select: { stripeCustomerId: true },
    })
    const stripeCustomerId = company?.stripeCustomerId

    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
    }

    const { returnUrl } = await req.json().catch(() => ({}))
    const session = await createPortalSession(
      stripeCustomerId,
      returnUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/billing`
    )

    return NextResponse.json({ url: session.url })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
