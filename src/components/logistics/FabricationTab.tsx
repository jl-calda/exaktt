// src/components/logistics/FabricationTab.tsx
'use client'
import { useState } from 'react'
import { Plus, Edit3, Trash2, Check, X, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { CompanyRole } from '@/types'

interface Props {
  labourRates:       any[]
  workCategories:    any[]
  workActivityRates: any[]
  userRole:          CompanyRole
  onRefreshRates:          () => void
  onRefreshCategories:     () => void
  onRefreshActivityRates:  () => void
}

type Section = 'labour' | 'categories' | 'activity-rates'

const UNIT_OPTIONS = [
  { value: 'per_piece', label: 'Per piece',     defaultUnit: 'pc'  },
  { value: 'per_dim',   label: 'Per dimension',  defaultUnit: 'm'   },
  { value: 'per_hour',  label: 'Per hour',       defaultUnit: 'hr'  },
  { value: 'lump_sum',  label: 'Lump sum',       defaultUnit: 'lot' },
]

const SPEED_OPTIONS = [
  { value: 'time_per_unit', label: 'Time / unit' },
  { value: 'rate',          label: 'Units / hr'  },
]

const PRESET_WORK_CATEGORIES = [
  { name: 'Cutting',    icon: '✂️', color: '#dc2626' },
  { name: 'Welding',    icon: '🔥', color: '#ea580c' },
  { name: 'Drilling',   icon: '🔩', color: '#7c3aed' },
  { name: 'Grinding',   icon: '⚙️', color: '#6b7280' },
  { name: 'Painting',   icon: '🎨', color: '#2563eb' },
  { name: 'Assembly',   icon: '🔧', color: '#16a34a' },
  { name: 'Handling',   icon: '📦', color: '#ca8a04' },
  { name: 'Inspection', icon: '🔍', color: '#0891b2' },
]

const PRESET_LABOUR_CATEGORIES = [
  { name: 'Worker',        category: 'Labour', unitType: 'per_hour', unitLabel: 'hr' },
  { name: 'Supervisor',    category: 'Labour', unitType: 'per_hour', unitLabel: 'hr' },
  { name: 'Foreman',       category: 'Labour', unitType: 'per_hour', unitLabel: 'hr' },
  { name: 'Skilled Trade',  category: 'Labour', unitType: 'per_hour', unitLabel: 'hr' },
  { name: 'Apprentice',    category: 'Labour', unitType: 'per_hour', unitLabel: 'hr' },
]

const LABOUR_ICONS: Record<string, string> = {
  'Worker': '👷', 'Supervisor': '👔', 'Foreman': '🏗️', 'Skilled Trade': '🔧', 'Apprentice': '🎓',
}

const BLANK_RATE     = { name: '', category: 'Labour', unitType: 'per_hour', unitLabel: 'hr', rate: '', notes: '' }
const BLANK_CATEGORY = { name: '', icon: '🔧', color: '#7c3aed', description: '' }
const BLANK_WAR      = { name: '', workCategoryId: '', labourRateId: '', speedMode: 'time_per_unit', defaultTimePerUnit: '', defaultRatePerHr: '', crewSize: '1', notes: '' }

export default function FabricationTab({ labourRates, workCategories, workActivityRates, userRole, onRefreshRates, onRefreshCategories, onRefreshActivityRates }: Props) {
  const [section, setSection] = useState<Section>('labour')
  const isOwner = userRole === 'OWNER'

  // ─── Labour Category state ─────────────────────────────────────────────────
  const [rateModal,   setRateModal]   = useState(false)
  const [rateEditing, setRateEditing] = useState<any | null>(null)
  const [rateForm,    setRateForm]    = useState({ ...BLANK_RATE })
  const [rateLoading, setRateLoading] = useState(false)

  const openCreateRate = () => { setRateEditing(null); setRateForm({ ...BLANK_RATE }); setRateModal(true) }
  const openEditRate   = (r: any) => {
    setRateEditing(r)
    setRateForm({ name: r.name, category: r.category ?? 'Labour', unitType: r.unitType, unitLabel: r.unitLabel ?? '', rate: String(r.rate ?? ''), notes: r.notes ?? '' })
    setRateModal(true)
  }

  const saveRate = async () => {
    if (!rateForm.name.trim()) return
    setRateLoading(true)
    const payload = { ...rateForm, rate: parseFloat(rateForm.rate) || 0 }
    if (rateEditing) {
      await fetch('/api/mto/labour-rates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: rateEditing.id, ...payload }) })
    } else {
      await fetch('/api/mto/labour-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setRateLoading(false); setRateModal(false); onRefreshRates()
  }

  const removeRate = async (r: any) => {
    if (!confirm(`Archive "${r.name}"?`)) return
    await fetch('/api/mto/labour-rates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id }) })
    onRefreshRates()
  }

  const quickAddLabour = async (preset: typeof PRESET_LABOUR_CATEGORIES[number]) => {
    await fetch('/api/mto/labour-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...preset, rate: 0 }) })
    onRefreshRates()
  }

  const setRate = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setRateForm(f => ({ ...f, [k]: e.target.value }))

  const onUnitTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const unitType = e.target.value
    const opt = UNIT_OPTIONS.find(o => o.value === unitType)
    setRateForm(f => ({ ...f, unitType, unitLabel: opt?.defaultUnit ?? '' }))
  }

  // ─── Work Category state ─────────────────────────────────────────────────────
  const [catModal,   setCatModal]   = useState(false)
  const [catEditing, setCatEditing] = useState<any | null>(null)
  const [catForm,    setCatForm]    = useState({ ...BLANK_CATEGORY })
  const [catLoading, setCatLoading] = useState(false)

  const openCreateCat = () => { setCatEditing(null); setCatForm({ ...BLANK_CATEGORY }); setCatModal(true) }
  const openEditCat   = (c: any) => {
    setCatEditing(c)
    setCatForm({ name: c.name, icon: c.icon ?? '🔧', color: c.color ?? '#7c3aed', description: c.description ?? '' })
    setCatModal(true)
  }

  const saveCat = async () => {
    if (!catForm.name.trim()) return
    setCatLoading(true)
    if (catEditing) {
      await fetch('/api/mto/work-categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: catEditing.id, ...catForm }) })
    } else {
      await fetch('/api/mto/work-categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm) })
    }
    setCatLoading(false); setCatModal(false); onRefreshCategories()
  }

  const removeCat = async (c: any) => {
    if (!confirm(`Archive "${c.name}"?`)) return
    await fetch('/api/mto/work-categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id }) })
    onRefreshCategories()
  }

  const setCat = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setCatForm(f => ({ ...f, [k]: e.target.value }))

  const quickAddCat = async (preset: { name: string; icon: string; color: string }) => {
    await fetch('/api/mto/work-categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preset) })
    onRefreshCategories()
  }

  // ─── Work Activity Rate state ────────────────────────────────────────────────
  const [warModal,   setWarModal]   = useState(false)
  const [warEditing, setWarEditing] = useState<any | null>(null)
  const [warForm,    setWarForm]    = useState({ ...BLANK_WAR })
  const [warLoading, setWarLoading] = useState(false)

  const openCreateWar = () => { setWarEditing(null); setWarForm({ ...BLANK_WAR }); setWarModal(true) }
  const openEditWar   = (w: any) => {
    setWarEditing(w)
    setWarForm({
      name: w.name, workCategoryId: w.workCategoryId ?? '', labourRateId: w.labourRateId ?? '',
      speedMode: w.speedMode ?? 'time_per_unit',
      defaultTimePerUnit: String(w.defaultTimePerUnit ?? ''), defaultRatePerHr: String(w.defaultRatePerHr ?? ''),
      crewSize: String(w.crewSize ?? 1), notes: w.notes ?? '',
    })
    setWarModal(true)
  }

  const saveWar = async () => {
    if (!warForm.name.trim() || !warForm.workCategoryId || !warForm.labourRateId) return
    setWarLoading(true)
    // Snapshot category + rate info
    const cat  = workCategories.find((c: any) => c.id === warForm.workCategoryId)
    const rate = labourRates.find((r: any) => r.id === warForm.labourRateId)
    const payload = {
      ...warForm,
      defaultTimePerUnit: parseFloat(warForm.defaultTimePerUnit) || null,
      defaultRatePerHr:   parseFloat(warForm.defaultRatePerHr)   || null,
      crewSize:           parseInt(warForm.crewSize) || 1,
      categoryName: cat?.name ?? '', categoryIcon: cat?.icon ?? '🔧',
      rateName: rate?.name ?? '', rateValue: rate?.rate ?? 0,
      rateUnitType: rate?.unitType ?? 'per_hour', rateUnitLabel: rate?.unitLabel ?? 'hr',
    }
    if (warEditing) {
      await fetch('/api/mto/work-activity-rates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: warEditing.id, ...payload }) })
    } else {
      await fetch('/api/mto/work-activity-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setWarLoading(false); setWarModal(false); onRefreshActivityRates()
  }

  const removeWar = async (w: any) => {
    if (!confirm(`Archive "${w.name}"?`)) return
    await fetch('/api/mto/work-activity-rates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: w.id }) })
    onRefreshActivityRates()
  }

  const setWar = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setWarForm(f => ({ ...f, [k]: e.target.value }))

  // Group WARs by category
  const groupedWars = workActivityRates.reduce<Record<string, any[]>>((acc, w) => {
    const cat = w.categoryName || 'Uncategorised'
    ;(acc[cat] ??= []).push(w)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-1 border-b border-surface-200 pb-px">
        {([
          { id: 'labour' as Section, label: 'Labour Categories', count: labourRates.length },
          { id: 'categories' as Section, label: 'Work Categories', count: workCategories.length },
          { id: 'activity-rates' as Section, label: 'Activity Rates', count: workActivityRates.length },
        ]).map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${section === t.id ? 'bg-surface-100 text-ink border-b-2 border-primary' : 'text-ink-muted hover:text-ink'}`}>
            {t.label} <span className="ml-1 text-ink-faint">({t.count})</span>
          </button>
        ))}
      </div>

      {/* ─── Labour Categories ─────────────────────────────────────────────────── */}
      {section === 'labour' && (
        <>
          <div className="flex justify-between items-center">
            <div className="text-sm text-ink-faint">{labourRates.length} categor{labourRates.length !== 1 ? 'ies' : 'y'}</div>
            <Button size="sm" onClick={openCreateRate} icon={<Plus className="w-3.5 h-3.5" />}>Add Category</Button>
          </div>

          {labourRates.length === 0 ? (
            <div className="card py-12 text-center space-y-4">
              <div className="flex justify-center"><Users className="w-8 h-8 text-ink-faint/40" /></div>
              <div className="text-sm text-ink-faint">No labour categories yet. Add roles like Worker, Supervisor, etc.</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {PRESET_LABOUR_CATEGORIES.map(p => (
                  <button key={p.name} onClick={() => quickAddLabour(p)}
                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-surface-300 text-xs font-medium text-ink-muted hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                    style={{ borderRadius: 'var(--radius)' }}>
                    <span className="text-base">{LABOUR_ICONS[p.name] ?? '👷'}</span> {p.name}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-ink-faint">Click to add, or use "Add Category" for custom ones.{isOwner ? '' : ' Rates are configured by the owner in Settings.'}</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {labourRates.map((r: any) => (
                  <div key={r.id} className="group relative flex items-center gap-2.5 px-3 py-2.5 border border-surface-200 bg-surface-50 hover:border-surface-300 transition-colors"
                    style={{ borderRadius: 'var(--radius)' }}>
                    <span className="text-lg">{LABOUR_ICONS[r.name] ?? '👷'}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink">{r.name}</div>
                      <div className="text-[10px] text-ink-faint">
                        {UNIT_OPTIONS.find(o => o.value === r.unitType)?.label ?? r.unitType}
                        {isOwner && r.rate > 0 && <span className="ml-1 font-mono">${r.rate.toFixed(2)}/{r.unitLabel}</span>}
                      </div>
                    </div>
                    {r.notes && <div className="text-[10px] text-ink-faint italic max-w-[100px] truncate">{r.notes}</div>}
                    <div className="flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditRate(r)} className="p-1 rounded hover:bg-surface-200 text-ink-muted"><Edit3 className="w-3 h-3" /></button>
                      <button onClick={() => removeRate(r)} className="p-1 rounded hover:bg-red-50 text-ink-muted hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
                {/* Inline add */}
                <button onClick={openCreateRate}
                  className="flex items-center gap-1.5 px-3 py-2.5 border border-dashed border-surface-300 text-xs text-ink-faint hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                  style={{ borderRadius: 'var(--radius)' }}>
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {/* Quick-add presets for missing ones */}
              {PRESET_LABOUR_CATEGORIES.filter(p => !labourRates.some((r: any) => r.name === p.name)).length > 0 && (
                <div>
                  <div className="text-[10px] text-ink-faint mb-1.5">Quick add:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_LABOUR_CATEGORIES.filter(p => !labourRates.some((r: any) => r.name === p.name)).map(p => (
                      <button key={p.name} onClick={() => quickAddLabour(p)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-ink-faint border border-dashed border-surface-200 hover:border-primary hover:text-primary transition-all"
                        style={{ borderRadius: 'var(--radius)' }}>
                        {LABOUR_ICONS[p.name] ?? '👷'} {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!isOwner && (
                <div className="text-[10px] text-ink-faint bg-surface-100 px-3 py-2 rounded-md">
                  Rates for each category are configured by the owner in Settings.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Work Categories ───────────────────────────────────────────────────── */}
      {section === 'categories' && (
        <>
          <div className="flex justify-between items-center">
            <div className="text-sm text-ink-faint">{workCategories.length} categor{workCategories.length !== 1 ? 'ies' : 'y'}</div>
            <Button size="sm" onClick={openCreateCat} icon={<Plus className="w-3.5 h-3.5" />}>Add Category</Button>
          </div>

          {workCategories.length === 0 ? (
            <div className="card py-12 text-center space-y-4">
              <div className="text-sm text-ink-faint">No work categories yet. Add some to get started:</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {PRESET_WORK_CATEGORIES.map(p => (
                  <button key={p.name} onClick={() => quickAddCat(p)}
                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-surface-300 text-xs font-medium text-ink-muted hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                    style={{ borderRadius: 'var(--radius)' }}>
                    <span className="text-base">{p.icon}</span> {p.name}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-ink-faint">Click to add, or use "Add Category" for custom ones</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {workCategories.map((c: any) => (
                  <div key={c.id} className="group relative flex items-center gap-2 px-3 py-2 border border-surface-200 bg-surface-50 hover:border-surface-300 transition-colors"
                    style={{ borderRadius: 'var(--radius)', borderLeft: `3px solid ${c.color}` }}>
                    <span className="text-lg">{c.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink">{c.name}</div>
                      {c.description && <div className="text-[10px] text-ink-faint truncate max-w-[150px]">{c.description}</div>}
                    </div>
                    <div className="flex gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditCat(c)} className="p-1 rounded hover:bg-surface-200 text-ink-muted"><Edit3 className="w-3 h-3" /></button>
                      <button onClick={() => removeCat(c)} className="p-1 rounded hover:bg-red-50 text-ink-muted hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
                {/* Inline add button */}
                <button onClick={openCreateCat}
                  className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-surface-300 text-xs text-ink-faint hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                  style={{ borderRadius: 'var(--radius)' }}>
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {/* Quick-add presets if some are missing */}
              {PRESET_WORK_CATEGORIES.filter(p => !workCategories.some((c: any) => c.name === p.name)).length > 0 && (
                <div>
                  <div className="text-[10px] text-ink-faint mb-1.5">Quick add:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_WORK_CATEGORIES.filter(p => !workCategories.some((c: any) => c.name === p.name)).map(p => (
                      <button key={p.name} onClick={() => quickAddCat(p)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-ink-faint border border-dashed border-surface-200 hover:border-primary hover:text-primary transition-all"
                        style={{ borderRadius: 'var(--radius)' }}>
                        {p.icon} {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Work Activity Rates ───────────────────────────────────────────────── */}
      {section === 'activity-rates' && (
        <>
          <div className="flex justify-between items-center">
            <div className="text-sm text-ink-faint">{workActivityRates.length} activity rate{workActivityRates.length !== 1 ? 's' : ''}</div>
            <Button size="sm" onClick={openCreateWar} icon={<Plus className="w-3.5 h-3.5" />}>Add Activity Rate</Button>
          </div>

          {workActivityRates.length === 0 ? (
            <div className="card py-16 text-center text-sm text-ink-faint">
              No activity rates yet — pair a work category with a labour rate to create one.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedWars).sort(([a], [b]) => a.localeCompare(b)).map(([category, wars]) => (
                <div key={category}>
                  <div className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{category}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-surface-200 text-ink-faint text-left">
                          <th className="py-2 pr-4 font-medium">Name</th>
                          <th className="py-2 pr-4 font-medium">Category</th>
                          <th className="py-2 pr-4 font-medium">Labour</th>
                          <th className="py-2 pr-4 font-medium">Speed</th>
                          <th className="py-2 pr-4 font-medium">Crew</th>
                          <th className="py-2 w-16" />
                        </tr>
                      </thead>
                      <tbody>
                        {wars.map((w: any) => (
                          <tr key={w.id} className="border-b border-surface-100 group hover:bg-surface-50 transition-colors">
                            <td className="py-2 pr-4 font-medium text-ink">{w.name}</td>
                            <td className="py-2 pr-4 text-ink-muted">{w.categoryIcon} {w.categoryName}</td>
                            <td className="py-2 pr-4 text-ink-muted">{w.rateName}{isOwner && w.rateValue ? <span className="ml-1 font-mono text-ink-faint">(${w.rateValue?.toFixed(2)}/{w.rateUnitLabel})</span> : null}</td>
                            <td className="py-2 pr-4 text-ink-muted">
                              {w.speedMode === 'rate'
                                ? `${w.defaultRatePerHr ?? '—'}/hr`
                                : `${w.defaultTimePerUnit ?? '—'} min/unit`}
                            </td>
                            <td className="py-2 pr-4 text-ink-muted">{w.crewSize}</td>
                            <td className="py-2">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                <Button size="xs" variant="ghost" onClick={() => openEditWar(w)} icon={<Edit3 className="w-3 h-3" />} />
                                <Button size="xs" variant="danger" onClick={() => removeWar(w)} icon={<Trash2 className="w-3 h-3" />} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Labour Category Modal ─────────────────────────────────────────────── */}
      <Modal open={rateModal} onClose={() => setRateModal(false)} title={rateEditing ? 'Edit Labour Category' : 'Add Labour Category'} maxWidth="max-w-sm">
        <div className="space-y-4">
          {/* Live preview */}
          <div className="flex items-center justify-center py-3">
            <div className="flex items-center gap-2.5 px-4 py-2.5 border border-surface-200 bg-surface-50"
              style={{ borderRadius: 'var(--radius)' }}>
              <span className="text-xl">{LABOUR_ICONS[rateForm.name] ?? '👷'}</span>
              <span className="text-sm font-semibold text-ink">{rateForm.name || 'Category Name'}</span>
            </div>
          </div>
          <div>
            <label className="label">Name *</label>
            <input className="input" value={rateForm.name} onChange={setRate('name')} placeholder="e.g. Worker, Supervisor, Foreman" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unit Type</label>
              <select className="input" value={rateForm.unitType} onChange={onUnitTypeChange}>
                {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unit Label</label>
              <input className="input" value={rateForm.unitLabel} onChange={setRate('unitLabel')} placeholder="e.g. hr" />
            </div>
          </div>
          {isOwner && (
            <div>
              <label className="label">Rate ($/unit)</label>
              <input className="input" type="number" step="any" min={0} value={rateForm.rate} onChange={setRate('rate')} placeholder="0.00" />
              <div className="text-[10px] text-ink-faint mt-1">Only visible to owners. Can also be set in Settings.</div>
            </div>
          )}
          <div>
            <label className="label">Notes</label>
            <input className="input" value={rateForm.notes} onChange={setRate('notes')} placeholder="Optional" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="secondary" onClick={() => setRateModal(false)} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
            <Button size="sm" variant="success" onClick={saveRate} disabled={!rateForm.name.trim() || rateLoading}
              icon={<Check className="w-3.5 h-3.5" />}>
              {rateLoading ? 'Saving...' : rateEditing ? 'Save' : 'Add Category'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Work Category Modal ───────────────────────────────────────────────── */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title={catEditing ? 'Edit Category' : 'Add Category'} maxWidth="max-w-sm">
        <div className="space-y-4">
          {/* Live preview */}
          <div className="flex items-center justify-center py-3">
            <div className="flex items-center gap-2 px-4 py-2.5 border border-surface-200 bg-surface-50"
              style={{ borderRadius: 'var(--radius)', borderLeft: `3px solid ${catForm.color}` }}>
              <span className="text-xl">{catForm.icon || '🔧'}</span>
              <span className="text-sm font-semibold text-ink">{catForm.name || 'Category Name'}</span>
            </div>
          </div>
          <div>
            <label className="label">Name *</label>
            <input className="input" value={catForm.name} onChange={setCat('name')} placeholder="e.g. Cutting, Welding" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Icon (emoji)</label>
              <div className="relative">
                <input className="input pl-9 text-center" value={catForm.icon} onChange={setCat('icon')} placeholder="🔧" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">{catForm.icon || '🔧'}</span>
              </div>
            </div>
            <div>
              <label className="label">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={catForm.color} onChange={setCat('color')}
                  className="w-9 h-9 rounded cursor-pointer border border-surface-200 p-0.5" />
                <input className="input flex-1 font-mono text-xs" value={catForm.color} onChange={setCat('color')} placeholder="#7c3aed" />
              </div>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={catForm.description} onChange={setCat('description')} placeholder="Optional" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="secondary" onClick={() => setCatModal(false)} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
            <Button size="sm" variant="success" onClick={saveCat} disabled={!catForm.name.trim() || catLoading}
              icon={<Check className="w-3.5 h-3.5" />}>
              {catLoading ? 'Saving...' : catEditing ? 'Save' : 'Add Category'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Work Activity Rate Modal ──────────────────────────────────────────── */}
      <Modal open={warModal} onClose={() => setWarModal(false)} title={warEditing ? 'Edit Activity Rate' : 'Add Activity Rate'} maxWidth="max-w-md">
        <div className="space-y-3">
          <div>
            <label className="label">Name *</label>
            <input className="input" value={warForm.name} onChange={setWar('name')} placeholder="e.g. Welding @ $85/hr" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Work Category *</label>
              <select className="input" value={warForm.workCategoryId} onChange={setWar('workCategoryId')}>
                <option value="">Select category...</option>
                {workCategories.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Labour Category *</label>
              <select className="input" value={warForm.labourRateId} onChange={setWar('labourRateId')}>
                <option value="">Select category...</option>
                {labourRates.map((r: any) => <option key={r.id} value={r.id}>{LABOUR_ICONS[r.name] ?? '👷'} {r.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Speed Mode</label>
              <select className="input" value={warForm.speedMode} onChange={setWar('speedMode')}>
                {SPEED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{warForm.speedMode === 'rate' ? 'Units/hr' : 'Min/unit'}</label>
              <input className="input" type="number" step="any" min={0}
                value={warForm.speedMode === 'rate' ? warForm.defaultRatePerHr : warForm.defaultTimePerUnit}
                onChange={setWar(warForm.speedMode === 'rate' ? 'defaultRatePerHr' : 'defaultTimePerUnit')}
                placeholder="0" />
            </div>
            <div>
              <label className="label">Crew Size</label>
              <input className="input" type="number" min={1} value={warForm.crewSize} onChange={setWar('crewSize')} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={warForm.notes} onChange={setWar('notes')} placeholder="Optional" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="secondary" onClick={() => setWarModal(false)} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
            <Button size="sm" variant="success" onClick={saveWar} disabled={!warForm.name.trim() || !warForm.workCategoryId || !warForm.labourRateId || warLoading}
              icon={<Check className="w-3.5 h-3.5" />}>
              {warLoading ? 'Saving...' : warEditing ? 'Save' : 'Add Activity Rate'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
