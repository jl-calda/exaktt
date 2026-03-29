// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

const SKIP_PREFIXES = ['/_next', '/api', '/auth', '/invite', '/report', '/favicon']

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Supabase sometimes redirects the auth code to the site root instead of
  // /auth/callback. Forward it so the code exchange handler picks it up.
  if (pathname === '/' && searchParams.has('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  // Skip non-app routes (API, auth, static assets, etc.)
  if (SKIP_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Root page handles its own redirect logic
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Read company slug from cookie
  const slug = request.cookies.get('x-company-slug')?.value
  if (!slug) {
    // No slug cookie = not logged in or cookie expired → redirect to login
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Rewrite internally: /dashboard → /acme-corp/dashboard
  // The browser URL stays the same, only internal routing changes
  const url = request.nextUrl.clone()
  url.pathname = `/${slug}${pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next|api|auth|invite|report|favicon).*)'],
}
