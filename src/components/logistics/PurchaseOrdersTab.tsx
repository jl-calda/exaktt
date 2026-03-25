// src/components/logistics/PurchaseOrdersTab.tsx
'use client'
import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Edit3, Trash2, Check, X, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { format } from 'date-fns'
import { nanoid } from 'nanoid'

type POStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED'

const STATUS_META: Record<POStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: '#f1f5f9', color: '#64748b' },
  SENT:      { label: 'Sent',      bg: '#eff6ff', color: '#1d4ed8' },
  PARTIAL:   { label: 'Partial',   bg: '#fffbeb', color: '#d97706' },
  RECEIVED:  { label: 'Received',  bg: '#f0fdf4', color: '#16a34a' },
  CANCELLED: { label: 'Cancelled', bg: '#f9fafb', color: '#9ca3af' },
}

const STATUS_TABS: Array<{ id: POStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' }, { id: 'DRAFT', label: 'Draft' }, { id: 'SENT', label: 'Sent' },
  { id: 'PARTIAL', label: 'Partial' }, { id: 'RECEIVED', label: 'Received' },
]

interface LineItem { _key: string; libraryItemId: string; itemName: string; itemUnit: string; qtyOrdered: number; unitPrice: number | '' }

interface Props {
  pos:       any[]
  suppliers: any[]
  library:   any[]
  onRefresh: () => void
}

const PO_UNITS = [
  'each', 'pcs', 'm', 'mm', 'kg', 'L', 'set', 'pack',
].map(u => ({ value: u, label: u }))

const BLANK_LINE = (): LineItem => ({ _key: nanoid(6), libraryItemId: '', itemName: '', itemUnit: 'each', qtyOrdered: 1, unitPrice: '' })

