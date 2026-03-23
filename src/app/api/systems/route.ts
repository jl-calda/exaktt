// src/app/api/systems/route.ts — redirects to /api/mto/systems
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/systems', req.url))
}

export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/systems', req.url), { status: 307 })
}
