'use client'
import { useState, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, NumberInput } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

interface Props {
  linkedUrl?: string | null
  linkedLabel?: string | null
  onSave: () => void
  onCancel: () => void
}

export default function TaskForm({ linkedUrl, linkedLabel, onSave, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState('medium')
  const [targetDate, setTargetDate] = useState('')
  const [checklist, setChecklist] = useState<{ id: string; text: string; checked: boolean }[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/team').then(r => r.json()).then(j => { if (j.data) setMembers(j.data) })
  }, [])

  const addChecklistItem = () => setChecklist(prev => [...prev, { id: nanoid(), text: '', checked: false }])

  const handleSave = async () => {
    if (!title.trim() || !assigneeId) return
    setSaving(true)
    await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, description: description || null, assigneeId, priority,
        targetDate: targetDate || null,
        linkedUrl: linkedUrl || null,
        linkedType: linkedUrl?.includes('/report/') ? 'tender_report' : linkedUrl?.includes('/tenders') ? 'tender' : linkedUrl?.includes('/products') ? 'product' : null,
        linkedLabel: linkedLabel || null,
        checklist: checklist.filter(c => c.text.trim()),
      }),
    })
    setSaving(false)
    onSave()
  }

  return (
    <div className="p-4 space-y-3">
      <div className="text-xs font-bold text-ink-faint uppercase tracking-wide">New Task</div>
      <Input label="Title *" value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" />
      <div>
        <label className="label">Description</label>
        <textarea className="input text-xs resize-none" rows={2} value={description}
          onChange={e => setDescription(e.target.value)} placeholder="Details..." />
      </div>
      <Select label="Assign to *" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
        options={[{ value: '', label: '— select team member —' }, ...members.map((m: any) => ({ value: m.userId, label: m.user?.name || m.user?.email }))]} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Priority" value={priority} onChange={e => setPriority(e.target.value)}
          options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
        <Input label="Target date" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
      </div>
      {linkedUrl && (
        <div className="text-[10px] text-ink-faint bg-surface-50 border border-surface-200 px-2.5 py-1.5 rounded flex items-center gap-1.5">
          <span className="text-primary font-semibold">
            {linkedUrl.includes('/report/') ? '📋 Linked to Report'
            : linkedUrl.includes('/tenders/') ? '📑 Linked to Tender'
            : linkedUrl.includes('/products/') ? '📦 Linked to Product'
            : '🔗 Linked to Page'}
          </span>
          {linkedLabel && <span className="text-ink-muted">— {linkedLabel}</span>}
        </div>
      )}
      {/* Checklist */}
      <div>
        <div className="flex items-center justify-between">
          <label className="label mb-0">Checklist</label>
          <button onClick={addChecklistItem} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add item</button>
        </div>
        {checklist.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 mt-1">
            <input className="input text-xs flex-1" value={item.text} placeholder={`Item ${i + 1}`}
              onChange={e => setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, text: e.target.value } : c))} />
            <button onClick={() => setChecklist(prev => prev.filter(c => c.id !== item.id))} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="primary" loading={saving} onClick={handleSave} disabled={!title.trim() || !assigneeId}>Create Task</Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
