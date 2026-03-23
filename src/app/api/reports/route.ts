// src/app/api/reports/route.ts — redirects to /api/mto/reports
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/reports', req.url))
}

export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/reports', req.url), { status: 307 })
}
