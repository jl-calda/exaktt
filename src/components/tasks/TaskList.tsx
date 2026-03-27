'use client'
import { format } from 'date-fns'
import { Clock, AlertTriangle, ChevronRight } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-surface-100 text-ink-muted',
  in_progress: 'bg-blue-100 text-blue-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-ink-faint',
  medium: 'text-ink-muted',
  high: 'text-amber-600',
  urgent: 'text-red-600',
}

interface Props {
  tasks: any[]
  onSelect: (id: string) => void
}

export default function TaskList({ tasks, onSelect }: Props) {
  if (tasks.length === 0) {
    return <div className="p-8 text-center text-sm text-ink-faint">No tasks yet.</div>
  }

  return (
    <div className="divide-y divide-surface-100">
      {tasks.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)}
          className="w-full text-left px-4 py-3 hover:bg-surface-50 transition-colors group">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? ''}`}>{t.status.replace('_', ' ')}</span>
                {(t.priority === 'high' || t.priority === 'urgent') && <AlertTriangle className={`w-3 h-3 ${PRIORITY_COLORS[t.priority]}`} />}
              </div>
              <div className="font-medium text-xs text-ink mt-1 truncate group-hover:text-primary">{t.title}</div>
              <div className="text-[10px] text-ink-faint mt-0.5">
                {t.assignee?.name ?? 'Unassigned'}
                {t.targetDate && <span className="ml-2"><Clock className="w-2.5 h-2.5 inline" /> {format(new Date(t.targetDate), 'dd MMM')}</span>}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-primary flex-shrink-0 mt-2" />
          </div>
        </button>
      ))}
    </div>
  )
}
