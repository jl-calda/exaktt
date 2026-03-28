// src/app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDocuments, createDocument, updateDocument, deleteDocument, getNextDocRef } from '@/lib/db/queries'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'

// Determine access module from docType
function moduleFor(docType: string) {
  if (docType === 'purchase_order' || docType === 'delivery_order') return 'logistics' as const
  if (docType === 'quotation') return 'tenders' as const
  return 'logistics' as const
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const docType = req.nextUrl.searchParams.get('docType') ?? undefined
  const mod = docType ? moduleFor(docType) : 'logistics'
  try {
    const ctx = await requireAccess(user.id, mod, 'read')
    return NextResponse.json({ data: await getDocuments(ctx.companyId, docType) })
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
    const body = await req.json()
    const mod = moduleFor(body.docType ?? 'custom')
    const ctx = await requireAccess(user.id, mod, 'write')

    // Auto-generate reference if not provided
    if (!body.ref && body.docType) {
      const prefixMap: Record<string, string> = {
        purchase_order: 'PO',
        delivery_order: 'DO',
        quotation: 'QUO',
        custom: 'DOC',
      }
      const prefix = prefixMap[body.docType] ?? 'DOC'
      body.ref = await getNextDocRef(ctx.companyId, prefix)
    }

    const doc = await createDocument(ctx.companyId, ctx.userId, body)
    return NextResponse.json({ data: doc }, { status: 201 })
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
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    // Use logistics as default since we don't know the docType from body
    const ctx = await requireAccess(user.id, 'logistics', 'write')
    const doc = await updateDocument(body.id, ctx.companyId, body)
    return NextResponse.json({ data: doc })
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
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const ctx = await requireAccess(user.id, 'logistics', 'write')
    await deleteDocument(body.id, ctx.companyId)
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
