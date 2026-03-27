'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MILESTONE_COLORS } from '@/components/projects/colors'

interface InlineMilestoneFormProps {
  milestone?: {
    id: string; name: string; description?: string | null
    color: string; startDate?: string | null; endDate?: string | null
  }
  defaultColor: string
  onSave: (data: {
    name: string; description: string | null; color: string
    startDate: string | null; endDate: string | null
  }) => Promise<void>
  onCancel: () => void
}

export default function InlineMilestoneForm({
  milestone, defaultColor, onSave, onCancel,
}: InlineMilestoneFormProps) {
  const [name, setName] = useState(milestone?.name ?? '')
  const [description, setDescription] = useState(milestone?.description ?? '')
  const [color, setColor] = useState(milestone?.color ?? defaultColor)
  const [startDate, setStartDate] = useState(
    milestone?.startDate ? new Date(milestone.startDate).toISOString().split('T')[0] : ''
  )
  const [endDate, setEndDate] = useState(
    milestone?.endDate ? new Date(milestone.endDate).toISOString().split('T')[0] : ''
  )
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        color,
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

  return (
    <div className="animate-fade-in flex flex-col gap-1.5 py-1.5 px-2" onKeyDown={handleKeyDown}>
      {/* Row 1: Name + Save + Cancel */}
      <div className="flex items-center gap-1.5">
        <input
          ref={nameRef}
          autoFocus
          className="input flex-1 h-7 text-xs min-w-0"
          placeholder="Milestone name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          variant="primary"
          size="xs"
          icon={<Check className="w-3.5 h-3.5" />}
          disabled={!name.trim() || saving}
          loading={saving}
          onClick={handleSave}
        >
          Save
        </Button>
        <Button variant="ghost" size="xs" onClick={onCancel} title="Cancel">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Row 2: Color dots + Description */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 shrink-0">
          {MILESTONE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="w-4 h-4 rounded-full border-2 transition-all duration-150"
              style={{
                backgroundColor: c,
                borderColor: color === c ? 'var(--color-ink)' : 'transparent',
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
              }}
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>
        <input
          className="input flex-1 h-7 text-xs min-w-0"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Row 3: Date inputs (secondary — primary method is timeline clicks) */}
      <div className="flex items-center gap-1.5 text-xs text-ink-faint">
        <input
          type="date"
          className="input h-6 text-[11px] w-28"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <span className="text-ink-faint">→</span>
        <input
          type="date"
          className="input h-6 text-[11px] w-28"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
    </div>
  )
}
