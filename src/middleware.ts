// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Supabase sometimes redirects the auth code to the site root instead of
  // /auth/callback. Forward it so the code exchange handler picks it up.
  if (pathname === '/' && searchParams.has('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/'],
}
