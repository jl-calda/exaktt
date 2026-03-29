'use client'
import { useState } from 'react'
import { Edit3, Check, X } from 'lucide-react'

const UNIT_OPTIONS = [
  { value: 'per_piece', label: 'Per piece' },
  { value: 'per_dim',   label: 'Per dimension' },
  { value: 'per_hour',  label: 'Per hour' },
  { value: 'lump_sum',  label: 'Lump sum' },
]

const LABOUR_ICONS: Record<string, string> = {
  'Worker': '\uD83D\uDC77', 'Supervisor': '\uD83D\uDC54', 'Foreman': '\uD83C\uDFD7\uFE0F', 'Skilled Trade': '\uD83D\uDD27', 'Apprentice': '\uD83C\uDF93',
}

interface Props {
  initialLabourRates: any[]
}

export default function SettingsLabourClient({ initialLabourRates }: Props) {
  const [labourRates, setLabourRates] = useState<any[]>(initialLabourRates)
  const [editingRateId, setEditingRateId] = useState<string | null>(null)
  const [editRateValue, setEditRateValue] = useState('')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const showSaved = (msg = 'Saved') => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 2500) }

  const refreshLabourRates = () =>
    fetch('/api/mto/labour-rates').then(r => r.json()).then(j => { if (j.data) setLabourRates(j.data) })

  const startEditRate = (r: any) => { setEditingRateId(r.id); setEditRateValue(String(r.rate ?? 0)) }
  const cancelEditRate = () => { setEditingRateId(null); setEditRateValue('') }
  const saveLabourRate = async (r: any) => {
    const rate = parseFloat(editRateValue) || 0
    await fetch('/api/mto/labour-rates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, rate }) })
    setEditingRateId(null)
    refreshLabourRates()
    showSaved('Rate saved')
  }

  return (
    <div className="space-y-5">
      {saveMsg && (
        <div className="fixed top-[5.5rem] right-4 z-50 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-card">
          {saveMsg}
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-semibold text-[13px] text-ink mb-1">Labour Rates</h2>
        <p className="text-sm text-ink-muted mb-5">Set the hourly or unit rates for each labour category. Only owners can see these values — other team members will only see the category names.</p>

        {labourRates.length === 0 ? (
          <div className="text-center py-8 text-sm text-ink-faint">
            No labour categories yet. Add them from Logistics &rarr; Fabrication &rarr; Labour Categories.
          </div>
        ) : (
          <div className="space-y-2">
            {labourRates.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-surface-300 bg-surface-50">
                <span className="text-lg flex-shrink-0">{LABOUR_ICONS[r.name] ?? '\uD83D\uDC77'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink">{r.name}</div>
                  <div className="text-[11px] text-ink-faint">{UNIT_OPTIONS.find(o => o.value === r.unitType)?.label ?? r.unitType} &middot; /{r.unitLabel}</div>
                </div>
                {editingRateId === r.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink-muted">$</span>
                    <input type="number" step="any" min={0} value={editRateValue}
                      onChange={e => setEditRateValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveLabourRate(r); if (e.key === 'Escape') cancelEditRate() }}
                      className="input w-24 text-sm font-mono" autoFocus />
                    <span className="text-xs text-ink-faint">/{r.unitLabel}</span>
                    <button onClick={() => saveLabourRate(r)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={cancelEditRate} className="p-1.5 rounded-lg bg-surface-200 text-ink-muted hover:bg-surface-300"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <button onClick={() => startEditRate(r)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-300 hover:border-primary hover:bg-primary/5 transition-all group">
                    <span className="text-sm font-mono font-semibold text-ink">${r.rate?.toFixed(2) ?? '0.00'}</span>
                    <span className="text-xs text-ink-faint">/{r.unitLabel}</span>
                    <Edit3 className="w-3 h-3 text-ink-faint group-hover:text-primary transition-colors" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
