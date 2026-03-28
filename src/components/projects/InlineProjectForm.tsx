'use client'

import { useState, useCallback, useRef } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function shiftDate(dateStr: string, days: number): string {
  if (!dateStr) return dateStr
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

interface InlineProjectFormProps {
  project?: {
    id: string; name: string; clientName?: string | null
    address?: string | null; status: string
    startDate?: string | null; endDate?: string | null
    contractValue: number; managerName?: string | null; managerId?: string | null
  }
  clients?: { id: string; name: string; address?: string | null }[]
  members?: { userId: string; user: { id: string; name: string | null; email: string } }[]
  currency?: string
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}

export default function InlineProjectForm({ project, clients, members, currency = 'SGD', onSave, onCancel }: InlineProjectFormProps) {
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(project?.name ?? '')
  const [clientName, setClientName] = useState(project?.clientName ?? '')
  const [address, setAddress] = useState(project?.address ?? '')
  const [status, setStatus] = useState(project?.status ?? 'PLANNING')
  const [startDate, setStartDate] = useState(
    project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : ''
  )
  const [endDate, setEndDate] = useState(
    project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : ''
  )
  const [contractValue, setContractValue] = useState(project?.contractValue ?? 0)
  const [managerName, setManagerName] = useState(project?.managerName ?? '')
  const [managerId, setManagerId] = useState(project?.managerId ?? '')
  const [saving, setSaving] = useState(false)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
  }, [onCancel])

  const handleDateKey = (
    e: React.KeyboardEvent<HTMLInputElement>,
    value: string,
    setter: (v: string) => void,
  ) => {
    if (e.key === 'ArrowUp' && value) { e.preventDefault(); setter(shiftDate(value, -1)) }
    if (e.key === 'ArrowDown' && value) { e.preventDefault(); setter(shiftDate(value, 1)) }
  }

  const handleSave = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        clientName: clientName || null,
        address: address || null,
        status,
        startDate: startDate || null,
        endDate: endDate || null,
        contractValue,
        managerName: managerName || null,
        managerId: managerId || null,
      })
    } finally { setSaving(false) }
  }

  return (
    <div className="animate-fade-in flex flex-col gap-3 py-3 px-3" onKeyDown={handleKeyDown}>
      {/* Row 1: Icon + Name + Save/Cancel */}
      <div className="flex items-center gap-2">
        <span className="text-sm shrink-0 leading-none">📊</span>
        <input
          ref={nameRef}
          autoFocus
          className="input flex-1 h-7 text-xs min-w-0"
          placeholder="Project name..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
        />
        <Button variant="primary" size="xs" icon={<Check className="w-3.5 h-3.5" />}
          disabled={!name.trim() || saving} loading={saving} onClick={handleSave}>
          Save
        </Button>
        <Button variant="ghost" size="xs" onClick={onCancel} title="Cancel (Esc)">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Client & Address */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Client</span>
          {clients && clients.length > 0 ? (
            <select
              className="input h-5 text-[10px] text-ink-muted py-0 px-1.5 w-full"
              value={clientName}
              onChange={e => {
                const selected = clients.find(c => c.name === e.target.value)
                setClientName(e.target.value)
                if (selected?.address) setAddress(selected.address)
              }}
            >
              <option value="">No client</option>
              {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          ) : (
            <input
              className="input h-5 text-[10px] text-ink-muted py-0 px-1.5 w-full"
              placeholder="Client name"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
            />
          )}
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Address</span>
          <input
            className="input h-5 text-[10px] text-ink-muted py-0 px-1.5 w-full"
            placeholder="Address"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
        </div>
      </div>

      {/* Schedule */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Schedule</span>
        <div className="flex items-center gap-2">
          <input
            type="date" className="input h-5 text-[10px] text-ink-muted py-0 px-1.5 w-[110px]"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            onKeyDown={e => handleDateKey(e, startDate, setStartDate)}
            title="Arrow Up/Down to adjust"
          />
          <span className="text-[10px] text-ink-faint">&rarr;</span>
          <input
            type="date" className="input h-5 text-[10px] text-ink-muted py-0 px-1.5 w-[110px]"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            onKeyDown={e => handleDateKey(e, endDate, setEndDate)}
            title="Arrow Up/Down to adjust"
          />
        </div>
      </div>

      {/* Status & Value */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Status</span>
          <select className="input h-5 text-[10px] text-ink-muted py-0 px-1.5 w-32" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Value</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-ink-faint font-mono">{currency}</span>
            <input
              type="number" className="input h-5 text-[10px] text-ink-muted py-0 px-1.5 w-24 text-right font-mono"
              placeholder="0" value={contractValue || ''}
              onChange={e => setContractValue(Number(e.target.value))}
              min={0}
            />
          </div>
        </div>
      </div>

      {/* PM */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">PM</span>
        {members && members.length > 0 ? (
          <select
            className="input h-5 text-[10px] text-ink-muted py-0 px-1.5 w-48 min-w-0"
            value={managerId}
            onChange={e => {
              const selected = members.find(m => m.userId === e.target.value)
              setManagerId(e.target.value)
              setManagerName(selected?.user?.name ?? '')
            }}
          >
            <option value="">No PM</option>
            {members.map(m => (
              <option key={m.userId} value={m.userId}>{m.user.name || m.user.email}</option>
            ))}
          </select>
        ) : (
          <input
            className="input h-5 text-[10px] text-ink-muted py-0 px-1.5 w-48 min-w-0"
            placeholder="Manager"
            value={managerName}
            onChange={e => setManagerName(e.target.value)}
          />
        )}
      </div>
    </div>
  )
}
