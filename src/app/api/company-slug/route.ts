// src/app/api/company-slug/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany } from '@/lib/db/queries'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const company = await getUserCompany(user.id)
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 })

  const response = NextResponse.json({ slug: company.slug })
  response.cookies.set('x-company-slug', company.slug, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
  return response
}
