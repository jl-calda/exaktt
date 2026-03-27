'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { X, CheckCircle2, FileText, Clock, AlertTriangle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import InlineEmojiPicker from './InlineEmojiPicker'

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'BLOCKED', label: 'Blocked' },
]

function shiftDate(dateStr: string, days: number): string {
  if (!dateStr) return dateStr
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

interface InlineActivityFormProps {
  activity?: {
    id: string; name: string; description?: string | null
    status: string; progress: number; color: string
    teamId?: string | null; assigneeName?: string | null
    startDate?: string | null; endDate?: string | null
    isWithinDay?: boolean; startTime?: string | null; endTime?: string | null
    assetIds: string[]; skills?: string[]; requiredOutput: string[]
    estimatedHours?: number | null
    icon?: string | null
  }
  defaultColor: string
  defaultIcon: string
  teams: any[]
  assets: any[]
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}

export default function InlineActivityForm({
  activity, defaultColor, defaultIcon, teams, assets, onSave, onCancel,
}: InlineActivityFormProps) {
  const [name, setName] = useState(activity?.name ?? '')
  const [description, setDescription] = useState(activity?.description ?? '')
  const [status, setStatus] = useState(activity?.status ?? 'NOT_STARTED')
  const [progress, setProgress] = useState(activity?.progress ?? 0)
  const [icon, setIcon] = useState(activity?.icon ?? defaultIcon)
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
  const [estimatedHours, setEstimatedHours] = useState<string>(
    activity?.estimatedHours != null ? String(activity.estimatedHours) : ''
  )
  const [selectedAssets, setSelectedAssets] = useState<string[]>(activity?.assetIds ?? [])
  const [skills, setSkills] = useState<string[]>(activity?.skills ?? [])
  const [skillInput, setSkillInput] = useState('')
  const [showSkillDropdown, setShowSkillDropdown] = useState(false)
  const [outputs, setOutputs] = useState<string[]>(activity?.requiredOutput ?? [])
  const [outputInput, setOutputInput] = useState('')
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [saving, setSaving] = useState(false)

  // Color is auto-assigned, not user-selectable
  const color = activity?.color ?? defaultColor

  const skillRef = useRef<HTMLDivElement>(null)
  const assetRef = useRef<HTMLDivElement>(null)

  // Collect all known skills from team members
  const knownSkills = useMemo(() => {
    const all = new Set<string>()
    teams.forEach((t: any) =>
      t.members?.forEach((m: any) =>
        m.skills?.forEach((s: string) => all.add(s))
      )
    )
    return Array.from(all).sort()
  }, [teams])

  // Filter skills suggestions
  const skillSuggestions = useMemo(() => {
    const q = skillInput.toLowerCase()
    return knownSkills.filter(s => !skills.includes(s) && (!q || s.toLowerCase().includes(q)))
  }, [knownSkills, skills, skillInput])

  // Check if a selected asset is unavailable
  const unavailableAssetIds = useMemo(() => {
    const set = new Set<string>()
    assets.forEach((a: any) => { if (a.isAvailable === false) set.add(a.id) })
    return set
  }, [assets])

  // Check if a required skill is missing from all team members
  const missingSkills = useMemo(() => {
    return skills.filter(s => !knownSkills.includes(s))
  }, [skills, knownSkills])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (skillRef.current && !skillRef.current.contains(e.target as Node)) setShowSkillDropdown(false)
      if (assetRef.current && !assetRef.current.contains(e.target as Node)) setShowAssetDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Status <-> progress sync
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
        name: name.trim(), description: description || null, status, progress, color,
        icon,
        teamId: teamId || null, assigneeName: assigneeName || null,
        startDate: startDate || null, endDate: endDate || null,
        isWithinDay, startTime: isWithinDay ? startTime || null : null,
        endTime: isWithinDay ? endTime || null : null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        assetIds: selectedAssets, skills, requiredOutput: outputs,
      })
    } finally { setSaving(false) }
  }

  const addSkill = (s: string) => {
    const val = s.trim()
    if (val && !skills.includes(val)) setSkills(prev => [...prev, val])
    setSkillInput('')
    setShowSkillDropdown(false)
  }

  const removeSkill = (idx: number) => setSkills(prev => prev.filter((_, i) => i !== idx))

  const toggleAsset = (id: string) => {
    setSelectedAssets(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  const addTag = (list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const val = input.trim()
    if (val && !list.includes(val)) { setList([...list, val]); setInput('') }
  }

  const removeTag = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx))
  }

  // Warning counts
  const hasUnavailableAssets = selectedAssets.some(id => unavailableAssetIds.has(id))

  return (
    <div className="animate-fade-in flex flex-col gap-1.5 py-1.5 px-2" onKeyDown={handleKeyDown}>
      {/* Row 1: Icon + Name + color dot + Save/Cancel */}
      <div className="flex items-center gap-1.5">
        <InlineEmojiPicker value={icon} onChange={setIcon} />
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} title={`Auto color: ${color}`} />
        <input
          autoFocus
          className="input flex-1 h-7 text-xs px-2 min-w-0"
          placeholder="Activity name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
        />
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
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-ink-faint w-6 text-right font-mono">{progress}%</span>
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
          className="input h-6 text-xs px-1.5 w-24 min-w-0"
          placeholder="Assignee"
          value={assigneeName}
          onChange={e => setAssigneeName(e.target.value)}
        />
      </div>

      {/* Row 3: Dates + Hours + Intraday + Times */}
      <div className="flex items-center gap-1.5">
        <input
          type="date" className="input h-6 text-xs px-1.5 w-[110px]"
          value={startDate} onChange={e => setStartDate(e.target.value)}
          onKeyDown={e => handleDateKey(e, startDate, setStartDate)}
          title="Arrow Up/Down to adjust date"
        />
        <span className="text-[10px] text-ink-faint">&rarr;</span>
        <input
          type="date" className="input h-6 text-xs px-1.5 w-[110px]"
          value={endDate} onChange={e => setEndDate(e.target.value)}
          onKeyDown={e => handleDateKey(e, endDate, setEndDate)}
          title="Arrow Up/Down to adjust date"
        />
        <div className="flex items-center gap-0.5 shrink-0">
          <Clock size={10} className="text-ink-faint" />
          <input
            type="number" className="input h-6 text-xs px-1 w-12 text-right font-mono"
            placeholder="hrs" value={estimatedHours}
            onChange={e => setEstimatedHours(e.target.value)}
            min={0} step={0.5}
          />
          <span className="text-[10px] text-ink-faint">h</span>
        </div>
        <label className="flex items-center gap-1 text-[10px] text-ink-faint cursor-pointer select-none shrink-0">
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
            <input type="time" className="input h-6 text-xs px-1.5 w-[80px]" value={startTime} onChange={e => setStartTime(e.target.value)} />
            <span className="text-[10px] text-ink-faint">&ndash;</span>
            <input type="time" className="input h-6 text-xs px-1.5 w-[80px]" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </>
        )}
      </div>

      {/* Row 4: Skills (combobox with dropdown) + Assets (dropdown selector) */}
      <div className="flex items-center gap-3 min-h-[24px]">
        {/* Skills */}
        <div ref={skillRef} className="relative flex items-center gap-1 flex-1 min-w-0">
          <span className="text-[10px] text-ink-faint tracking-wide shrink-0">Skills</span>
          <div className="flex items-center gap-0.5 flex-wrap">
            {skills.map((s, i) => (
              <span key={i} className={`inline-flex items-center gap-0.5 rounded-full px-1.5 h-5 text-[10px] border ${
                missingSkills.includes(s)
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-surface-100 border-surface-200/60 text-ink-muted'
              }`}>
                {missingSkills.includes(s) && <AlertTriangle size={8} className="text-amber-500 shrink-0" />}
                {s}
                <button type="button" className="text-ink-faint hover:text-ink" onClick={() => removeSkill(i)}><X size={8} /></button>
              </span>
            ))}
          </div>
          <div className="relative">
            <input
              className="input h-5 text-[10px] px-1 w-20 min-w-0"
              placeholder="+ skill"
              value={skillInput}
              onChange={e => { setSkillInput(e.target.value); setShowSkillDropdown(true) }}
              onFocus={() => setShowSkillDropdown(true)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) }
              }}
            />
            {showSkillDropdown && (skillSuggestions.length > 0 || skillInput.trim()) && (
              <div className="absolute left-0 top-full mt-0.5 bg-surface-50 border border-surface-200 rounded-lg shadow-panel z-30 py-0.5 min-w-[140px] max-h-[120px] overflow-y-auto animate-fade-in">
                {skillSuggestions.map(s => (
                  <button key={s} type="button"
                    className="w-full px-2 py-1 text-left text-[10px] text-ink-muted hover:bg-surface-100 truncate"
                    onClick={() => addSkill(s)}>
                    {s}
                  </button>
                ))}
                {skillInput.trim() && !knownSkills.includes(skillInput.trim()) && (
                  <button type="button"
                    className="w-full px-2 py-1 text-left text-[10px] text-primary hover:bg-surface-100 border-t border-surface-100"
                    onClick={() => addSkill(skillInput)}>
                    + Add &ldquo;{skillInput.trim()}&rdquo;
                  </button>
                )}
              </div>
            )}
          </div>
          {missingSkills.length > 0 && (
            <span className="text-[10px] text-amber-600 shrink-0" title="Skills not found in any team member">
              <AlertTriangle size={10} />
            </span>
          )}
        </div>

        {/* Assets */}
        <div ref={assetRef} className="relative flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-ink-faint tracking-wide shrink-0">Assets</span>
          {/* Selected asset pills */}
          <div className="flex items-center gap-0.5 flex-wrap">
            {selectedAssets.map(id => {
              const asset = assets.find((a: any) => a.id === id)
              if (!asset) return null
              const unavailable = unavailableAssetIds.has(id)
              return (
                <span key={id} className={`inline-flex items-center gap-0.5 rounded-full px-1.5 h-5 text-[10px] border ${
                  unavailable
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-ink text-surface-50 border-ink'
                }`}>
                  {unavailable && <AlertTriangle size={8} className="text-red-500 shrink-0" />}
                  {asset.name}
                  <button type="button" className="hover:opacity-70" onClick={() => toggleAsset(id)}>
                    <X size={8} />
                  </button>
                </span>
              )
            })}
          </div>
          {/* Dropdown trigger */}
          {assets.length > 0 && (
            <div className="relative">
              <button
                type="button"
                className="input h-5 text-[10px] px-1.5 flex items-center gap-0.5 text-ink-faint hover:text-ink"
                onClick={() => setShowAssetDropdown(!showAssetDropdown)}
              >
                + <ChevronDown size={8} />
              </button>
              {showAssetDropdown && (
                <div className="absolute right-0 top-full mt-0.5 bg-surface-50 border border-surface-200 rounded-lg shadow-panel z-30 py-0.5 min-w-[160px] max-h-[140px] overflow-y-auto animate-fade-in">
                  {assets.map((a: any) => {
                    const selected = selectedAssets.includes(a.id)
                    const unavailable = a.isAvailable === false
                    return (
                      <button key={a.id} type="button"
                        className={`w-full px-2 py-1 text-left text-[10px] flex items-center gap-1.5 hover:bg-surface-100 ${
                          selected ? 'text-ink font-medium' : 'text-ink-muted'
                        }`}
                        onClick={() => toggleAsset(a.id)}
                      >
                        <span className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${
                          selected ? 'bg-primary border-primary text-white' : 'border-surface-300'
                        }`}>
                          {selected && <CheckCircle2 size={8} />}
                        </span>
                        <span className="truncate flex-1">{a.name}</span>
                        {a.category && <span className="text-ink-faint">{a.category}</span>}
                        {unavailable && (
                          <span className="text-red-500 flex items-center gap-0.5 shrink-0">
                            <AlertTriangle size={8} />
                            <span className="text-[9px] font-medium">N/A</span>
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {hasUnavailableAssets && (
            <span className="text-[10px] text-red-500 shrink-0" title="Some selected assets are unavailable">
              <AlertTriangle size={10} />
            </span>
          )}
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
