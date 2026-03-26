// src/components/logistics/DeliveriesTab.tsx
'use client'
import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Edit3, Trash2, Check, X, Truck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { format } from 'date-fns'
import { nanoid } from 'nanoid'

type DOStatus = 'PENDING' | 'PARTIAL' | 'DELIVERED' | 'CANCELLED'

const STATUS_META: Record<DOStatus, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Pending',   bg: '#fffbeb', color: '#d97706' },
  PARTIAL:   { label: 'Partial',   bg: '#eff6ff', color: '#1d4ed8' },
  DELIVERED: { label: 'Delivered', bg: '#f0fdf4', color: '#16a34a' },
  CANCELLED: { label: 'Cancelled', bg: '#f9fafb', color: '#9ca3af' },
}

const STATUS_TABS: Array<{ id: DOStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' }, { id: 'PENDING', label: 'Pending' },
  { id: 'PARTIAL', label: 'Partial' }, { id: 'DELIVERED', label: 'Delivered' },
]

interface LineItem { _key: string; poLineId: string | null; libraryItemId: string; itemName: string; itemUnit: string; qtyExpected: number; qtyDelivered: number }

interface Props {
  dos:         any[]
  pos:         any[]
  library:     any[]
  onRefresh:   () => void
  onRefreshPos: () => void
}

const DO_UNITS = [
  'each', 'pcs', 'm', 'mm', 'kg', 'L', 'set', 'pack',
].map(u => ({ value: u, label: u }))

const BLANK_LINE = (): LineItem => ({ _key: nanoid(6), poLineId: null, libraryItemId: '', itemName: '', itemUnit: 'each', qtyExpected: 1, qtyDelivered: 0 })

