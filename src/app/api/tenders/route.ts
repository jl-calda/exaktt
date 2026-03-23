// src/app/api/tenders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenders, createTender } from '@/lib/db/queries'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'tenders', 'read')
    const tenders = await getTenders(ctx.companyId)
    return NextResponse.json({ data: tenders })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'tenders', 'write')
    const body = await req.json()
    const { name, clientId, clientName, projectName, reference, submissionDate, notes } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    const tender = await createTender(ctx.companyId, ctx.userId, {
      name: name.trim(), clientId, clientName, projectName, reference,
      submissionDate: submissionDate ? new Date(submissionDate) : null,
      notes,
    })
    return NextResponse.json({ data: tender })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
