// src/components/logistics/DeliveriesTab.tsx
'use client'
import { useState, useMemo } from 'react'
import { Plus, Trash2, Truck, FileText, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import DataTable, { useTableSort, type Column } from '@/components/ui/DataTable'
import { format } from 'date-fns'

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

interface Props {
  dos:         any[]
  pos:         any[]
  library:     any[]
  onRefresh:   () => void
  onRefreshPos: () => void
}

export default function DeliveriesTab({ dos, pos, library, onRefresh, onRefreshPos }: Props) {
  const router = useRouter()
  const [filter,      setFilter]      = useState<DOStatus | 'all'>('all')
  const [deleteId,    setDeleteId]    = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [navigatingId, setNavigatingId] = useState<string | null>(null)

  // Create a new DO document and navigate to the doc builder
  async function handleNewDO() {
    setCreatingNew(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: 'delivery_order',
          title: 'Delivery Order',
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

  // Open an existing DO in the doc builder (create a linked document)
  async function openInBuilder(doItem: any) {
    setNavigatingId(doItem.id)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: 'delivery_order',
          title: `Delivery Order – ${doItem.ref || 'Untitled'}`,
          doId: doItem.id,
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

  const filtered = filter === 'all' ? dos : dos.filter(d => d.status === filter)

  const columns = useMemo<Column<any>[]>(() => [
    {
      key: 'ref',
      label: 'Reference',
      sortable: true,
      sortKey: (d) => (d.ref || `DO-${d.id.slice(0, 6)}`).toLowerCase(),
      render: (d) => {
        const r = d.ref || `DO-${d.id.slice(0, 6).toUpperCase()}`
        const s = STATUS_META[d.status as DOStatus] ?? STATUS_META.PENDING
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-ink">{r}</span>
            <span className="badge text-[10px] font-semibold px-2 py-0.5" style={{ background: s.bg, color: s.color }}>{s.label}</span>
          </div>
        )
      },
    },
    {
      key: 'po',
      label: 'PO / Supplier',
      sortable: true,
      sortKey: (d) => (d.po?.supplierName ?? d.po?.ref ?? '').toLowerCase(),
      render: (d) => {
        const parts: string[] = []
        if (d.po?.supplierName) parts.push(d.po.supplierName)
        if (d.po?.ref) parts.push(d.po.ref)
        return <span className="text-xs text-ink-muted">{parts.join(' · ') || '—'}</span>
      },
    },
    {
      key: 'items',
      label: 'Items',
      align: 'center' as const,
      sortable: true,
      sortKey: (d) => (d.lines ?? []).length,
      render: (d) => (
        <span className="text-xs text-ink-faint">{(d.lines ?? []).length}</span>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      sortKey: (d) => new Date(d.expectedDate ?? d.createdAt ?? 0).getTime(),
      render: (d) => (
        <div className="text-xs text-ink-faint">
          {d.expectedDate && <div>Exp {format(new Date(d.expectedDate), 'd MMM yyyy')}</div>}
          {d.deliveredDate && <div className="text-emerald-600">Del {format(new Date(d.deliveredDate), 'd MMM yyyy')}</div>}
          {!d.expectedDate && !d.deliveredDate && '—'}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 'w-32',
      render: (d) => {
        const isPending = ['PENDING', 'PARTIAL'].includes(d.status)
        const isNav = navigatingId === d.id
        return (
          <div className="flex gap-0.5 justify-end items-center" onClick={e => e.stopPropagation()}>
            {isPending && (
              <Button size="xs" variant="success" onClick={() => markDelivered(d)}
                icon={<Truck className="w-3 h-3" />}>Delivered</Button>
            )}
            <div className="flex gap-0.5 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => openInBuilder(d)}
                icon={isNav ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                title="Open in doc builder"
              />
              <Button size="xs" variant="danger-ghost" onClick={() => setDeleteId(d.id)} icon={<Trash2 className="w-3 h-3" />} />
            </div>
          </div>
        )
      },
    },
  ], [navigatingId])

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered, columns)

  const renderExpandedLines = (doItem: any) => (
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
          {(doItem.lines ?? []).map((l: any) => (
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
  )

  return (
    <div className="space-y-4">
      <DataTable
        items={sorted}
        getRowId={(d) => d.id}
        columns={columns}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        compact
        expandable={{
          canExpand: (d) => (d.lines ?? []).length > 0,
          render: renderExpandedLines,
        }}
        toolbar={
          <>
            <div className="flex gap-1">
              {STATUS_TABS.map(t => (
                <button key={t.id} onClick={() => setFilter(t.id)}
                  className={`filter-pill ${filter === t.id ? 'active !bg-primary !text-white !border-primary' : ''}`}>
                  {t.label}
                  {t.id !== 'all' && <span className="ml-1 opacity-60">{dos.filter(d => d.status === t.id).length}</span>}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <Button size="sm" onClick={handleNewDO} disabled={creatingNew} icon={creatingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}>New Delivery</Button>
          </>
        }
        emptyIcon="🚚"
        emptyTitle={dos.length === 0 ? 'No delivery orders yet' : 'No deliveries match this filter'}
        emptyMessage={dos.length === 0 ? 'Create your first delivery order to get started.' : 'Try adjusting the filter above.'}
      />

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
