// src/components/logistics/PurchaseOrdersTab.tsx
'use client'
import { useState, useMemo } from 'react'
import { Plus, Edit3, Trash2, FileText, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import DataTable, { useTableSort, type Column } from '@/components/ui/DataTable'
import { format } from 'date-fns'

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

interface Props {
  pos:       any[]
  suppliers: any[]
  library:   any[]
  onRefresh: () => void
}

export default function PurchaseOrdersTab({ pos, suppliers, library, onRefresh }: Props) {
  const router = useRouter()
  const [filter,      setFilter]      = useState<POStatus | 'all'>('all')
  const [deleteId,    setDeleteId]    = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [navigatingId, setNavigatingId] = useState<string | null>(null)

  // Create a new PO document and navigate to the doc builder
  async function handleNewPO() {
    setCreatingNew(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: 'purchase_order',
          title: 'Purchase Order',
          blocks: [],
        }),
      })
      const json = await res.json()
      if (json.data?.id) {
        router.push(`/logistics/documents/${json.data.id}`)
      }
    } catch (err) {
      console.error('Failed to create document:', err)
    } finally {
      setCreatingNew(false)
    }
  }

  // Open an existing PO in the doc builder (create a linked document if needed)
  async function openInBuilder(po: any) {
    setNavigatingId(po.id)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: 'purchase_order',
          title: `Purchase Order – ${po.ref || po.supplierName || 'Untitled'}`,
          poId: po.id,
          blocks: [],
        }),
      })
      const json = await res.json()
      if (json.data?.id) {
        router.push(`/logistics/documents/${json.data.id}`)
      }
    } catch (err) {
      console.error('Failed to create document:', err)
    } finally {
      setNavigatingId(null)
    }
  }

  const remove = async (id: string) => {
    await fetch('/api/logistics/po', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setDeleteId(null)
    onRefresh()
  }

  const totalValue = (po: any) => {
    const t = (po.lines ?? []).reduce((s: number, l: any) => s + (l.qtyOrdered * (l.unitPrice ?? 0)), 0)
    return t > 0 ? t.toFixed(2) : null
  }

  const filtered = filter === 'all' ? pos : pos.filter(p => p.status === filter)

  const columns = useMemo<Column<any>[]>(() => [
    {
      key: 'ref',
      label: 'Reference',
      sortable: true,
      sortKey: (po) => (po.ref || `PO-${po.id.slice(0, 6)}`).toLowerCase(),
      render: (po) => {
        const r = po.ref || `PO-${po.id.slice(0, 6).toUpperCase()}`
        const s = STATUS_META[po.status as POStatus] ?? STATUS_META.DRAFT
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-ink">{r}</span>
            <span className="badge text-[10px] font-semibold px-2 py-0.5" style={{ background: s.bg, color: s.color }}>{s.label}</span>
          </div>
        )
      },
    },
    {
      key: 'supplier',
      label: 'Supplier',
      sortable: true,
      sortKey: (po) => (po.supplierName ?? po.supplier?.name ?? '').toLowerCase(),
      render: (po) => (
        <span className="text-xs text-ink-muted">{po.supplierName ?? po.supplier?.name ?? 'No supplier'}</span>
      ),
    },
    {
      key: 'lines',
      label: 'Lines',
      align: 'center' as const,
      sortable: true,
      sortKey: (po) => (po.lines ?? []).length,
      render: (po) => (
        <span className="text-xs text-ink-faint">{(po.lines ?? []).length}</span>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      sortKey: (po) => new Date(po.orderDate).getTime(),
      render: (po) => (
        <div className="text-xs text-ink-faint">
          {format(new Date(po.orderDate), 'd MMM yyyy')}
          {po.expectedDate && (
            <div className="text-[10px] text-ink-faint">Exp {format(new Date(po.expectedDate), 'd MMM')}</div>
          )}
        </div>
      ),
    },
    {
      key: 'value',
      label: 'Value',
      align: 'right' as const,
      sortable: true,
      sortKey: (po) => {
        const t = (po.lines ?? []).reduce((s: number, l: any) => s + (l.qtyOrdered * (l.unitPrice ?? 0)), 0)
        return t
      },
      render: (po) => {
        const val = totalValue(po)
        return val ? <span className="text-xs text-ink font-medium">${val}</span> : <span className="text-xs text-ink-faint">—</span>
      },
    },
    {
      key: 'actions',
      label: '',
      width: 'w-20',
      render: (po) => {
        const isNav = navigatingId === po.id
        return (
          <div className="flex gap-0.5 justify-end sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => openInBuilder(po)}
              icon={isNav ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
              title="Open in doc builder"
            />
            <Button size="xs" variant="danger-ghost" onClick={() => setDeleteId(po.id)} icon={<Trash2 className="w-3 h-3" />} />
          </div>
        )
      },
    },
  ], [navigatingId])

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered, columns)

  const renderExpandedLines = (po: any) => (
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
          {(po.lines ?? []).map((l: any) => (
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
  )

  return (
    <div className="space-y-4">
      <DataTable
        items={sorted}
        getRowId={(po) => po.id}
        columns={columns}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        compact
        expandable={{
          canExpand: (po) => (po.lines ?? []).length > 0,
          render: renderExpandedLines,
        }}
        toolbar={
          <>
            <div className="flex gap-1">
              {STATUS_TABS.map(t => (
                <button key={t.id} onClick={() => setFilter(t.id)}
                  className={`filter-pill ${filter === t.id ? 'active !bg-primary !text-white !border-primary' : ''}`}>
                  {t.label}
                  {t.id !== 'all' && <span className="ml-1 opacity-60">{pos.filter(p => p.status === t.id).length}</span>}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <Button size="sm" onClick={handleNewPO} disabled={creatingNew} icon={creatingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}>New PO</Button>
          </>
        }
        emptyIcon="📦"
        emptyTitle={pos.length === 0 ? 'No purchase orders yet' : 'No orders match this filter'}
        emptyMessage={pos.length === 0 ? 'Create your first purchase order to get started.' : 'Try adjusting the filter above.'}
      />

      <ConfirmModal
        open={deleteId !== null}
        title="Delete purchase order?"
        message={`PO "${pos.find(p => p.id === deleteId)?.ref || deleteId?.slice(0, 6) || ''}" will be permanently deleted.`}
        onConfirm={() => { if (deleteId) remove(deleteId) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
