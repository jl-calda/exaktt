// src/app/(app)/tasks/TasksClient.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  Plus, Clock, AlertTriangle, ChevronRight, ChevronDown,
  ClipboardList, CheckCircle2, Send, Loader2, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import TaskForm from '@/components/tasks/TaskForm'

/* ── Status / Priority config ── */
const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  open:        { label: 'To Do',       color: '#64748b', bg: 'bg-surface-100 text-ink-muted',    icon: ClipboardList },
  in_progress: { label: 'In Progress', color: '#2563eb', bg: 'bg-blue-100 text-blue-700',        icon: Loader2 },
  submitted:   { label: 'Submitted',   color: '#d97706', bg: 'bg-amber-100 text-amber-700',      icon: Send },
  approved:    { label: 'Done',        color: '#16a34a', bg: 'bg-emerald-100 text-emerald-700',   icon: CheckCircle2 },
  rejected:    { label: 'Rejected',    color: '#dc2626', bg: 'bg-red-100 text-red-700',           icon: XCircle },
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-ink-faint', medium: 'text-ink-muted', high: 'text-amber-600', urgent: 'text-red-600',
}

const STATUS_ORDER = ['open', 'in_progress', 'submitted', 'rejected', 'approved']

type Tab = 'assigned' | 'created' | 'all'

interface Props { userId: string }

export default function TasksClient({ userId }: Props) {
  const router = useRouter()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('assigned')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['approved']))

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (tab === 'assigned') params.set('assigneeId', userId)
    else if (tab === 'created') params.set('createdById', userId)
    const res = await fetch(`/api/tasks?${params}`)
    const json = await res.json()
    if (json.data) setTasks(json.data)
    setLoading(false)
  }, [tab, userId])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const filtered = statusFilter
    ? tasks.filter(t => t.status === statusFilter)
    : tasks

  const grouped = STATUS_ORDER.map(status => ({
    status,
    meta: STATUS_META[status],
    tasks: filtered.filter(t => t.status === status),
  })).filter(g => g.tasks.length > 0)

  const toggleCollapse = (status: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(status) ? next.delete(status) : next.add(status)
      return next
    })
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'assigned', label: 'Assigned to Me' },
    { key: 'created', label: 'Created by Me' },
    { key: 'all', label: 'All' },
  ]

  return (
    <main className="flex flex-col flex-1 px-4 py-4 md:px-6 md:py-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-semibold text-base text-ink">Tasks</h1>
        <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setShowCreate(true)}>
          New Task
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-3">
        {tabs.map(t => (
          <button key={t.key}
            className={`tab-pill ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 mb-4">
        <button
          className={`filter-pill ${!statusFilter ? 'active' : ''}`}
          onClick={() => setStatusFilter(null)}>
          All
        </button>
        {STATUS_ORDER.map(s => (
          <button key={s}
            className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === s ? null : s)}>
            {STATUS_META[s].label}
          </button>
        ))}
      </div>

      {/* Task groups */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-ink-faint" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-2xl mb-2">📋</div>
          <div className="text-[13px] font-semibold text-ink mb-1">No tasks</div>
          <div className="text-xs text-ink-faint mb-4">
            {tab === 'assigned' ? 'No tasks assigned to you.' : tab === 'created' ? 'You haven\'t created any tasks.' : 'No tasks found.'}
          </div>
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowCreate(true)}>
            Create Task
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(group => {
            const isCollapsed = collapsed.has(group.status)
            const Icon = group.meta.icon
            return (
              <div key={group.status} className="card overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => toggleCollapse(group.status)}
                  className="group-header w-full flex items-center gap-2 px-4 py-2.5 text-left"
                  style={{ borderLeftColor: group.meta.color }}
                >
                  {isCollapsed
                    ? <ChevronRight className="w-3.5 h-3.5 text-ink-faint" />
                    : <ChevronDown className="w-3.5 h-3.5 text-ink-faint" />
                  }
                  <Icon className="w-3.5 h-3.5" style={{ color: group.meta.color }} />
                  <span className="text-xs font-semibold text-ink">{group.meta.label}</span>
                  <span className="text-[10px] text-ink-faint font-mono">{group.tasks.length}</span>
                </button>

                {/* Task rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-surface-100">
                    {group.tasks.map(t => (
                      <button key={t.id}
                        onClick={() => router.push(`/tasks/${t.id}`)}
                        className="w-full text-left px-4 py-2.5 hover:bg-surface-50 transition-colors group/row flex items-center gap-3">
                        {/* Priority indicator */}
                        {(t.priority === 'high' || t.priority === 'urgent') && (
                          <AlertTriangle className={`w-3 h-3 shrink-0 ${PRIORITY_COLORS[t.priority]}`} />
                        )}

                        {/* Title + meta */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-ink truncate group-hover/row:text-primary transition-colors">
                            {t.title}
                          </div>
                          <div className="text-[10px] text-ink-faint mt-0.5 flex items-center gap-2">
                            <span>{tab === 'created' ? `To: ${t.assignee?.name ?? 'Unassigned'}` : `From: ${t.createdBy?.name ?? 'Unknown'}`}</span>
                            {t.checklist?.length > 0 && (
                              <span className="flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                {t.checklist.filter((c: any) => c.checked).length}/{t.checklist.length}
                              </span>
                            )}
                            {t.linkedLabel && (
                              <span className="text-primary">{t.linkedLabel}</span>
                            )}
                          </div>
                        </div>

                        {/* Due date */}
                        {t.targetDate && (
                          <span className="text-[10px] text-ink-faint flex items-center gap-1 shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            {format(new Date(t.targetDate), 'dd MMM')}
                          </span>
                        )}

                        <ChevronRight className="w-3.5 h-3.5 text-ink-faint group-hover/row:text-primary shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-surface-50 rounded-2xl shadow-float w-full max-w-md mx-4 animate-scale-in max-h-[80vh] overflow-y-auto">
            <TaskForm
              onSave={() => { setShowCreate(false); fetchTasks() }}
              onCancel={() => setShowCreate(false)}
            />
          </div>
        </div>
      )}
    </main>
  )
}
