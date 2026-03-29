// src/app/(app)/tenders/all/AllTendersClient.tsx
'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import DataTable, { useTableSort, type Column, type GroupDef } from '@/components/ui/DataTable'

type TenderStatus = 'DRAFT' | 'SUBMITTED' | 'WON' | 'LOST' | 'CANCELLED'

const STATUS_STYLES: Record<TenderStatus, string> = {
  DRAFT:     'bg-surface-100 text-ink-muted',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  WON:       'bg-emerald-100 text-emerald-700',
  LOST:      'bg-red-100 text-red-700',
  CANCELLED: 'bg-surface-100 text-ink-faint',
}

const COLUMNS: Column<any>[] = [
  {
    key: 'name',
    label: 'Tender Name',
    sortable: true,
    sortKey: r => r.name ?? '',
    render: r => <span className="text-xs text-ink font-medium">{r.name}</span>,
  },
  {
    key: 'reference',
    label: 'Reference',
    sortable: true,
    sortKey: r => r.reference ?? '',
    render: r => <span className="text-xs text-ink-muted font-mono">{r.reference ?? '—'}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    sortKey: r => r.status ?? '',
    render: r => {
      const cls = STATUS_STYLES[r.status as TenderStatus] ?? STATUS_STYLES.DRAFT
      return <span className={`badge text-[10px] font-bold ${cls}`}>{r.status}</span>
    },
  },
  {
    key: 'items',
    label: 'Estimates',
    sortable: true,
    sortKey: r => r._count?.items ?? 0,
    render: r => <span className="text-xs text-ink-muted">{r._count?.items ?? 0}</span>,
  },
  {
    key: 'reports',
    label: 'Quotations',
    sortable: true,
    sortKey: r => r._count?.reports ?? 0,
    render: r => <span className="text-xs text-ink-muted">{r._count?.reports ?? 0}</span>,
  },
  {
    key: 'submissionDate',
    label: 'Deadline',
    sortable: true,
    sortKey: r => r.submissionDate ? new Date(r.submissionDate).getTime() : 0,
    render: r => <span className="text-xs text-ink-muted">{r.submissionDate ? format(new Date(r.submissionDate), 'dd MMM yyyy') : '—'}</span>,
  },
  {
    key: 'createdAt',
    label: 'Created',
    sortable: true,
    sortKey: r => r.createdAt ? new Date(r.createdAt).getTime() : 0,
    render: r => <span className="text-xs text-ink-muted">{r.createdAt ? format(new Date(r.createdAt), 'dd MMM yyyy') : '—'}</span>,
  },
  {
    key: 'arrow',
    label: '',
    width: 'w-10',
    render: () => <ChevronRight className="w-3.5 h-3.5 text-ink-faint" />,
  },
]

const GROUP_OPTIONS = [
  { value: 'none',   label: 'No grouping' },
  { value: 'status', label: 'Status' },
] as const

interface Props {
  initialTenders: any[]
}

export default function AllTendersClient({ initialTenders }: Props) {
  const router = useRouter()
  const [tenders] = useState(initialTenders)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [groupBy, setGroupBy] = useState<'none' | 'status'>('none')

  const filtered = useMemo(() => {
    let items = tenders
    if (statusFilter) items = items.filter(t => t.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(t =>
        (t.name ?? '').toLowerCase().includes(q) ||
        (t.reference ?? '').toLowerCase().includes(q)
      )
    }
    return items
  }, [tenders, statusFilter, search])

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered, COLUMNS)

  const groups = useMemo<GroupDef<any>[] | undefined>(() => {
    if (groupBy === 'none') return undefined
    const order: TenderStatus[] = ['DRAFT', 'SUBMITTED', 'WON', 'LOST', 'CANCELLED']
    const present = new Set(filtered.map(t => t.status as TenderStatus))
    return order.filter(s => present.has(s)).map(s => ({
      key: s,
      label: s.charAt(0) + s.slice(1).toLowerCase(),
      filter: (t: any) => t.status === s,
    }))
  }, [filtered, groupBy])

  const toolbar = (
    <div className="flex items-center gap-3 flex-wrap w-full">
      <div className="flex gap-1.5 flex-wrap flex-1">
        <button onClick={() => setStatusFilter(null)}
          className={`filter-pill ${statusFilter === null ? 'active' : ''}`}>
          All ({tenders.length})
        </button>
        {(['DRAFT', 'SUBMITTED', 'WON', 'LOST', 'CANCELLED'] as TenderStatus[]).map(s => {
          const count = tenders.filter(t => t.status === s).length
          if (count === 0) return null
          return (
            <button key={s} onClick={() => setStatusFilter(f => f === s ? null : s)}
              className={`filter-pill ${statusFilter === s ? 'active' : ''}`}>
              {s.charAt(0) + s.slice(1).toLowerCase()} ({count})
            </button>
          )
        })}
      </div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search tenders..."
        className="input text-xs py-1.5 w-44"
      />
      <select
        value={groupBy}
        onChange={e => setGroupBy(e.target.value as any)}
        className="input text-xs py-1.5 w-32"
      >
        {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  return (
    <div className="min-h-full px-4 py-4 md:px-6 md:py-5">
      <DataTable
        items={sorted}
        getRowId={r => r.id}
        columns={COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        groups={groups}
        onRowClick={r => router.push(`/tenders/${r.id}`)}
        toolbar={toolbar}
        emptyIcon="📋"
        emptyTitle="No tenders"
        emptyMessage={statusFilter || search ? 'No tenders match your filters.' : 'Create your first tender from the Overview page.'}
      />
    </div>
  )
}
