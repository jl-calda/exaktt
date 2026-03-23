// src/app/api/reports/[id]/route.ts — redirects to /api/mto/reports/[id]
import { NextRequest, NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  return NextResponse.redirect(new URL(`/api/mto/reports/${id}`, req.url))
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  return NextResponse.redirect(new URL(`/api/mto/reports/${id}`, req.url), { status: 307 })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  return NextResponse.redirect(new URL(`/api/mto/reports/${id}`, req.url), { status: 307 })
}