export default function PurchaseOrdersTab({ pos, suppliers, library, onRefresh }: Props) {
  const [filter,     setFilter]     = useState<POStatus | 'all'>('all')
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set())
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState<any | null>(null)
  const [loading,    setLoading]    = useState(false)

  // Form state
  const [supplierId,   setSupplierId]   = useState('')
  const [ref,          setRef]          = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [status,       setStatus]       = useState<POStatus>('DRAFT')
  const [notes,        setNotes]        = useState('')
  const [lines,        setLines]        = useState<LineItem[]>([BLANK_LINE()])

  const filtered = filter === 'all' ? pos : pos.filter(p => p.status === filter)

  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const openCreate = () => {
    setEditing(null)
    setSupplierId(''); setRef(''); setExpectedDate(''); setStatus('DRAFT'); setNotes('')
    setLines([BLANK_LINE()])
    setShowModal(true)
  }

  const openEdit = (po: any) => {
    setEditing(po)
    setSupplierId(po.supplierId ?? '')
    setRef(po.ref ?? '')
    setExpectedDate(po.expectedDate ? format(new Date(po.expectedDate), 'yyyy-MM-dd') : '')
    setStatus(po.status)
    setNotes(po.notes ?? '')
    setLines((po.lines ?? []).map((l: any) => ({ _key: l.id, libraryItemId: l.libraryItemId ?? '', itemName: l.itemName, itemUnit: l.itemUnit, qtyOrdered: l.qtyOrdered, unitPrice: l.unitPrice ?? '' })))
    setShowModal(true)
  }

  const addLine    = () => setLines(ls => [...ls, BLANK_LINE()])
  const removeLine = (key: string) => setLines(ls => ls.filter(l => l._key !== key))
  const updateLine = (key: string, patch: Partial<LineItem>) => setLines(ls => ls.map(l => l._key === key ? { ...l, ...patch } : l))

  const selectMaterial = (key: string, item: any) => {
    updateLine(key, { libraryItemId: item.id, itemName: item.name, itemUnit: item.unit, unitPrice: (item.spec?.unitPrice ?? '') })
  }

  const save = async () => {
    if (!lines.some(l => l.itemName.trim())) return
    setLoading(true)
    const sup = suppliers.find(s => s.id === supplierId)
    const payload = {
      supplierId: supplierId || null,
      supplierName: sup?.name ?? null,
      ref: ref.trim() || null,
      expectedDate: expectedDate || null,
      status,
      notes: notes.trim() || null,
      lines: lines.filter(l => l.itemName.trim()).map(({ _key, ...l }) => ({
        ...l, unitPrice: l.unitPrice === '' ? null : l.unitPrice,
      })),
    }
    if (editing) {
      await fetch('/api/logistics/po', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/logistics/po', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setLoading(false)
    setShowModal(false)
    onRefresh()
  }

  const remove = async (po: any) => {
    if (!confirm(`Delete PO "${po.ref || po.id.slice(0, 6)}"?`)) return
    await fetch('/api/logistics/po', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: po.id }) })
    onRefresh()
  }

  const totalValue = (po: any) => {
    const t = (po.lines ?? []).reduce((s: number, l: any) => s + (l.qtyOrdered * (l.unitPrice ?? 0)), 0)
    return t > 0 ? t.toFixed(2) : null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1">
          {STATUS_TABS.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${
                filter === t.id ? 'bg-primary text-white border-primary' : 'bg-white text-ink-muted border-surface-300 hover:border-surface-400'
              }`}>
              {t.label}
              {t.id !== 'all' && <span className="ml-1 opacity-60">{pos.filter(p => p.status === t.id).length}</span>}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={openCreate} icon={<Plus className="w-3.5 h-3.5" />}>New PO</Button>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-ink-faint">
            {pos.length === 0 ? 'No purchase orders yet.' : 'No orders match this filter.'}
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {filtered.map(po => {
              const s   = STATUS_META[po.status as POStatus] ?? STATUS_META.DRAFT
              const ref = po.ref || `PO-${po.id.slice(0, 6).toUpperCase()}`
              const val = totalValue(po)
              const isExp = expanded.has(po.id)
              return (
                <div key={po.id}>
                  <div className="px-5 py-3 flex items-center gap-3 hover:bg-surface-50 cursor-pointer"
                    onClick={() => toggleExpand(po.id)}>
                    {isExp ? <ChevronDown className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-ink">{ref}</span>
                        <span className="badge text-[10px] font-semibold px-2 py-0.5" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                        {val && <span className="text-xs text-ink-muted">${val}</span>}
                      </div>
                      <div className="text-xs text-ink-faint mt-0.5">
                        {po.supplierName ?? po.supplier?.name ?? 'No supplier'}
                        {' · '}{(po.lines ?? []).length} line{(po.lines ?? []).length !== 1 ? 's' : ''}
                        {' · '}{format(new Date(po.orderDate), 'd MMM yyyy')}
                        {po.expectedDate && ` · Expected ${format(new Date(po.expectedDate), 'd MMM')}`}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <Button size="xs" variant="ghost" onClick={() => openEdit(po)} icon={<Edit3 className="w-3 h-3" />} />
                      <Button size="xs" variant="danger" onClick={() => remove(po)} icon={<Trash2 className="w-3 h-3" />} />
                    </div>
                  </div>
                  {isExp && (po.lines ?? []).length > 0 && (
                    <div className="px-10 pb-3 pt-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-ink-faint">
                            <th className="text-left py-1 pr-4">Material</th>
                            <th className="text-left py-1 pr-4">Unit</th>
                            <th className="text-right py-1 pr-4">Qty</th>
                            <th className="text-right py-1">Unit Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                          {po.lines.map((l: any) => (
                            <tr key={l.id}>
                              <td className="py-1.5 pr-4 text-ink">{l.itemName}</td>
                              <td className="py-1.5 pr-4 text-ink-muted">{l.itemUnit}</td>
                              <td className="py-1.5 pr-4 text-right text-ink">{l.qtyOrdered}</td>
                              <td className="py-1.5 text-right text-ink-muted">{l.unitPrice != null ? `$${l.unitPrice.toFixed(2)}` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Purchase Order' : 'New Purchase Order'} maxWidth="max-w-2xl">
        <div className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Supplier</label>
              <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">— select supplier —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">PO Reference</label>
              <input className="input" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. PO-2025-001" />
            </div>
            <div>
              <label className="label">Expected Delivery</label>
              <input className="input" type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value as POStatus)}>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {/* Lines */}
          <div className="border-t border-surface-200 pt-4">
            <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-3">Line Items</div>
            <div className="space-y-2">
              {lines.map(line => (
                <div key={line._key} className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <label className="label">Material</label>
                    <div className="relative">
                      <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-faint pointer-events-none" />
                      <input
                        value={line.itemName}
                        onChange={e => updateLine(line._key, { itemName: e.target.value, libraryItemId: '' })}
                        list={`lib-${line._key}`}
                        placeholder="Search or type name…"
                        className="input text-xs py-1.5 pl-7"
                      />
                      <datalist id={`lib-${line._key}`}>
                        {library.map(item => <option key={item.id} value={item.name} />)}
                      </datalist>
                    </div>
                  </div>
                  <div className="w-20">
                    <label className="label">Unit</label>
                    <Select options={PO_UNITS} value={line.itemUnit} onChange={e => updateLine(line._key, { itemUnit: e.target.value })} className="text-xs py-1.5" />
                  </div>
                  <div className="w-20">
                    <label className="label">Qty</label>
                    <input className="input text-xs py-1.5" type="number" min={0} step="any" value={line.qtyOrdered} onChange={e => updateLine(line._key, { qtyOrdered: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="w-24">
                    <label className="label">Unit Price</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-faint pointer-events-none">$</span>
                      <input className="input text-xs py-1.5 pl-6" type="number" min={0} step="0.01" value={line.unitPrice} onChange={e => updateLine(line._key, { unitPrice: e.target.value === '' ? '' : parseFloat(e.target.value) })} placeholder="0.00" />
                    </div>
                  </div>
                  <Button size="xs" variant="danger" onClick={() => removeLine(line._key)} icon={<X className="w-3 h-3" />} />
                </div>
              ))}
              <button onClick={addLine}
                className="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-surface-300 rounded py-2 text-xs text-ink-faint hover:border-primary hover:text-primary transition-colors">
                <Plus className="w-3 h-3" /> Add Line
              </button>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="secondary" onClick={() => setShowModal(false)} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
            <Button size="sm" variant="success" onClick={save} disabled={loading || !lines.some(l => l.itemName.trim())}
              icon={<Check className="w-3.5 h-3.5" />}>
              {loading ? 'Saving…' : editing ? 'Save' : 'Create PO'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
