// src/app/api/jobs/[id]/route.ts — redirects to /api/mto/jobs/[id]
import { NextRequest, NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  return NextResponse.redirect(new URL(`/api/mto/jobs/${id}`, req.url))
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  return NextResponse.redirect(new URL(`/api/mto/jobs/${id}`, req.url), { status: 307 })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  return NextResponse.redirect(new URL(`/api/mto/jobs/${id}`, req.url), { status: 307 })
}
