// src/app/api/jobs/route.ts — redirects to /api/mto/jobs
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.search
  return NextResponse.redirect(new URL(`/api/mto/jobs${qs}`, req.url))
}

export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/jobs', req.url), { status: 307 })
}
