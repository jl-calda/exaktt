// src/components/projects/CreateProjectFromTenderModal.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  open: boolean
  tender: any
  report: any
  grandTotal: number
  onClose: () => void
}

export default function CreateProjectFromTenderModal({ open, tender, report, grandTotal, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState(tender.projectName ?? tender.name ?? '')
  const [clientName, setClientName] = useState(report?.clientName ?? '')
  const [address, setAddress] = useState('')
  const [managerName, setManagerName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        clientName: clientName || null,
        address: address || null,
        managerName: managerName || null,
        startDate: startDate || null,
        endDate: endDate || null,
        contractValue: grandTotal,
        status: 'ACTIVE',
        tenderId: tender.id,
        reportId: report?.id ?? null,
        quotationNo: report?.reference ?? tender.reference ?? null,
        systemIds: (tender.items ?? []).map((i: any) => i.systemId).filter(Boolean),
      }),
    })
    if (!res.ok) { setSaving(false); return }
    const project = await res.json()
    setSaving(false)
    router.push(`/projects/${project.id}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-50 rounded-2xl shadow-float w-full max-w-md mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <FolderKanban className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-semibold text-sm text-ink">Create Project</h2>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-ink-muted">
            This quotation has been marked as <span className="font-semibold text-emerald-600">Won</span>.
            Create an active project to start tracking milestones and activities.
          </p>

          <div>
            <label className="label mb-1">Project Name *</label>
            <input className="input w-full" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label mb-1">Client</label>
            <input className="input w-full" value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>
          <div>
            <label className="label mb-1">Address</label>
            <input className="input w-full" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Project site address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1">Start Date</label>
              <input type="date" className="input w-full" value={startDate}
                onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label mb-1">End Date</label>
              <input type="date" className="input w-full" value={endDate}
                onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label mb-1">Project Manager</label>
            <input className="input w-full" value={managerName} onChange={e => setManagerName(e.target.value)}
              placeholder="Manager name" />
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-surface-100 rounded-lg">
            <span className="text-[10px] text-ink-faint">Contract Value</span>
            <span className="text-xs font-mono font-semibold text-ink">${grandTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-surface-200">
          <Button variant="secondary" size="sm" onClick={onClose}>Skip for now</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleCreate}
            disabled={!name.trim()}>
            Create Project
          </Button>
        </div>
      </div>
    </div>
  )
}
