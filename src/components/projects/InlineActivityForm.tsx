'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
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
    categoryId?: string | null
  }
  defaultColor: string
  defaultIcon: string
  teams: any[]
  assets: any[]
  categories?: { id: string; name: string; color: string; isDefault: boolean }[]
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}

export default function InlineActivityForm({
  activity, defaultColor, defaultIcon, teams, assets, categories = [], onSave, onCancel,
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
  const [categoryId, setCategoryId] = useState(activity?.categoryId ?? '')
  const [selectedAssets, setSelectedAssets] = useState<string[]>(activity?.assetIds ?? [])
  const [skills, setSkills] = useState<string[]>(activity?.skills ?? [])
  const [skillInput, setSkillInput] = useState('')
  const [showSkillDropdown, setShowSkillDropdown] = useState(false)
  const [outputs, setOutputs] = useState<string[]>(activity?.requiredOutput ?? [])
  const [outputInput, setOutputInput] = useState('')
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [saving, setSaving] = useState(false)

  const color = activity?.color ?? defaultColor

  const skillRef = useRef<HTMLDivElement>(null)
  const skillDropdownRef = useRef<HTMLDivElement>(null)
  const skillTriggerRef = useRef<HTMLInputElement>(null)
  const [skillPos, setSkillPos] = useState({ top: 0, left: 0 })

  const assetRef = useRef<HTMLDivElement>(null)
  const assetDropdownRef = useRef<HTMLDivElement>(null)
  const assetTriggerRef = useRef<HTMLButtonElement>(null)
  const [assetPos, setAssetPos] = useState({ top: 0, right: 0 })

  const knownSkills = useMemo(() => {
    const all = new Set<string>()
    teams.forEach((t: any) =>
      t.members?.forEach((m: any) =>
        m.skills?.forEach((s: string) => all.add(s))
      )
    )
    return Array.from(all).sort()
  }, [teams])

  const skillSuggestions = useMemo(() => {
    const q = skillInput.toLowerCase()
    return knownSkills.filter(s => !skills.includes(s) && (!q || s.toLowerCase().includes(q)))
  }, [knownSkills, skills, skillInput])

  const unavailableAssetIds = useMemo(() => {
    const set = new Set<string>()
    assets.forEach((a: any) => { if (a.isAvailable === false) set.add(a.id) })
    return set
  }, [assets])

  const missingSkills = useMemo(() => {
    return skills.filter(s => !knownSkills.includes(s))
  }, [skills, knownSkills])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (skillRef.current && !skillRef.current.contains(t) && (!skillDropdownRef.current || !skillDropdownRef.current.contains(t))) {
        setShowSkillDropdown(false)
      }
      if (assetRef.current && !assetRef.current.contains(t) && (!assetDropdownRef.current || !assetDropdownRef.current.contains(t))) {
        setShowAssetDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
        name: name.trim(), description: description || null, status, progress, color, icon,
        categoryId: categoryId || null,
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

  const hasUnavailableAssets = selectedAssets.some(id => unavailableAssetIds.has(id))

  return (
    <div className="animate-fade-in flex flex-col gap-3 py-3 px-3" onKeyDown={handleKeyDown}>
      {/* Row 1: Icon + Name + Save/Cancel */}
      <div className="flex items-center gap-2">
        <InlineEmojiPicker value={icon} onChange={setIcon} />
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} title="Auto color" />
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

      {/* Status + Progress */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Status</span>
        <div className="flex items-center gap-2">
          <select className="input h-6 text-xs px-1.5 w-28" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span className="text-[10px] text-ink-faint w-6 text-right font-mono">{progress}%</span>
          <input
            type="range" min={0} max={100} step={5} value={progress}
            onChange={e => setProgress(Number(e.target.value))}
            className="flex-1 h-1 accent-primary"
          />
        </div>
      </div>

      {/* Team + Assignee */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Team</span>
        <div className="flex items-center gap-2">
          <select className="input h-6 text-xs px-1.5 flex-1" value={teamId} onChange={e => setTeamId(e.target.value)}>
            <option value="">No team</option>
            {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input
            className="input h-6 text-xs px-1.5 flex-1 min-w-0"
            placeholder="Assignee"
            value={assigneeName}
            onChange={e => setAssigneeName(e.target.value)}
          />
        </div>
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Category</span>
          <select className="input h-6 text-xs px-1.5 w-40" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">General (default)</option>
            {categories.filter(c => !c.isDefault).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Schedule */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Schedule</span>
        <div className="flex items-center gap-2">
          <input
            type="date" className="input h-6 text-xs px-1.5 w-[110px]"
            value={startDate} onChange={e => setStartDate(e.target.value)}
            onKeyDown={e => handleDateKey(e, startDate, setStartDate)}
            title="Arrow Up/Down to adjust"
          />
          <span className="text-[10px] text-ink-faint">&rarr;</span>
          <input
            type="date" className="input h-6 text-xs px-1.5 w-[110px]"
            value={endDate} onChange={e => setEndDate(e.target.value)}
            onKeyDown={e => handleDateKey(e, endDate, setEndDate)}
            title="Arrow Up/Down to adjust"
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
        </div>
      </div>

      {/* Intraday toggle + times */}
      <div className="flex items-center gap-2">
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

      {/* Skills */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Skills</span>
      <div ref={skillRef} className="relative flex items-center gap-1.5 flex-wrap min-h-[24px]">
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
        <div className="relative">
          <input
            ref={skillTriggerRef}
            className="input h-5 text-[10px] px-1 w-20 min-w-0"
            placeholder="+ skill"
            value={skillInput}
            onChange={e => {
              setSkillInput(e.target.value)
              if (skillTriggerRef.current) {
                const r = skillTriggerRef.current.getBoundingClientRect()
                setSkillPos({ top: r.bottom + 2, left: r.left })
              }
              setShowSkillDropdown(true)
            }}
            onFocus={() => {
              if (skillTriggerRef.current) {
                const r = skillTriggerRef.current.getBoundingClientRect()
                setSkillPos({ top: r.bottom + 2, left: r.left })
              }
              setShowSkillDropdown(true)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) }
            }}
          />
          {showSkillDropdown && (skillSuggestions.length > 0 || skillInput.trim()) && typeof document !== 'undefined' && createPortal(
            <div ref={skillDropdownRef}
              className="fixed z-[9999] bg-surface-50 border border-surface-200 rounded-lg py-0.5 min-w-[140px] max-h-[120px] overflow-y-auto animate-fade-in"
              style={{ top: skillPos.top, left: skillPos.left, boxShadow: 'var(--shadow-panel)' }}>
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
            </div>,
            document.body
          )}
        </div>
        {missingSkills.length > 0 && (
          <span className="text-[10px] text-amber-600 shrink-0" title="Skills not found in any team member">
            <AlertTriangle size={10} />
          </span>
        )}
      </div>
      </div>

      {/* Resources */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Resources</span>
      <div className="flex items-center gap-3 min-h-[24px]">
        {/* Assets */}
        <div ref={assetRef} className="relative flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-ink-faint tracking-wide shrink-0">Assets</span>
          <div className="flex items-center gap-0.5 flex-wrap">
            {selectedAssets.map(id => {
              const asset = assets.find((a: any) => a.id === id)
              if (!asset) return null
              const unavailable = unavailableAssetIds.has(id)
              return (
                <span key={id} className={`inline-flex items-center gap-0.5 rounded-full px-1.5 h-5 text-[10px] border ${
                  unavailable ? 'bg-red-50 border-red-300 text-red-700' : 'bg-ink text-surface-50 border-ink'
                }`}>
                  {unavailable && <AlertTriangle size={8} className="text-red-500 shrink-0" />}
                  {asset.name}
                  <button type="button" className="hover:opacity-70" onClick={() => toggleAsset(id)}><X size={8} /></button>
                </span>
              )
            })}
          </div>
          {assets.length > 0 && (
            <div className="relative">
              <button ref={assetTriggerRef} type="button"
                className="input h-5 text-[10px] px-1.5 flex items-center gap-0.5 text-ink-faint hover:text-ink"
                onClick={() => {
                  if (assetTriggerRef.current) {
                    const r = assetTriggerRef.current.getBoundingClientRect()
                    setAssetPos({ top: r.bottom + 2, right: window.innerWidth - r.right })
                  }
                  setShowAssetDropdown(!showAssetDropdown)
                }}>
                + <ChevronDown size={8} />
              </button>
              {showAssetDropdown && typeof document !== 'undefined' && createPortal(
                <div ref={assetDropdownRef}
                  className="fixed z-[9999] bg-surface-50 border border-surface-200 rounded-lg py-0.5 min-w-[160px] max-h-[140px] overflow-y-auto animate-fade-in"
                  style={{ top: assetPos.top, right: assetPos.right, boxShadow: 'var(--shadow-panel)' }}>
                  {assets.map((a: any) => {
                    const selected = selectedAssets.includes(a.id)
                    const unavailable = a.isAvailable === false
                    return (
                      <button key={a.id} type="button"
                        className={`w-full px-2 py-1 text-left text-[10px] flex items-center gap-1.5 hover:bg-surface-100 ${
                          selected ? 'text-ink font-medium' : 'text-ink-muted'
                        }`}
                        onClick={() => toggleAsset(a.id)}>
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
                </div>,
                document.body
              )}
            </div>
          )}
          {hasUnavailableAssets && (
            <span className="text-[10px] text-red-500 shrink-0" title="Some selected assets are unavailable">
              <AlertTriangle size={10} />
            </span>
          )}
        </div>

        {/* Outputs */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="text-[10px] text-ink-faint tracking-wide shrink-0">
            <FileText size={10} className="inline -mt-px mr-0.5" />Out
          </span>
          <div className="flex items-center gap-0.5 flex-wrap">
            {outputs.map((o, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 bg-surface-100 border border-surface-200/60 rounded-full px-1.5 h-5 text-[10px] text-ink-muted">
                {o}
                <button type="button" className="text-ink-faint hover:text-ink" onClick={() => {
                  setOutputs(prev => prev.filter((_, idx) => idx !== i))
                }}><X size={8} /></button>
              </span>
            ))}
          </div>
          <input
            className="input h-5 text-[10px] px-1 w-16 min-w-0"
            placeholder="+ output"
            value={outputInput}
            onChange={e => setOutputInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const val = outputInput.trim()
                if (val && !outputs.includes(val)) { setOutputs(prev => [...prev, val]); setOutputInput('') }
              }
            }}
          />
        </div>
      </div>
      </div>
    </div>
  )
}
