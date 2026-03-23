// src/app/api/mto/certifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCertifications, createCertification, deleteCertification } from '@/lib/db/queries'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const itemId = req.nextUrl.searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })
  return NextResponse.json({ data: await getCertifications(itemId, user.id) })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.libraryItemId || !body.type) return NextResponse.json({ error: 'libraryItemId and type required' }, { status: 400 })
  // Convert date strings to Date objects
  if (body.issuedDate) body.issuedDate = new Date(body.issuedDate)
  if (body.expiryDate) body.expiryDate = new Date(body.expiryDate)
  return NextResponse.json({ data: await createCertification(user.id, body) }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const cert = await deleteCertification(id, user.id)
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
}
