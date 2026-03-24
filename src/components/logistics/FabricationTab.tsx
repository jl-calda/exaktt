// src/components/logistics/FabricationTab.tsx
'use client'
import { useState } from 'react'
import { Plus, Edit3, Trash2, Check, X, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface Props {
  labourRates: any[]
  onRefresh: () => void
}

const UNIT_OPTIONS = [
  { value: 'per_piece', label: 'Per piece',     defaultUnit: 'pc'  },
  { value: 'per_dim',   label: 'Per dimension',  defaultUnit: 'm'   },
  { value: 'per_hour',  label: 'Per hour',       defaultUnit: 'hr'  },
  { value: 'lump_sum',  label: 'Lump sum',       defaultUnit: 'lot' },
]

const BLANK = { name: '', category: '', unitType: 'per_hour', unitLabel: 'hr', rate: '', notes: '' }

export default function FabricationTab({ labourRates, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<any | null>(null)
  const [form,      setForm]      = useState({ ...BLANK })
  const [loading,   setLoading]   = useState(false)

  const openCreate = () => { setEditing(null); setForm({ ...BLANK }); setShowModal(true) }
  const openEdit   = (r: any) => {
    setEditing(r)
    setForm({ name: r.name, category: r.category ?? '', unitType: r.unitType, unitLabel: r.unitLabel ?? '', rate: String(r.rate ?? ''), notes: r.notes ?? '' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    setLoading(true)
    const payload = { ...form, rate: parseFloat(form.rate) || 0 }
    if (editing) {
      await fetch('/api/mto/labour-rates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/mto/labour-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setLoading(false)
    setShowModal(false)
    onRefresh()
  }

  const remove = async (r: any) => {
    if (!confirm(`Archive "${r.name}"?`)) return
    await fetch('/api/mto/labour-rates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id }) })
    onRefresh()
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const onUnitTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const unitType = e.target.value
    const opt = UNIT_OPTIONS.find(o => o.value === unitType)
    setForm(f => ({ ...f, unitType, unitLabel: opt?.defaultUnit ?? '' }))
  }

  // Group by category
  const grouped = labourRates.reduce<Record<string, any[]>>((acc, r) => {
    const cat = r.category || 'Uncategorised'
    ;(acc[cat] ??= []).push(r)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-ink-faint">{labourRates.length} rate{labourRates.length !== 1 ? 's' : ''}</div>
        <Button size="sm" onClick={openCreate} icon={<Plus className="w-3.5 h-3.5" />}>Add Rate</Button>
      </div>

      {labourRates.length === 0 ? (
        <div className="card py-16 text-center text-sm text-ink-faint">
          No fabrication rates yet — add your first rate to start costing activities.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, rates]) => (
            <div key={category}>
              <div className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{category}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-surface-200 text-ink-faint text-left">
                      <th className="py-2 pr-4 font-medium">Name</th>
                      <th className="py-2 pr-4 font-medium">Type</th>
                      <th className="py-2 pr-4 font-medium text-right">Rate</th>
                      <th className="py-2 pr-4 font-medium">Unit</th>
                      <th className="py-2 pr-4 font-medium">Notes</th>
                      <th className="py-2 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((r: any) => (
                      <tr key={r.id} className="border-b border-surface-100 group hover:bg-surface-50 transition-colors">
                        <td className="py-2 pr-4 font-medium text-ink">{r.name}</td>
                        <td className="py-2 pr-4 text-ink-muted">{UNIT_OPTIONS.find(o => o.value === r.unitType)?.label ?? r.unitType}</td>
                        <td className="py-2 pr-4 text-right font-mono text-ink">{r.rate.toFixed(2)}</td>
                        <td className="py-2 pr-4 text-ink-muted">/{r.unitLabel}</td>
                        <td className="py-2 pr-4 text-ink-faint italic truncate max-w-[200px]">{r.notes ?? ''}</td>
                        <td className="py-2">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <Button size="xs" variant="ghost" onClick={() => openEdit(r)} icon={<Edit3 className="w-3 h-3" />} />
                            <Button size="xs" variant="danger" onClick={() => remove(r)} icon={<Trash2 className="w-3 h-3" />} />
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Rate' : 'Add Rate'} maxWidth="max-w-md">
        <div className="space-y-3">
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Cable swaging" autoFocus />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={set('category')} placeholder="e.g. Fabrication, Installation" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Unit Type</label>
              <select className="input" value={form.unitType} onChange={onUnitTypeChange}>
                {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unit Label</label>
              <input className="input" value={form.unitLabel} onChange={set('unitLabel')} placeholder="e.g. pc, m, hr" />
            </div>
            <div>
              <label className="label">Rate ($/unit)</label>
              <input className="input" type="number" step="any" min={0} value={form.rate} onChange={set('rate')} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={form.notes} onChange={set('notes')} placeholder="Optional" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="secondary" onClick={() => setShowModal(false)} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
            <Button size="sm" variant="success" onClick={save} disabled={!form.name.trim() || loading}
              icon={<Check className="w-3.5 h-3.5" />}>
              {loading ? 'Saving...' : editing ? 'Save' : 'Add Rate'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
