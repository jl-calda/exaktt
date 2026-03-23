// src/app/api/mto/certifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCertifications, createCertification, deleteCertification } from '@/lib/db/queries'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const ctx = await requireAccess(user.id, 'library', 'read')
    const itemId = req.nextUrl.searchParams.get('itemId')
    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })
    return NextResponse.json({ data: await getCertifications(itemId, ctx.companyId) })
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
    if (!body.libraryItemId || !body.type) return NextResponse.json({ error: 'libraryItemId and type required' }, { status: 400 })
    // Convert date strings to Date objects
    if (body.issuedDate) body.issuedDate = new Date(body.issuedDate)
    if (body.expiryDate) body.expiryDate = new Date(body.expiryDate)
    return NextResponse.json({ data: await createCertification(ctx.companyId, ctx.userId, body) }, { status: 201 })
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
    const cert = await deleteCertification(id, ctx.companyId)
    // Delete file from Supabase storage if one exists
    if (cert?.fileUrl) {
      const storageClient = createClient()
      const url  = new URL(cert.fileUrl)
      const path = url.pathname.split('/material-certs/')[1]
      if (path) {
        const s = await storageClient
        ;(await s).storage.from('material-certs').remove([path])
      }
    }
    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    throw err
  }
}
