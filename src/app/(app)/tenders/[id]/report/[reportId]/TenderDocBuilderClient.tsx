// src/app/(app)/tenders/[id]/report/[reportId]/TenderDocBuilderClient.tsx
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Flag } from 'lucide-react'
import Link from 'next/link'
import DocBuilder from '@/components/doc-builder/DocBuilder'
import CreateProjectFromTenderModal from '@/components/projects/CreateProjectFromTenderModal'
import type { DocBlock, DocBranding, DocSettings, DocEstimate } from '@/lib/doc-builder/types'

type TenderStatus = 'DRAFT' | 'SUBMITTED' | 'WON' | 'LOST' | 'CANCELLED'

const TENDER_STATUS_META: Record<TenderStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: '#f1f5f9', color: '#64748b' },
  SUBMITTED: { label: 'Submitted', bg: '#eff6ff', color: '#1d4ed8' },
  WON:       { label: 'Won',       bg: '#f0fdf4', color: '#16a34a' },
  LOST:      { label: 'Lost',      bg: '#fef2f2', color: '#dc2626' },
  CANCELLED: { label: 'Cancelled', bg: '#f9fafb', color: '#9ca3af' },
}

const TENDER_TRANSITIONS: Record<TenderStatus, TenderStatus[]> = {
  DRAFT:     ['WON', 'LOST', 'CANCELLED'],
  SUBMITTED: ['WON', 'LOST', 'DRAFT'],
  WON:       ['DRAFT'],
  LOST:      ['DRAFT'],
  CANCELLED: ['DRAFT'],
}

interface Props {
  tender: { id: string; name: string; status: string }
  report: {
    id: string
    title: string
    reference: string | null
    status: string
    sections: any
    currency: string
  }
  branding: DocBranding
  blocks: DocBlock[]
  templates?: { id: string; name: string; category: string; blockTitle?: string; blockContent?: string }[]
  estimates?: DocEstimate[]
}

export default function TenderDocBuilderClient({ tender, report, branding, blocks, templates, estimates }: Props) {
  const router = useRouter()
  const [tenderStatus, setTenderStatus] = useState<TenderStatus>((tender.status as TenderStatus) ?? 'DRAFT')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)

  const tenderMeta = TENDER_STATUS_META[tenderStatus] ?? TENDER_STATUS_META.DRAFT
  const transitions = TENDER_TRANSITIONS[tenderStatus] ?? []

  const handleTenderStatusChange = async (newStatus: TenderStatus) => {
    setShowStatusMenu(false)
    const res = await fetch(`/api/tenders/${tender.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const { data } = await res.json()
    if (data) {
      setTenderStatus(newStatus)
      if (newStatus === 'WON') setShowCreateProject(true)
    }
  }

  const handleSave = useCallback(async (data: { title: string; ref: string | null; status: string; blocks: DocBlock[]; settings?: DocSettings }) => {
    const res = await fetch(`/api/tenders/${tender.id}/report`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: report.id,
        title: data.title,
        reference: data.ref,
        status: data.status,
        sections: data.blocks,
      }),
    })
    if (!res.ok) throw new Error('Save failed')
  }, [tender.id, report.id])

  return (
    <div className="flex flex-col h-[calc(100vh-52px)]">
      {/* Tender header bar */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-surface-200 bg-surface-50">
        <Link href={`/tenders/${tender.id}`} className="btn-ghost inline-flex items-center gap-1 px-2 py-1 text-[10px]">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>

        <div className="flex-1 min-w-0">
          <span className="text-[11px] text-ink-faint truncate">{tender.name}</span>
        </div>

        {/* Tender status dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(v => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors"
            style={{ background: tenderMeta.bg, color: tenderMeta.color }}
          >
            <Flag className="w-3 h-3" />
            {tenderMeta.label}
          </button>
          {showStatusMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 card p-1 shadow-panel min-w-[120px] animate-fade-in">
                {transitions.map(s => {
                  const meta = TENDER_STATUS_META[s]
                  return (
                    <button key={s} onClick={() => handleTenderStatusChange(s)}
                      className="w-full text-left px-3 py-1.5 rounded-md text-[11px] font-semibold hover:bg-surface-100 transition-colors flex items-center gap-2"
                      style={{ color: meta.color }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* DocBuilder */}
      <div className="flex-1 overflow-hidden">
        <DocBuilder
          documentId={report.id}
          initialBlocks={blocks}
          initialTitle={report.title}
          initialRef={report.reference}
          initialStatus={report.status}
          branding={branding}
          docType="quotation"
          templates={templates}
          estimates={estimates}
          onSave={handleSave}
        />
      </div>

      {/* Create project from won tender */}
      <CreateProjectFromTenderModal
        open={showCreateProject}
        tender={tender as any}
        report={null}
        grandTotal={0}
        onClose={() => setShowCreateProject(false)}
      />
    </div>
  )
}
