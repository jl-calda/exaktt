// src/app/(app)/logistics/documents/[id]/DocumentBuilderClient.tsx
'use client'
import { useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import DocBuilder from '@/components/doc-builder/DocBuilder'
import type { DocBlock, DocBranding, DocSettings } from '@/lib/doc-builder/types'

interface Props {
  document: {
    id: string
    title: string
    ref: string | null
    status: string
    docType: string
    blocks: any
    settings: any
  }
  branding: DocBranding
}

export default function DocumentBuilderClient({ document: doc, branding }: Props) {
  const handleSave = useCallback(async (data: { title: string; ref: string | null; status: string; blocks: DocBlock[] }) => {
    const res = await fetch('/api/documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: doc.id, ...data }),
    })
    if (!res.ok) throw new Error('Save failed')
  }, [doc.id])

  return (
    <div className="flex flex-col h-[calc(100vh-52px)]">
      {/* Back link */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-surface-200 bg-surface-50">
        <Link href="/logistics" className="btn-ghost inline-flex items-center gap-1 px-2 py-1 text-[10px]">
          <ArrowLeft className="w-3 h-3" /> Back to Logistics
        </Link>
      </div>

      {/* Builder */}
      <div className="flex-1 overflow-hidden">
        <DocBuilder
          documentId={doc.id}
          initialBlocks={(doc.blocks ?? []) as DocBlock[]}
          initialTitle={doc.title}
          initialRef={doc.ref}
          initialStatus={doc.status}
          branding={branding}
          settings={(doc.settings ?? null) as DocSettings | null}
          docType={doc.docType}
          onSave={handleSave}
        />
      </div>
    </div>
  )
}
