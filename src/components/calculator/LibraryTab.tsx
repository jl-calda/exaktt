// src/components/calculator/LibraryTab.tsx
// Full library inline component — used inside MaterialsTab > Library sub-tab
'use client'
import { useState, useEffect } from 'react'
import { Search, Plus, Trash2, Edit3, Check, X, Package } from 'lucide-react'
import type { LibraryItem, LibraryItemSpec, GlobalTag } from '@/types'
import type { Plan } from '@prisma/client'
import { getLimits } from '@/lib/limits'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import UpgradePrompt from '@/components/billing/UpgradePrompt'

interface Props {
  plan:          Plan
  globalTags:    GlobalTag[]
  onAddToSystem: (item: LibraryItem) => void
}

const CATEGORIES = [
  { id: 'all',         label: 'All',         icon: '♻' },
  { id: 'plates',      label: 'Plates',      icon: '⬛' },
  { id: 'fasteners',   label: 'Fasteners',   icon: '🔩' },
  { id: 'ladder',      label: 'Ladder',      icon: '🪜' },
  { id: 'lifeline',    label: 'Lifeline',    icon: '🦺' },
  { id: 'consumables', label: 'Consumables', icon: '🪣' },
  { id: 'hardware',    label: 'Hardware',    icon: '🔧' },
  { id: 'other',       label: 'Other',       icon: '📦' },
]

const BLANK_ITEM = (): Partial<LibraryItem> => ({
  name: '', unit: 'each', notes: '', productCode: '',
  category: 'other', photo: null, properties: {}, tags: [],
  spec: { stockLengthMm: undefined, storageLengthMm: undefined, unitPrice: undefined, currency: 'SGD', supplier: '', supplierCode: '', leadTimeDays: undefined },
})

