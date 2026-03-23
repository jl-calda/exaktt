// src/app/api/dev/set-free/route.ts
// DEV ONLY — reverts the current user's company to FREE plan.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany } from '@/lib/db/queries'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const company = await getUserCompany(user.id)
  if (!company) return NextResponse.json({ error: 'No company found' }, { status: 400 })

  await prisma.company.update({ where: { id: company.id }, data: { plan: 'FREE' } })

  return NextResponse.json({ ok: true, message: `Company ${company.name} reverted to FREE` })
}
