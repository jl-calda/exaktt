// src/components/projects/ActivityModal.tsx
'use client'
import { useState } from 'react'
import { X, CheckCircle2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED',   label: 'Completed' },
  { value: 'BLOCKED',     label: 'Blocked' },
]

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b']

interface Props {
  activity?: any
  milestoneId: string
  teams: any[]
  assets: any[]
  onSave: (data: any) => void
  onClose: () => void
}

export default function ActivityModal({ activity, milestoneId, teams, assets, onSave, onClose }: Props) {
  const [name, setName] = useState(activity?.name ?? '')
  const [description, setDescription] = useState(activity?.description ?? '')
  const [status, setStatus] = useState(activity?.status ?? 'NOT_STARTED')
  const [progress, setProgress] = useState(activity?.progress ?? 0)
  const [color, setColor] = useState(activity?.color ?? '#10b981')
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

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus)
    if (newStatus === 'COMPLETED') setProgress(100)
  }

  const handleProgressChange = (newProgress: number) => {
    setProgress(newProgress)
    if (newProgress === 100) setStatus('COMPLETED')
    else if (status === 'COMPLETED') setStatus('IN_PROGRESS')
  }

  const addSkill = () => {
    const v = skillInput.trim()
    if (v && !skills.includes(v)) setSkills(prev => [...prev, v])
    setSkillInput('')
  }

  const removeSkill = (s: string) => setSkills(prev => prev.filter(x => x !== s))

  const addOutput = () => {
    const v = outputInput.trim()
    if (v && !outputs.includes(v)) setOutputs(prev => [...prev, v])
    setOutputInput('')
  }

  const removeOutput = (o: string) => setOutputs(prev => prev.filter(x => x !== o))

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      description: description || null,
      status,
      progress,
      color,
      teamId: teamId || null,
      assigneeName: assigneeName || null,
      startDate: startDate || null,
      endDate: isWithinDay ? startDate || null : endDate || null,
      isWithinDay,
      startTime: isWithinDay ? startTime || null : null,
      endTime: isWithinDay ? endTime || null : null,
      assetIds: selectedAssets,
      skills,
      requiredOutput: outputs,
    })
    setSaving(false)
  }

  const toggleAsset = (id: string) => {
    setSelectedAssets(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-50 rounded-2xl shadow-float w-full max-w-md mx-4 animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <h2 className="font-semibold text-sm text-ink">
            {activity ? 'Edit Activity' : 'New Activity'}
          </h2>
          <button onClick={onClose} className="text-ink-faint hover:text-ink"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label mb-1">Name *</label>
            <input className="input w-full" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Pour concrete" />
          </div>
          <div>
            <label className="label mb-1">Description</label>
            <textarea className="input w-full" rows={2} value={description}
              onChange={e => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1">Status</label>
              <select className="input w-full" value={status} onChange={e => handleStatusChange(e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label mb-1">Progress</label>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={100} value={progress}
                  onChange={e => handleProgressChange(Number(e.target.value))}
                  className="flex-1" />
                <span className="text-[10px] font-mono text-ink-muted w-8">{progress}%</span>
                {progress === 100 && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              </div>
              <p className="text-[10px] text-ink-faint mt-0.5">Only the assignee or PM can mark 100%</p>
            </div>
          </div>
          <div>
            <label className="label mb-1">Color</label>
            <div className="flex gap-1.5">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className="w-5 h-5 rounded-full border-2 transition-all"
                  style={{
                    background: c,
                    borderColor: color === c ? c : 'transparent',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }} />
              ))}
            </div>
          </div>

          {/* Within-day toggle */}
          <div className="flex items-center gap-2">
            <button onClick={() => setIsWithinDay(!isWithinDay)}
              className={`w-8 h-[18px] rounded-full transition-colors ${isWithinDay ? 'bg-primary' : 'bg-surface-200'}`}>
              <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${isWithinDay ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
            </button>
            <span className="text-[11px] text-ink-muted">Within-day activity</span>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1">{isWithinDay ? 'Date' : 'Start Date'}</label>
              <input type="date" className="input w-full" value={startDate}
                onChange={e => setStartDate(e.target.value)} />
            </div>
            {isWithinDay ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label mb-1">From</label>
                  <input type="time" className="input w-full" value={startTime}
                    onChange={e => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="label mb-1">To</label>
                  <input type="time" className="input w-full" value={endTime}
                    onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
            ) : (
              <div>
                <label className="label mb-1">End Date</label>
                <input type="date" className="input w-full" value={endDate}
                  onChange={e => setEndDate(e.target.value)} />
              </div>
            )}
          </div>

          {/* Assignment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1">Team</label>
              <select className="input w-full" value={teamId} onChange={e => setTeamId(e.target.value)}>
                <option value="">None</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label mb-1">Assignee</label>
              <input className="input w-full" value={assigneeName}
                onChange={e => setAssigneeName(e.target.value)} placeholder="Name" />
            </div>
          </div>

          {/* Assets */}
          {assets.length > 0 && (
            <div>
              <label className="label mb-1">Assets</label>
              <div className="flex flex-wrap gap-1.5">
                {assets.map(a => (
                  <button key={a.id} onClick={() => toggleAsset(a.id)}
                    className={`filter-pill ${selectedAssets.includes(a.id) ? 'active' : ''} ${a.isAvailable === false ? 'border-red-400' : ''}`}>
                    {a.name}
                    {a.isAvailable === false && (
                      <span className="ml-1 text-[10px] text-red-500 font-medium">Unavailable</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Requirements — Skills */}
          <div>
            <label className="label mb-1">Skill Requirements</label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {skills.map(s => (
                <span key={s} className="inline-flex items-center gap-1 bg-surface-100 border border-surface-200 rounded-full px-2 py-0.5 text-[10px] text-ink-muted">
                  {s}
                  <button onClick={() => removeSkill(s)} className="text-ink-faint hover:text-ink"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <input
              className="input w-full"
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
              placeholder="Type a skill and press Enter"
            />
          </div>

          {/* Required Output */}
          <div>
            <label className="label mb-1">Required Output</label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {outputs.map(o => (
                <span key={o} className="inline-flex items-center gap-1 bg-surface-100 border border-surface-200 rounded-full px-2 py-0.5 text-[10px] text-ink-muted">
                  <FileText className="w-3 h-3 shrink-0" />
                  {o}
                  <button onClick={() => removeOutput(o)} className="text-ink-faint hover:text-ink"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <input
              className="input w-full"
              value={outputInput}
              onChange={e => setOutputInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOutput() } }}
              placeholder="e.g. Site photo, Inspection report"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-surface-200">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSave} disabled={!name.trim()}>
            {activity ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}
