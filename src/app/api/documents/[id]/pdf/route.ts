// src/app/api/documents/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDocumentById } from '@/lib/db/queries'
import { renderToBuffer } from '@react-pdf/renderer'
import { RenderDocument } from '@/lib/pdf/render'
import React from 'react'
import { requireAccess, ForbiddenError } from '@/lib/auth/access'
import type { DocBlock, DocBranding, DocSettings } from '@/lib/doc-builder/types'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  try {
    const ctx = await requireAccess(user.id, 'logistics', 'read')
    const doc = await getDocumentById(id, ctx.companyId)
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const branding: DocBranding = {
      companyName: doc.companyName,
      companyLogo: doc.companyLogo,
      companyAddr: doc.companyAddr,
      registrationNo: doc.registrationNo,
      registrationLabel: doc.registrationLabel,
      accentColor: doc.accentColor,
      currency: doc.currency,
    }

    const element = React.createElement(RenderDocument, {
      title: doc.title,
      blocks: (doc.blocks ?? []) as DocBlock[],
      branding,
      settings: (doc.settings ?? null) as DocSettings | null,
    }) as any

    const buffer = await renderToBuffer(element)
    const filename = (doc.title ?? 'document').replace(/[^a-z0-9_-]/gi, '_') + '.pdf'

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
