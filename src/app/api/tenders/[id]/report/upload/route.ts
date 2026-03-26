import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAccess, ForbiddenError, UnauthorizedError } from '@/lib/auth/access'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const ctx = await requireAccess(user.id, 'tenders', 'write')
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${ctx.companyId}/${id}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('tender-images')
      .upload(path, file, { upsert: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: urlData } = supabase.storage
      .from('tender-images')
      .getPublicUrl(data.path)

    return NextResponse.json({ data: { url: urlData.publicUrl } })
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 })
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