export default function DeliveriesTab({ dos, pos, library, onRefresh, onRefreshPos }: Props) {
  const [filter,    setFilter]    = useState<DOStatus | 'all'>('all')
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<any | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  // Form state
  const [poId,         setPoId]         = useState('')
  const [ref,          setRef]          = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [doStatus,     setDoStatus]     = useState<DOStatus>('PENDING')
  const [notes,        setNotes]        = useState('')
  const [lines,        setLines]        = useState<LineItem[]>([BLANK_LINE()])

  const filtered = filter === 'all' ? dos : dos.filter(d => d.status === filter)

  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const openCreate = () => {
    setEditing(null)
    setPoId(''); setRef(''); setExpectedDate(''); setDoStatus('PENDING'); setNotes('')
    setLines([BLANK_LINE()])
    setShowModal(true)
  }

  const openEdit = (doItem: any) => {
    setEditing(doItem)
    setPoId(doItem.poId ?? '')
    setRef(doItem.ref ?? '')
    setExpectedDate(doItem.expectedDate ? format(new Date(doItem.expectedDate), 'yyyy-MM-dd') : '')
    setDoStatus(doItem.status)
    setNotes(doItem.notes ?? '')
    setLines((doItem.lines ?? []).map((l: any) => ({
      _key: l.id, poLineId: l.poLineId ?? null, libraryItemId: l.libraryItemId ?? '',
      itemName: l.itemName, itemUnit: l.itemUnit, qtyExpected: l.qtyExpected, qtyDelivered: l.qtyDelivered,
    })))
    setShowModal(true)
  }

  // When PO is selected, prefill lines from PO lines
  const handlePoSelect = (id: string) => {
    setPoId(id)
    if (!id) { setLines([BLANK_LINE()]); return }
    const po = pos.find(p => p.id === id)
    if (!po?.lines?.length) return
    setLines(po.lines.map((l: any) => ({
      _key: nanoid(6), poLineId: l.id, libraryItemId: l.libraryItemId ?? '',
      itemName: l.itemName, itemUnit: l.itemUnit, qtyExpected: l.qtyOrdered, qtyDelivered: 0,
    })))
  }

  const addLine    = () => setLines(ls => [...ls, BLANK_LINE()])
  const removeLine = (key: string) => setLines(ls => ls.filter(l => l._key !== key))
  const updateLine = (key: string, patch: Partial<LineItem>) => setLines(ls => ls.map(l => l._key === key ? { ...l, ...patch } : l))

  const save = async () => {
    if (!lines.some(l => l.itemName.trim())) return
    setLoading(true)
    const payload = {
      poId: poId || null,
      ref: ref.trim() || null,
      expectedDate: expectedDate || null,
      status: doStatus,
      notes: notes.trim() || null,
      lines: lines.filter(l => l.itemName.trim()).map(({ _key, ...l }) => l),
    }
    if (editing) {
      await fetch('/api/logistics/do', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/logistics/do', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setLoading(false)
    setShowModal(false)
    onRefresh()
  }

  const markDelivered = async (doItem: any) => {
    const updatedLines = (doItem.lines ?? []).map((l: any) => ({ ...l, qtyDelivered: l.qtyExpected }))
    await fetch('/api/logistics/do', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: doItem.id, status: 'DELIVERED', deliveredDate: new Date().toISOString(), lines: updatedLines }),
    })
    onRefresh()
  }

  const remove = async (id: string) => {
    await fetch('/api/logistics/do', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setDeleteId(null)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1">
          {STATUS_TABS.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={`filter-pill ${filter === t.id ? 'active !bg-primary !text-white !border-primary' : ''}`}>
              {t.label}
              {t.id !== 'all' && <span className="ml-1 opacity-60">{dos.filter(d => d.status === t.id).length}</span>}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={openCreate} icon={<Plus className="w-3.5 h-3.5" />}>New Delivery</Button>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-ink-faint">
            {dos.length === 0 ? 'No delivery orders yet.' : 'No deliveries match this filter.'}
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {filtered.map(doItem => {
              const s   = STATUS_META[doItem.status as DOStatus] ?? STATUS_META.PENDING
              const ref = doItem.ref || `DO-${doItem.id.slice(0, 6).toUpperCase()}`
              const isExp = expanded.has(doItem.id)
              const isPending = ['PENDING', 'PARTIAL'].includes(doItem.status)
              return (
                <div key={doItem.id}>
                  <div className="list-row cursor-pointer"
                    onClick={() => toggleExpand(doItem.id)}>
                    {isExp ? <ChevronDown className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-ink">{ref}</span>
                        <span className="badge text-[10px] font-semibold px-2 py-0.5" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                      </div>
                      <div className="text-xs text-ink-faint mt-0.5">
                        {doItem.po?.supplierName ? `${doItem.po.supplierName}` : ''}
                        {doItem.po?.ref ? ` · ${doItem.po.ref}` : ''}
                        {' · '}{(doItem.lines ?? []).length} item{(doItem.lines ?? []).length !== 1 ? 's' : ''}
                        {doItem.expectedDate && ` · Expected ${format(new Date(doItem.expectedDate), 'd MMM yyyy')}`}
                        {doItem.deliveredDate && ` · Delivered ${format(new Date(doItem.deliveredDate), 'd MMM yyyy')}`}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {isPending && (
                        <Button size="xs" variant="success" onClick={() => markDelivered(doItem)}
                          icon={<Truck className="w-3 h-3" />}>Delivered</Button>
                      )}
                      <Button size="xs" variant="ghost" onClick={() => openEdit(doItem)} icon={<Edit3 className="w-3 h-3" />} />
                      <Button size="xs" variant="danger" onClick={() => setDeleteId(doItem.id)} icon={<Trash2 className="w-3 h-3" />} />
                    </div>
                  </div>
                  {isExp && (doItem.lines ?? []).length > 0 && (
                    <div className="px-10 pb-3 pt-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-ink-faint">
                            <th className="text-left py-1 pr-4">Material</th>
                            <th className="text-left py-1 pr-4">Unit</th>
                            <th className="text-right py-1 pr-4">Expected</th>
                            <th className="text-right py-1">Delivered</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                          {doItem.lines.map((l: any) => (
                            <tr key={l.id}>
                              <td className="py-1.5 pr-4 text-ink">{l.itemName}</td>
                              <td className="py-1.5 pr-4 text-ink-muted">{l.itemUnit}</td>
                              <td className="py-1.5 pr-4 text-right text-ink">{l.qtyExpected}</td>
                              <td className="py-1.5 text-right">
                                <span className={l.qtyDelivered >= l.qtyExpected ? 'text-emerald-600 font-semibold' : 'text-ink-muted'}>
                                  {l.qtyDelivered}
                                </span>
                              </td>
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Delivery Order' : 'New Delivery Order'} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Link to Purchase Order</label>
              <select className="input" value={poId} onChange={e => handlePoSelect(e.target.value)}>
                <option value="">— optional —</option>
                {pos.filter(p => p.status !== 'CANCELLED').map(p => (
                  <option key={p.id} value={p.id}>{p.ref || `PO-${p.id.slice(0, 6).toUpperCase()}`}{p.supplierName ? ` · ${p.supplierName}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">DO Reference</label>
              <input className="input" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. DO-2025-001" />
            </div>
            <div>
              <label className="label">Expected Date</label>
              <input className="input" type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={doStatus} onChange={e => setDoStatus(e.target.value as DOStatus)}>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="border-t border-surface-200 pt-4">
            <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-3">Line Items</div>
            <div className="space-y-2">
              {lines.map(line => (
                <div key={line._key} className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <label className="label">Material</label>
                    <input value={line.itemName} onChange={e => updateLine(line._key, { itemName: e.target.value })}
                      list={`dlib-${line._key}`} placeholder="Material name…" className="input text-xs py-1.5" />
                    <datalist id={`dlib-${line._key}`}>
                      {library.map(item => <option key={item.id} value={item.name} />)}
                    </datalist>
                  </div>
                  <div className="w-20">
                    <label className="label">Unit</label>
                    <Select options={DO_UNITS} value={line.itemUnit} onChange={e => updateLine(line._key, { itemUnit: e.target.value })} className="text-xs py-1.5" />
                  </div>
                  <div className="w-20">
                    <label className="label">Expected</label>
                    <input className="input text-xs py-1.5" type="number" min={0} step="any" value={line.qtyExpected} onChange={e => updateLine(line._key, { qtyExpected: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="w-20">
                    <label className="label">Delivered</label>
                    <input className="input text-xs py-1.5" type="number" min={0} step="any" value={line.qtyDelivered} onChange={e => updateLine(line._key, { qtyDelivered: parseFloat(e.target.value) || 0 })} />
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
              {loading ? 'Saving…' : editing ? 'Save' : 'Create DO'}
            </Button>
          </div>
        </div>
      </Modal>
      <ConfirmModal
        open={deleteId !== null}
        title="Delete delivery order?"
        message="This delivery order will be permanently deleted."
        onConfirm={() => { if (deleteId) remove(deleteId) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
