// src/components/projects/MilestoneModal.tsx
'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b']

interface Props {
  milestone?: { id: string; name: string; description?: string | null; color: string; startDate?: string | null; endDate?: string | null }
  onSave: (data: any) => void
  onClose: () => void
}

export default function MilestoneModal({ milestone, onSave, onClose }: Props) {
  const [name, setName] = useState(milestone?.name ?? '')
  const [description, setDescription] = useState(milestone?.description ?? '')
  const [color, setColor] = useState(milestone?.color ?? '#3b82f6')
  const [startDate, setStartDate] = useState(
    milestone?.startDate ? new Date(milestone.startDate).toISOString().split('T')[0] : ''
  )
  const [endDate, setEndDate] = useState(
    milestone?.endDate ? new Date(milestone.endDate).toISOString().split('T')[0] : ''
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      description: description || null,
      color,
      startDate: startDate || null,
      endDate: endDate || null,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-50 rounded-2xl shadow-float w-full max-w-sm mx-4 animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <h2 className="font-semibold text-sm text-ink">
            {milestone ? 'Edit Milestone' : 'New Milestone'}
          </h2>
          <button onClick={onClose} className="text-ink-faint hover:text-ink"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="label mb-1">Name *</label>
            <input className="input w-full" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Foundation Work" />
          </div>
          <div>
            <label className="label mb-1">Description</label>
            <textarea className="input w-full" rows={2} value={description}
              onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div>
            <label className="label mb-1">Color</label>
            <div className="flex gap-1.5">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    background: c,
                    borderColor: color === c ? c : 'transparent',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }} />
              ))}
            </div>
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
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-surface-200">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSave} disabled={!name.trim()}>
            {milestone ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}
