// src/app/api/mto/categories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMaterialCategories, createMaterialCategory, updateMaterialCategory, deleteMaterialCategory } from '@/lib/db/queries'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'library', 'read')
    return NextResponse.json({ data: await getMaterialCategories(ctx.companyId) })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'library', 'write')
    const body = await req.json()
    if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
    return NextResponse.json({ data: await createMaterialCategory(ctx.companyId, ctx.userId, body) }, { status: 201 })
  } catch (err: any) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
    throw err
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'library', 'write')
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    return NextResponse.json({ data: await updateMaterialCategory(body.id, ctx.companyId, body) })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'library', 'write')
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await deleteMaterialCategory(id, ctx.companyId)
    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}
