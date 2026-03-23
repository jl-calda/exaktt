// src/app/api/reports/[id]/pdf/route.ts — redirects to /api/mto/reports/[id]/pdf
import { NextRequest, NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  return NextResponse.redirect(new URL(`/api/mto/reports/${id}/pdf`, req.url))
}
