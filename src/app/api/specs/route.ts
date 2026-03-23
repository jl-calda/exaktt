// src/app/api/specs/route.ts — redirects to /api/mto/specs
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/specs', req.url))
}

export async function PATCH(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/specs', req.url), { status: 307 })
}
