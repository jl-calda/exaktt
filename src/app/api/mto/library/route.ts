// src/app/api/mto/library/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLibraryItems, createLibraryItem, updateLibraryItem, deleteLibraryItem, addSystemToLibraryItem, removeSystemFromLibraryItem, LimitError } from '@/lib/db/queries'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ data: await getLibraryItems(user.id) })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    return NextResponse.json({ data: await createLibraryItem(user.id, body) }, { status: 201 })
  } catch (err) {
    if (err instanceof LimitError) return NextResponse.json({ error: err.message, limitCheck: err.feature }, { status: 402 })
    throw err
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (body.action === 'addSystem') {
    return NextResponse.json({ data: await addSystemToLibraryItem(body.id, body.sysId) })
  }
  if (body.action === 'removeSystem') {
    return NextResponse.json({ data: await removeSystemFromLibraryItem(body.id, body.sysId) })
  }
  return NextResponse.json({ data: await updateLibraryItem(body.id, user.id, body) })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await deleteLibraryItem(id, user.id)
  return NextResponse.json({ data: { success: true } })
}
