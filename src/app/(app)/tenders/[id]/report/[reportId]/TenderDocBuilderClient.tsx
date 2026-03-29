// src/app/(app)/tenders/[id]/report/[reportId]/TenderDocBuilderClient.tsx
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Flag, FileText, Calculator, Paperclip, StickyNote, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { useTaskStore } from '@/store'
import DocBuilder from '@/components/doc-builder/DocBuilder'
import CreateProjectFromTenderModal from '@/components/projects/CreateProjectFromTenderModal'
import ReportCalculatorTab from '@/components/tenders/ReportCalculatorTab'
import ReportAttachmentsTab from '@/components/tenders/ReportAttachmentsTab'
import ReportNotesTab from '@/components/tenders/ReportNotesTab'
import type { DocBlock, DocBranding, DocSettings, DocEstimate } from '@/lib/doc-builder/types'

type ReportTab = 'document' | 'calculator' | 'attachments' | 'notes'

const REPORT_TABS: { key: ReportTab; label: string; icon: typeof FileText }[] = [
  { key: 'document',    label: 'Document',    icon: FileText },
  { key: 'calculator',  label: 'Calculator',  icon: Calculator },
  { key: 'attachments', label: 'Attachments', icon: Paperclip },
  { key: 'notes',       label: 'Notes',       icon: StickyNote },
]

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
    notes?: string | null
    attachments?: any[]
  }
  branding: DocBranding
  blocks: DocBlock[]
  templates?: { id: string; name: string; category: string; blockTitle?: string; blockContent?: string }[]
  estimates?: DocEstimate[]
  systems?: any[]
  allJobs?: any[]
  globalTags?: any[]
  plan?: any
  userId?: string
  tenderId?: string
}

export default function TenderDocBuilderClient({ tender, report, branding, blocks, templates, estimates, systems, allJobs, globalTags, plan, userId, tenderId }: Props) {
  const router = useRouter()
  const openTaskDrawer = useTaskStore(s => s.openDrawer)
  const [activeTab, setActiveTab] = useState<ReportTab>('document')
  const [tenderStatus, setTenderStatus] = useState<TenderStatus>((tender.status as TenderStatus) ?? 'DRAFT')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [currentEstimates, setCurrentEstimates] = useState(estimates ?? [])

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

        {/* Assign Task */}
        <button
          onClick={() => openTaskDrawer(`/tenders/${tender.id}/report/${report.id}`, {
            createMode: true,
            linkedLabel: `${tender.name} — ${report.reference || report.title}`,
          })}
          className="btn-ghost text-[10px] inline-flex items-center gap-1 px-2 py-1"
          title="Assign task for this report"
        >
          <ClipboardList className="w-3 h-3" /> Assign Task
        </button>

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

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-1 border-b border-surface-200 bg-surface-50">
        {REPORT_TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                active ? 'active' : ''
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.2 : 1.8} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'document' && (
          <DocBuilder
            documentId={report.id}
            initialBlocks={blocks}
            initialTitle={report.title}
            initialRef={report.reference}
            initialStatus={report.status}
            branding={branding}
            docType="quotation"
            templates={templates}
            estimates={currentEstimates}
            onSave={handleSave}
          />
        )}

        {activeTab === 'calculator' && (
          <ReportCalculatorTab
            systems={systems ?? []}
            allJobs={allJobs ?? []}
            globalTags={globalTags ?? []}
            plan={plan}
            tenderId={tenderId ?? tender.id}
            onEstimateAdded={(est: DocEstimate) => {
              setCurrentEstimates(prev => [...prev, est])
            }}
          />
        )}

        {activeTab === 'attachments' && (
          <ReportAttachmentsTab
            reportId={report.id}
            tenderId={tender.id}
            initialAttachments={report.attachments ?? []}
          />
        )}

        {activeTab === 'notes' && (
          <ReportNotesTab
            reportId={report.id}
            tenderId={tender.id}
            initialNotes={report.notes ?? null}
          />
        )}
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
