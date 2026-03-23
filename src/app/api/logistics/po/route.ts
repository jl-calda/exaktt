// src/app/api/logistics/po/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } from '@/lib/db/queries'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'logistics', 'read')
    return NextResponse.json({ data: await getPurchaseOrders(ctx.companyId) })
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
    const ctx = await requireAccess(user.id, 'logistics', 'write')
    const body = await req.json()
    return NextResponse.json({ data: await createPurchaseOrder(ctx.companyId, ctx.userId, body) }, { status: 201 })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'logistics', 'write')
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    return NextResponse.json({ data: await updatePurchaseOrder(body.id, ctx.companyId, body) })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'logistics', 'write')
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await deletePurchaseOrder(id, ctx.companyId)
    return NextResponse.json({ data: { success: true } })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
