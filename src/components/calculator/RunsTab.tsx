'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { Trash2, ExternalLink, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type { MtoSystem } from '@/types'

interface Props {
  sys: MtoSystem
  jobs: any[]           // Enriched jobs with createdBy, notes
  onRefresh: () => void
}

export default function RunsTab({ sys, jobs, onRefresh }: Props) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = jobs.filter(j => {
    if (dateFrom && j.calculatedAt && new Date(j.calculatedAt) < new Date(dateFrom)) return false
    if (dateTo && j.calculatedAt && new Date(j.calculatedAt) > new Date(dateTo + 'T23:59:59')) return false
    return true
  })

  const handleDelete = async (id: string) => {
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    onRefresh()
    setDeleteId(null)
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <Input label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        <Input label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        {(dateFrom || dateTo) && (
          <Button size="sm" variant="ghost" onClick={() => { setDateFrom(''); setDateTo('') }}>Clear</Button>
        )}
        <span className="text-xs text-ink-faint ml-auto">{filtered.length} of {jobs.length} runs</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface-100 border-b border-surface-200 text-left">
              <th className="px-4 py-2.5 text-[10px] font-bold text-ink-faint uppercase">Name</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-ink-faint uppercase">Created by</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-ink-faint uppercase">Date</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-ink-faint uppercase">Notes</th>
              <th className="px-4 py-2.5 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {filtered.map((job, i) => (
              <tr key={job.id} className={i % 2 === 0 ? 'bg-white' : 'bg-surface-50'}>
                <td className="px-4 py-3">
                  <span className="font-medium text-ink">{job.name}</span>
                </td>
                <td className="px-4 py-3 text-ink-muted">{job.createdBy?.name ?? '—'}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {job.calculatedAt ? format(new Date(job.calculatedAt), 'dd MMM yyyy HH:mm') : job.createdAt ? format(new Date(job.createdAt), 'dd MMM yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-ink-faint text-xs max-w-xs truncate">{job.notes ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => setDeleteId(job.id)}
                      className="p-1.5 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-faint">
                {jobs.length === 0 ? 'No saved runs yet. Calculate and save from the Calculator tab.' : 'No runs match your date filter.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={deleteId !== null}
        title="Delete run?"
        message="This will permanently remove this saved calculation run."
        onConfirm={() => { if (deleteId) handleDelete(deleteId) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
