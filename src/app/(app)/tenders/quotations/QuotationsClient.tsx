// src/app/(app)/tenders/quotations/QuotationsClient.tsx
'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import DataTable, { useTableSort, type Column, type GroupDef } from '@/components/ui/DataTable'

const Q_COLUMNS: Column<any>[] = [
  { key: 'tender',    label: 'Tender',      sortable: true, sortKey: r => r.tender?.name ?? '', render: r => <span className="text-xs text-ink font-medium">{r.tender?.name ?? '—'}</span> },
  { key: 'reference', label: 'Reference',   sortable: true, sortKey: r => r.reference ?? '', render: r => <span className="text-xs text-ink-muted font-mono">{r.reference ?? '—'}</span> },
  { key: 'client',    label: 'Client',      sortable: true, sortKey: r => r.clientName ?? '', render: r => <span className="text-xs text-ink">{r.clientName ?? '—'}</span> },
  { key: 'status',    label: 'Status',      sortable: true, sortKey: r => r.status ?? '', render: r => {
    const cls = r.status === 'submitted' ? 'bg-blue-100 text-blue-700' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
    return <span className={`badge text-[10px] font-bold ${cls}`}>{r.status}</span>
  }},
  { key: 'date',      label: 'Date',        sortable: true, sortKey: r => r.date ? new Date(r.date).getTime() : 0, render: r => <span className="text-xs text-ink-muted">{r.date ? format(new Date(r.date), 'dd MMM yyyy') : '—'}</span> },
  { key: 'validUntil', label: 'Valid Until', sortable: true, sortKey: r => r.validUntil ? new Date(r.validUntil).getTime() : 0, render: r => <span className="text-xs text-ink-muted">{r.validUntil ? format(new Date(r.validUntil), 'dd MMM yyyy') : '—'}</span> },
  { key: 'arrow',     label: '',            width: 'w-10', render: () => <ChevronRight className="w-3.5 h-3.5 text-ink-faint" /> },
]

const GROUP_OPTIONS = [
  { value: 'none',   label: 'No grouping' },
  { value: 'client', label: 'Client' },
  { value: 'tender', label: 'Tender' },
  { value: 'status', label: 'Status' },
] as const

interface Props {
  initialReports: any[]
}

export default function QuotationsClient({ initialReports }: Props) {
  const router = useRouter()
  const [allReports] = useState(initialReports)
  const [qFilter, setQFilter] = useState<string | null>(null)
  const [qGroupBy, setQGroupBy] = useState<'none' | 'client' | 'tender' | 'status'>('none')

  const filtered = useMemo(() => allReports.filter(r => !qFilter || r.status === qFilter), [allReports, qFilter])
  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered, Q_COLUMNS)

  const groups = useMemo<GroupDef<any>[] | undefined>(() => {
    if (qGroupBy === 'none') return undefined
    const keys = new Set<string>()
    for (const r of filtered) {
      if (qGroupBy === 'client') keys.add(r.clientName ?? 'No client')
      else if (qGroupBy === 'tender') keys.add(r.tender?.name ?? 'No tender')
      else if (qGroupBy === 'status') keys.add(r.status ?? 'unknown')
    }
    return [...keys].sort().map(k => ({
      key: k,
      label: qGroupBy === 'status' ? k.charAt(0).toUpperCase() + k.slice(1) : k,
      filter: (r: any) => {
        if (qGroupBy === 'client') return (r.clientName ?? 'No client') === k
        if (qGroupBy === 'tender') return (r.tender?.name ?? 'No tender') === k
        return (r.status ?? 'unknown') === k
      },
    }))
  }, [filtered, qGroupBy])

  const toolbar = (
    <div className="flex items-center gap-3 flex-wrap w-full">
      <div className="flex gap-1.5 flex-wrap flex-1">
        <button onClick={() => setQFilter(null)}
          className={`filter-pill ${qFilter === null ? 'active' : ''}`}>
          All ({allReports.length})
        </button>
        {['draft', 'submitted', 'approved', 'rejected'].map(s => {
          const count = allReports.filter(r => r.status === s).length
          if (count === 0) return null
          return (
            <button key={s} onClick={() => setQFilter(f => f === s ? null : s)}
              className={`filter-pill ${qFilter === s ? 'active' : ''}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
            </button>
          )
        })}
      </div>
      <select
        value={qGroupBy}
        onChange={e => setQGroupBy(e.target.value as any)}
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
        columns={Q_COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        groups={groups}
        onRowClick={r => router.push(`/tenders/${r.tender?.id}/report/${r.id}`)}
        toolbar={toolbar}
        emptyIcon="📋"
        emptyMessage={qFilter ? `No ${qFilter} quotations` : 'No quotation reports yet. Generate one from a tender detail page.'}
      />
    </div>
  )
}
