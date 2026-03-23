// src/app/api/library/route.ts — redirects to /api/mto/library
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/library', req.url))
}

export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/library', req.url), { status: 307 })
}

export async function PATCH(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/library', req.url), { status: 307 })
}

export async function DELETE(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/mto/library', req.url), { status: 307 })
}
