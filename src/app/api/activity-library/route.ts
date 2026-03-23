// src/app/api/activity-library/route.ts — redirects to /api/mto/activities
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/activities', req.url))
}

export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/activities', req.url), { status: 307 })
}
