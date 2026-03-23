// src/app/api/systems/from-template/route.ts — redirects to /api/mto/systems/from-template
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/systems/from-template', req.url), { status: 307 })
}
