'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import InlineEmojiPicker from './InlineEmojiPicker'

/** Shift a YYYY-MM-DD date string by +/- days */
function shiftDate(dateStr: string, days: number): string {
  if (!dateStr) return dateStr
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

interface InlineMilestoneFormProps {
  milestone?: {
    id: string; name: string; description?: string | null
    color: string; startDate?: string | null; endDate?: string | null
    icon?: string | null
  }
  defaultColor: string
  defaultIcon: string
  onSave: (data: {
    name: string; description: string | null; color: string
    startDate: string | null; endDate: string | null
    icon: string
  }) => Promise<void>
  onCancel: () => void
}

export default function InlineMilestoneForm({
  milestone, defaultColor, defaultIcon, onSave, onCancel,
}: InlineMilestoneFormProps) {
  const [name, setName] = useState(milestone?.name ?? '')
  const [description, setDescription] = useState(milestone?.description ?? '')
  const [icon, setIcon] = useState(milestone?.icon ?? defaultIcon)
  const [startDate, setStartDate] = useState(
    milestone?.startDate ? new Date(milestone.startDate).toISOString().split('T')[0] : ''
  )
  const [endDate, setEndDate] = useState(
    milestone?.endDate ? new Date(milestone.endDate).toISOString().split('T')[0] : ''
  )
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const color = milestone?.color ?? defaultColor

  const handleSave = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        color, icon,
        startDate: startDate || null,
        endDate: endDate || null,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
  }

  const handleDateKey = (
    e: React.KeyboardEvent<HTMLInputElement>,
    value: string,
    setter: (v: string) => void,
  ) => {
    if (e.key === 'ArrowUp' && value) { e.preventDefault(); setter(shiftDate(value, -1)) }
    if (e.key === 'ArrowDown' && value) { e.preventDefault(); setter(shiftDate(value, 1)) }
  }

  return (
    <div className="animate-fade-in flex flex-col gap-3 py-3 px-3" onKeyDown={handleKeyDown}>
      {/* Icon + Name + Save + Cancel */}
      <div className="flex items-center gap-2">
        <InlineEmojiPicker value={icon} onChange={setIcon} />
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} title={`Auto color`} />
        <input
          ref={nameRef}
          autoFocus
          className="input flex-1 h-7 text-xs min-w-0"
          placeholder="Milestone name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button variant="primary" size="xs" icon={<Check className="w-3.5 h-3.5" />}
          disabled={!name.trim() || saving} loading={saving} onClick={handleSave}>
          Save
        </Button>
        <Button variant="ghost" size="xs" onClick={onCancel} title="Cancel (Esc)">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Description</span>
        <input
          className="input h-7 text-xs min-w-0 w-full"
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Schedule */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Schedule</span>
        <div className="flex items-center gap-2 text-xs text-ink-faint">
        <input
          type="date" className="input h-6 text-[11px] w-[110px]"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          onKeyDown={(e) => handleDateKey(e, startDate, setStartDate)}
          title="Arrow Up/Down to adjust"
        />
        <span>&rarr;</span>
        <input
          type="date" className="input h-6 text-[11px] w-[110px]"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          onKeyDown={(e) => handleDateKey(e, endDate, setEndDate)}
          title="Arrow Up/Down to adjust"
        />
        <span className="text-[10px] italic">Auto-filled from activities</span>
        </div>
      </div>
    </div>
  )
}
