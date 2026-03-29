// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertUser } from '@/lib/db/queries'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Ensure user row exists in our DB
      await upsertUser(
        data.user.id,
        data.user.email ?? '',
        data.user.user_metadata?.full_name ?? data.user.user_metadata?.name,
      )

      // Set company slug cookie for middleware rewrite
      const member = await prisma.companyMember.findFirst({
        where: { userId: data.user.id },
        include: { company: { select: { slug: true } } },
      })

      const response = NextResponse.redirect(`${origin}${next}`)
      if (member?.company?.slug) {
        response.cookies.set('x-company-slug', member.company.slug, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365, // 1 year
        })
      }
      return response
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