export default function LibraryTab({ plan, globalTags, onAddToSystem }: Props) {
  const limits = getLimits(plan)
  const [items,     setItems]     = useState<LibraryItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<LibraryItem> | null>(null)
  const [adding,    setAdding]    = useState(false)
  const [addDraft,  setAddDraft]  = useState<Partial<LibraryItem>>(BLANK_ITEM())
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/mto/library')
      .then(r => r.json())
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = items.filter(item => {
    if (catFilter !== 'all' && item.category !== catFilter) return false
    if (tagFilter && !(item.tags ?? []).includes(tagFilter)) return false
    if (search.trim() && !item.name.toLowerCase().includes(search.toLowerCase()) &&
        !(item.productCode ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleAdd = async () => {
    if (!addDraft.name?.trim()) return
    setSaving(true); setError(null)
    const res = await fetch('/api/mto/library', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addDraft),
    })
    const { data, error: err } = await res.json()
    if (err) { setError(err); setSaving(false); return }
    setItems(prev => [data, ...prev])
    setAddDraft(BLANK_ITEM()); setAdding(false); setSaving(false)
  }

  const handleUpdate = async () => {
    if (!editingId || !editDraft) return
    setSaving(true); setError(null)
    const res = await fetch('/api/mto/library', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, ...editDraft }),
    })
    const { data, error: err } = await res.json()
    if (err) { setError(err); setSaving(false); return }
    setItems(prev => prev.map(i => i.id === editingId ? data : i))
    setEditingId(null); setEditDraft(null); setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await fetch('/api/mto/library', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setItems(prev => prev.filter(i => i.id !== id))
    setDeleteId(null)
  }

  const startEdit = (item: LibraryItem) => {
    setEditingId(item.id)
    setEditDraft({ ...item, spec: { ...(item.spec ?? {}) } })
    setAdding(false)
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or code…" className="input pl-9 text-sm" />
        </div>
        <span className="text-xs text-ink-faint">{filtered.length} of {items.length}</span>
        {(limits.maxLibraryItems === -1 || items.length < limits.maxLibraryItems) ? (
          <button onClick={() => { setAdding(v => !v); setEditingId(null) }} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        ) : (
          <button className="btn-secondary text-sm text-primary border-primary/30">🔒 Limit reached</button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCatFilter(c.id)}
            className={`badge border px-3 py-1 text-xs cursor-pointer transition-all ${catFilter === c.id ? 'bg-ink text-white border-ink' : 'border-surface-300 text-ink-muted hover:border-ink-muted'}`}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      {globalTags.length > 0 && limits.tags && (
        <div className="flex gap-1.5 flex-wrap mb-5">
          {globalTags.map(t => (
            <button key={t.id} onClick={() => setTagFilter(f => f === t.id ? null : t.id)}
              style={{ background: tagFilter === t.id ? t.color + '18' : undefined, color: tagFilter === t.id ? t.color : undefined, borderColor: tagFilter === t.id ? t.color + '60' : undefined }}
              className="badge border border-surface-300 text-ink-muted px-3 py-1 text-xs cursor-pointer transition-all">
              {t.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3 mb-4">{error}</div>
      )}

      {/* Add item form */}
      {adding && (
        <div className="card p-5 mb-5 border-primary/30 bg-primary/5 animate-fade-in">
          <div className="text-xs font-bold text-primary uppercase tracking-wide mb-4">New Library Item</div>
          <ItemForm
            draft={addDraft} plan={plan} globalTags={globalTags}
            onSet={(k, v) => setAddDraft(d => ({ ...d, [k]: v }))}
            onSetSpec={(k, v) => setAddDraft(d => ({ ...d, spec: { ...(d.spec ?? {}), [k]: v } }))}
          />
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} disabled={!addDraft.name?.trim() || saving} className="btn-primary text-sm">
              {saving ? 'Saving…' : 'Add to Library'}
            </button>
            <button onClick={() => setAdding(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-ink-faint text-center py-8">Loading library…</div>}

      {!loading && filtered.length === 0 && !adding && (
        <div className="card p-12 text-center">
          <Package className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <p className="text-sm font-medium text-ink mb-1">
            {items.length === 0 ? 'Your library is empty' : 'No items match your filters'}
          </p>
          <p className="text-xs text-ink-faint">
            {items.length === 0
              ? 'Add reusable material definitions here — plates, fasteners, ladder sections, etc.'
              : 'Try a different category or clear your search.'}
          </p>
        </div>
      )}

      {/* Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => {
          const isEd = editingId === item.id
          return (
            <div key={item.id} className={`card overflow-hidden transition-all ${isEd ? 'ring-2 ring-primary col-span-full' : ''}`}>
              {!isEd ? (
                <div className="p-4 flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                    {CATEGORIES.find(c => c.id === item.category)?.icon ?? '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-ink">{item.name}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="badge bg-surface-100 text-ink-muted">{item.unit}</span>
                      {item.productCode && <code className="text-[10px] bg-surface-100 text-ink-muted px-1.5 py-0.5 rounded">{item.productCode}</code>}
                    </div>
                    {item.notes && <p className="text-xs text-ink-faint mt-0.5 italic truncate">{item.notes}</p>}
                    {limits.stockInfo && item.spec?.stockLengthMm && (
                      <div className="text-[10px] text-ink-faint mt-1">
                        Stock: {item.spec.stockLengthMm}mm
                        {item.spec.storageLengthMm ? ` · Storage: ${item.spec.storageLengthMm}mm` : ''}
                      </div>
                    )}
                    {limits.pricing && item.spec?.unitPrice && (
                      <div className="text-[10px] text-primary font-semibold mt-0.5">
                        {item.spec.currency ?? 'SGD'} {item.spec.unitPrice.toFixed(2)}
                        {item.spec.supplier ? ` · ${item.spec.supplier}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => onAddToSystem(item)} title="Add to system" className="btn-ghost px-2 py-1.5 text-xs text-emerald-600">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => startEdit(item)} className="btn-ghost px-2 py-1.5 text-xs">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(item.id)} className="btn-ghost px-2 py-1.5 text-xs text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5">
                  <div className="text-xs font-bold text-primary uppercase tracking-wide mb-4">Edit Library Item</div>
                  {editDraft && (
                    <ItemForm
                      draft={editDraft} plan={plan} globalTags={globalTags}
                      onSet={(k, v) => setEditDraft(d => ({ ...d!, [k]: v }))}
                      onSetSpec={(k, v) => setEditDraft(d => ({ ...d!, spec: { ...(d?.spec ?? {}), [k]: v } }))}
                    />
                  )}
                  <div className="flex gap-2 mt-4">
                    <button onClick={handleUpdate} disabled={saving} className="btn-primary text-sm">
                      <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setEditingId(null); setEditDraft(null) }} className="btn-secondary text-sm">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ItemForm — shared between Add and Edit ───────────────────────────────────
function ItemForm({ draft, plan, globalTags, onSet, onSetSpec }: {
  draft:      Partial<LibraryItem>
  plan:       Plan
  globalTags: GlobalTag[]
  onSet:      (k: keyof LibraryItem, v: any) => void
  onSetSpec:  (k: keyof LibraryItemSpec, v: any) => void
}) {
  const limits = getLimits(plan)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Name *</label>
          <input value={draft.name ?? ''} onChange={e => onSet('name', e.target.value)}
            className="input text-sm" placeholder='e.g. "316 SS Wire Rope 8mm"' autoFocus />
        </div>
        <div>
          <label className="label">Unit</label>
          <input value={draft.unit ?? 'each'} onChange={e => onSet('unit', e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="label">Product Code</label>
          <input value={draft.productCode ?? ''} onChange={e => onSet('productCode', e.target.value)} className="input text-sm" placeholder="WR-8MM-316" />
        </div>
        <div>
          <label className="label">Category</label>
          <select value={draft.category ?? 'other'} onChange={e => onSet('category', e.target.value)} className="input text-sm">
            {CATEGORIES.filter(c => c.id !== 'all').map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Notes</label>
          <input value={draft.notes ?? ''} onChange={e => onSet('notes', e.target.value)}
            className="input text-sm" placeholder="Optional description" />
        </div>
      </div>

      {globalTags.length > 0 && limits.tags && (
        <div>
          <label className="label">Tags</label>
          <div className="flex flex-wrap gap-2">
            {globalTags.map(t => {
              const active = (draft.tags ?? []).includes(t.id)
              return (
                <button key={t.id} type="button"
                  onClick={() => onSet('tags', active
                    ? (draft.tags ?? []).filter(x => x !== t.id)
                    : [...(draft.tags ?? []), t.id])}
                  style={{ background: active ? t.color + '18' : undefined, color: active ? t.color : undefined, borderColor: active ? t.color + '60' : undefined }}
                  className="badge border border-surface-300 text-ink-muted transition-all cursor-pointer px-3 py-1">
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {(limits.stockInfo || limits.pricing) ? (
        <div>
          <div className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">Material Spec</div>
          <div className="grid grid-cols-2 gap-3">
            {limits.stockInfo && (
              <>
                <div>
                  <label className="label">Stock Length (mm)</label>
                  <input type="number" value={draft.spec?.stockLengthMm ?? ''}
                    onChange={e => onSetSpec('stockLengthMm', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="input text-sm" placeholder="e.g. 6000" />
                </div>
                <div>
                  <label className="label">Storage Length (mm)</label>
                  <input type="number" value={draft.spec?.storageLengthMm ?? ''}
                    onChange={e => onSetSpec('storageLengthMm', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="input text-sm" placeholder="Max transport length" />
                </div>
                <div>
                  <label className="label">Supplier</label>
                  <input value={draft.spec?.supplier ?? ''}
                    onChange={e => onSetSpec('supplier', e.target.value)}
                    className="input text-sm" placeholder="Supplier name" />
                </div>
                <div>
                  <label className="label">Supplier Code</label>
                  <input value={draft.spec?.supplierCode ?? ''}
                    onChange={e => onSetSpec('supplierCode', e.target.value)}
                    className="input text-sm" placeholder="Supplier part no." />
                </div>
                <div>
                  <label className="label">Lead Time (days)</label>
                  <input type="number" value={draft.spec?.leadTimeDays ?? ''}
                    onChange={e => onSetSpec('leadTimeDays', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="input text-sm" placeholder="e.g. 14" />
                </div>
              </>
            )}
            {limits.pricing && (
              <>
                <div>
                  <label className="label">Unit Price</label>
                  <input type="number" step="0.01" value={draft.spec?.unitPrice ?? ''}
                    onChange={e => onSetSpec('unitPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="input text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select value={draft.spec?.currency ?? 'SGD'}
                    onChange={e => onSetSpec('currency', e.target.value)}
                    className="input text-sm">
                    {['SGD','USD','AUD','GBP','EUR','MYR'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <UpgradePrompt
          feature="Stock lengths & pricing"
          description="Add unit prices, stock lengths, supplier info and lead times to library items."
          upgradeTo="PRO"
          compact
        />
      )}
      <ConfirmModal
        open={deleteId !== null}
        title="Remove from library?"
        message="This item will be permanently removed from your library."
        onConfirm={() => { if (deleteId) handleDelete(deleteId) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
