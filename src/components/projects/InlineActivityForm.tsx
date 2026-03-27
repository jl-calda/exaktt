'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, CheckCircle2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ACTIVITY_COLORS } from '@/components/projects/colors'

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'BLOCKED', label: 'Blocked' },
]

interface InlineActivityFormProps {
  activity?: {
    id: string; name: string; description?: string | null
    status: string; progress: number; color: string
    teamId?: string | null; assigneeName?: string | null
    startDate?: string | null; endDate?: string | null
    isWithinDay?: boolean; startTime?: string | null; endTime?: string | null
    assetIds: string[]; skills?: string[]; requiredOutput: string[]
  }
  defaultColor: string
  teams: any[]
  assets: any[]
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}

export default function InlineActivityForm({
  activity, defaultColor, teams, assets, onSave, onCancel,
}: InlineActivityFormProps) {
  const [name, setName] = useState(activity?.name ?? '')
  const [description, setDescription] = useState(activity?.description ?? '')
  const [status, setStatus] = useState(activity?.status ?? 'NOT_STARTED')
  const [progress, setProgress] = useState(activity?.progress ?? 0)
  const [color, setColor] = useState(activity?.color ?? defaultColor)
  const [teamId, setTeamId] = useState(activity?.teamId ?? '')
  const [assigneeName, setAssigneeName] = useState(activity?.assigneeName ?? '')
  const [startDate, setStartDate] = useState(
    activity?.startDate ? new Date(activity.startDate).toISOString().split('T')[0] : ''
  )
  const [endDate, setEndDate] = useState(
    activity?.endDate ? new Date(activity.endDate).toISOString().split('T')[0] : ''
  )
  const [isWithinDay, setIsWithinDay] = useState(activity?.isWithinDay ?? false)
  const [startTime, setStartTime] = useState(activity?.startTime ?? '')
  const [endTime, setEndTime] = useState(activity?.endTime ?? '')
  const [selectedAssets, setSelectedAssets] = useState<string[]>(activity?.assetIds ?? [])
  const [skills, setSkills] = useState<string[]>(activity?.skills ?? [])
  const [skillInput, setSkillInput] = useState('')
  const [outputs, setOutputs] = useState<string[]>(activity?.requiredOutput ?? [])
  const [outputInput, setOutputInput] = useState('')
  const [saving, setSaving] = useState(false)

  // Status ↔ progress sync
  useEffect(() => {
    if (status === 'COMPLETED' && progress !== 100) setProgress(100)
  }, [status])

  useEffect(() => {
    if (progress === 100 && status !== 'COMPLETED') setStatus('COMPLETED')
    if (progress < 100 && status === 'COMPLETED') setStatus('IN_PROGRESS')
  }, [progress])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
  }, [onCancel])

  const handleSave = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(), description: description || null, status, progress, color,
        teamId: teamId || null, assigneeName: assigneeName || null,
        startDate: startDate || null, endDate: endDate || null,
        isWithinDay, startTime: isWithinDay ? startTime || null : null,
        endTime: isWithinDay ? endTime || null : null,
        assetIds: selectedAssets, skills, requiredOutput: outputs,
      })
    } finally { setSaving(false) }
  }

  const addTag = (list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const val = input.trim()
    if (val && !list.includes(val)) { setList([...list, val]); setInput('') }
  }

  const removeTag = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx))
  }

  const toggleAsset = (id: string) => {
    setSelectedAssets(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  return (
    <div
      className="animate-fade-in bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-2 flex flex-col gap-[2px]"
      onKeyDown={handleKeyDown}
    >
      {/* Row 1: Name + color dots + Save/Cancel */}
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          className="input flex-1 h-7 text-xs px-2"
          placeholder="Activity name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
        />
        <div className="flex items-center gap-0.5">
          {ACTIVITY_COLORS.map(c => (
            <button
              key={c}
              className={`w-3.5 h-3.5 rounded-full transition-all shrink-0 ${color === c ? 'ring-2 ring-primary ring-offset-1' : 'opacity-60 hover:opacity-100'}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              type="button"
            />
          ))}
        </div>
        <Button variant="primary" size="xs" onClick={handleSave} disabled={!name.trim() || saving} loading={saving}>
          <CheckCircle2 size={12} /> Save
        </Button>
        <Button variant="ghost" size="xs" onClick={onCancel} title="Cancel (Esc)">
          <X size={12} />
        </Button>
      </div>

      {/* Row 2: Status + Progress + Team + Assignee */}
      <div className="flex items-center gap-1.5">
        <select className="input h-6 text-xs px-1.5 w-28" value={status} onChange={e => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[10px] text-ink-faint tracking-wide w-6 text-right">{progress}%</span>
          <input
            type="range" min={0} max={100} step={5} value={progress}
            onChange={e => setProgress(Number(e.target.value))}
            className="w-16 h-1 accent-primary"
          />
        </div>
        <select className="input h-6 text-xs px-1.5 w-28" value={teamId} onChange={e => setTeamId(e.target.value)}>
          <option value="">No team</option>
          {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input
          className="input h-6 text-xs px-1.5 w-28"
          placeholder="Assignee"
          value={assigneeName}
          onChange={e => setAssigneeName(e.target.value)}
        />
      </div>

      {/* Row 3: Dates + Within-day toggle + Times */}
      <div className="flex items-center gap-1.5">
        <input type="date" className="input h-6 text-xs px-1.5 w-[110px]" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <span className="text-[10px] text-ink-faint">→</span>
        <input type="date" className="input h-6 text-xs px-1.5 w-[110px]" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <label className="flex items-center gap-1 text-[10px] text-ink-faint cursor-pointer select-none">
          <button
            type="button"
            className={`w-7 h-4 rounded-full transition-colors relative ${isWithinDay ? 'bg-primary' : 'bg-surface-200 border border-surface-300'}`}
            onClick={() => setIsWithinDay(!isWithinDay)}
          >
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-surface-50 shadow-sm transition-transform ${isWithinDay ? 'left-3.5' : 'left-0.5'}`} />
          </button>
          Intraday
        </label>
        {isWithinDay && (
          <>
            <input type="time" className="input h-6 text-xs px-1.5 w-[90px]" value={startTime} onChange={e => setStartTime(e.target.value)} />
            <span className="text-[10px] text-ink-faint">–</span>
            <input type="time" className="input h-6 text-xs px-1.5 w-[90px]" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </>
        )}
      </div>

      {/* Row 4: Skills + Assets */}
      <div className="flex items-center gap-1.5 min-h-[24px]">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="text-[10px] text-ink-faint tracking-wide shrink-0">Skills</span>
          <div className="flex items-center gap-0.5 flex-wrap">
            {skills.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 bg-surface-100 border border-surface-200/60 rounded-full px-1.5 h-5 text-[10px] text-ink-muted">
                {s}
                <button type="button" className="text-ink-faint hover:text-ink" onClick={() => removeTag(skills, setSkills, i)}><X size={8} /></button>
              </span>
            ))}
          </div>
          <input
            className="input h-5 text-[10px] px-1 w-16 min-w-0"
            placeholder="+ skill"
            value={skillInput}
            onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(skills, setSkills, skillInput, setSkillInput) } }}
          />
        </div>
        <div className="flex items-center gap-0.5 overflow-x-auto max-w-[160px] shrink-0">
          <span className="text-[10px] text-ink-faint tracking-wide shrink-0">Assets</span>
          {assets.map((a: any) => {
            const selected = selectedAssets.includes(a.id)
            const unavailable = a.isAvailable === false
            return (
              <button
                key={a.id}
                type="button"
                className={`inline-flex items-center h-5 px-1.5 rounded-full text-[10px] border transition-colors shrink-0
                  ${selected ? 'bg-ink text-surface-50 border-ink' : 'bg-surface-100 border-surface-200/60 text-ink-muted hover:border-surface-300'}
                  ${unavailable ? 'border-red-300 opacity-70' : ''}`}
                onClick={() => toggleAsset(a.id)}
                title={unavailable ? 'Unavailable' : a.name}
              >
                {a.name}{unavailable && <span className="ml-0.5 text-red-400">!</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Row 5: Required outputs */}
      <div className="flex items-center gap-1 min-h-[24px]">
        <span className="text-[10px] text-ink-faint tracking-wide shrink-0">
          <FileText size={10} className="inline -mt-px mr-0.5" />Outputs
        </span>
        <div className="flex items-center gap-0.5 flex-wrap">
          {outputs.map((o, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 bg-surface-100 border border-surface-200/60 rounded-full px-1.5 h-5 text-[10px] text-ink-muted">
              {o}
              <button type="button" className="text-ink-faint hover:text-ink" onClick={() => removeTag(outputs, setOutputs, i)}><X size={8} /></button>
            </span>
          ))}
        </div>
        <input
          className="input h-5 text-[10px] px-1 w-20 min-w-0"
          placeholder="+ output"
          value={outputInput}
          onChange={e => setOutputInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(outputs, setOutputs, outputInput, setOutputInput) } }}
        />
      </div>
    </div>
  )
}
