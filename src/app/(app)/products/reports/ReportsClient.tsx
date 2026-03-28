// src/app/(app)/products/reports/ReportsClient.tsx
'use client'
import { useState } from 'react'
import { FileText } from 'lucide-react'
import { format } from 'date-fns'
import DataTable, { useTableSort, type Column } from '@/components/ui/DataTable'

interface Props {
  initialReports: any[]
}

const columns: Column<any>[] = [
  {
    key: 'title',
    label: 'Report',
    sortable: true,
    sortKey: (r) => (r.title ?? '').toLowerCase(),
    render: (r) => (
      <div>
        <div className="font-medium text-ink text-xs">{r.title}</div>
        {r.jobRef && <div className="text-[11px] text-ink-faint">{r.jobRef}</div>}
      </div>
    ),
  },
  {
    key: 'product',
    label: 'Product',
    sortable: true,
    sortKey: (r) => (r.mtoSystem?.name ?? '').toLowerCase(),
    render: (r) => (
      <span className="text-xs text-ink-muted">
        {r.mtoSystem?.icon} {r.mtoSystem?.name}
      </span>
    ),
  },
  {
    key: 'date',
    label: 'Date',
    sortable: true,
    sortKey: (r) => new Date(r.reportDate).getTime(),
    render: (r) => (
      <span className="text-xs text-ink-muted" suppressHydrationWarning>
        {format(new Date(r.reportDate), 'dd MMM yyyy')}
      </span>
    ),
  },
  {
    key: 'actions',
    label: '',
    width: 'w-16',
    render: (r) => (
      <a href={`/api/mto/reports/${r.id}/pdf`} target="_blank"
        className="btn-ghost text-xs py-1 px-2 flex items-center gap-1">
        <FileText className="w-3 h-3" /> PDF
      </a>
    ),
  },
]

export default function ReportsClient({ initialReports }: Props) {
  const [reports] = useState(initialReports)
  const { sorted, sortKey, sortDir, onSort } = useTableSort(reports, columns)

  return (
    <div className="min-h-full px-4 py-4 md:px-6 md:py-5 space-y-4">
      <DataTable
        items={sorted}
        getRowId={(r) => r.id}
        columns={columns}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        emptyIcon="📄"
        emptyTitle="No reports yet"
        emptyMessage="Open a product, run a calculation, then click Generate Report to create your first PDF take-off."
      />
    </div>
  )
}
