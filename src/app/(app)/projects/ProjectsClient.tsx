// src/app/(app)/projects/ProjectsClient.tsx
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  FolderKanban, Plus, Search, Activity, CheckCircle2, Clock, DollarSign, MapPin,
} from 'lucide-react'
import DataTable, { useTableSort, type Column, type GroupDef } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import ProjectFormModal from '@/components/projects/ProjectFormModal'
import Link from 'next/link'

/* ── Status meta ── */
const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  PLANNING:  { label: 'Planning',  bg: '#f1f5f9', color: '#64748b' },
  ACTIVE:    { label: 'Active',    bg: '#f0fdf4', color: '#16a34a' },
  ON_HOLD:   { label: 'On Hold',   bg: '#fffbeb', color: '#d97706' },
  COMPLETED: { label: 'Completed', bg: '#eff6ff', color: '#2563eb' },
  CANCELLED: { label: 'Cancelled', bg: '#f9fafb', color: '#9ca3af' },
}

type Project = {
  id: string
  name: string
  clientName?: string | null
  status: string
  startDate?: string | null
  endDate?: string | null
  contractValue: number
  milestones: { activities: { status: string }[] }[]
  createdAt: string
}

interface Props {
  initialProjects: Project[]
  teams: any[]
}

export default function ProjectsClient({ initialProjects, teams }: Props) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const filtered = projects.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !(p.clientName ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  /* ── Stats ── */
  const totalProjects = projects.length
  const activeCount = projects.filter(p => p.status === 'ACTIVE').length
  const completedCount = projects.filter(p => p.status === 'COMPLETED').length
  const totalValue = projects.reduce((s, p) => s + (p.contractValue ?? 0), 0)

  const stats = [
    { label: 'Total Projects', value: totalProjects, icon: FolderKanban, well: 'bg-emerald-100 text-emerald-600', hero: true },
    { label: 'Active',         value: activeCount,    icon: Activity,     well: 'bg-blue-100 text-blue-600' },
    { label: 'Completed',      value: completedCount, icon: CheckCircle2, well: 'bg-amber-100 text-amber-600' },
    { label: 'Contract Value', value: totalValue,     icon: DollarSign,   well: 'bg-violet-100 text-violet-600', isCurrency: true },
  ]

  /* ── Progress helper ── */
  const getProgress = (p: Project) => {
    const activities = p.milestones.flatMap(m => m.activities)
    if (activities.length === 0) return 0
    const done = activities.filter(a => a.status === 'COMPLETED').length
    return Math.round((done / activities.length) * 100)
  }

  /* ── Columns ── */
  const columns: Column<Project>[] = [
    {
      key: 'name', label: 'Project', sortable: true,
      sortKey: (p) => p.name.toLowerCase(),
      render: (p) => (
        <div>
          <div className="font-semibold text-xs text-ink">{p.name}</div>
          {p.clientName && <div className="text-[10px] text-ink-faint mt-0.5">{p.clientName}</div>}
        </div>
      ),
    },
    {
      key: 'status', label: 'Status', sortable: true, width: 'w-28',
      sortKey: (p) => p.status,
      render: (p) => {
        const m = STATUS_META[p.status] ?? STATUS_META.PLANNING
        return (
          <span className="badge text-[10px]" style={{ background: m.bg, color: m.color }}>
            {m.label}
          </span>
        )
      },
    },
    {
      key: 'dates', label: 'Dates', sortable: true, width: 'w-36',
      sortKey: (p) => p.startDate ?? '',
      render: (p) => (
        <span className="text-[10px] text-ink-faint">
          {p.startDate ? format(new Date(p.startDate), 'd MMM yy') : '—'}
          {' → '}
          {p.endDate ? format(new Date(p.endDate), 'd MMM yy') : '—'}
        </span>
      ),
    },
    {
      key: 'progress', label: 'Progress', width: 'w-32', align: 'center',
      render: (p) => {
        const pct = getProgress(p)
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-ink-faint font-mono w-8 text-right">{pct}%</span>
          </div>
        )
      },
    },
    {
      key: 'value', label: 'Value', sortable: true, width: 'w-28', align: 'right',
      sortKey: (p) => p.contractValue,
      render: (p) => (
        <span className="text-xs text-ink font-mono">
          {p.contractValue ? `$${p.contractValue.toLocaleString()}` : '—'}
        </span>
      ),
    },
  ]

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered, columns)

  /* ── Groups ── */
  const groups: GroupDef<Project>[] = [
    { key: 'active',    label: 'Active',    color: '#16a34a', filter: (p) => p.status === 'ACTIVE' },
    { key: 'planning',  label: 'Planning',  color: '#64748b', filter: (p) => p.status === 'PLANNING' },
    { key: 'on_hold',   label: 'On Hold',   color: '#d97706', filter: (p) => p.status === 'ON_HOLD' },
    { key: 'completed', label: 'Completed', color: '#2563eb', filter: (p) => p.status === 'COMPLETED' },
    { key: 'cancelled', label: 'Cancelled', color: '#9ca3af', filter: (p) => p.status === 'CANCELLED' },
  ]

  const handleCreate = useCallback(async (data: any) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return
    const project = await res.json()
    setProjects(prev => [{ ...project, milestones: [] }, ...prev])
    setShowCreate(false)
  }, [])

  const filterStatuses = ['ACTIVE', 'PLANNING', 'ON_HOLD', 'COMPLETED'] as const

  return (
    <div className="min-h-full">
      <main className="px-4 py-4 md:px-6 md:py-5 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-semibold text-base text-ink">Projects</h1>
          <div className="flex items-center gap-2">
            <Link href="/projects/map">
              <Button variant="secondary" size="sm" icon={<MapPin className="w-3.5 h-3.5" />}>
                Map
              </Button>
            </Link>
            <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowCreate(true)}>
              New Project
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label}
                className={
                  (s as any).hero
                    ? 'card p-4 bg-primary border-transparent'
                    : 'card p-4'
                }>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    (s as any).hero ? 'bg-white/20 text-white' : s.well
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className={`text-[10px] font-medium tracking-wide uppercase ${
                    (s as any).hero ? 'text-white/70' : 'text-ink-faint'
                  }`}>
                    {s.label}
                  </span>
                </div>
                <div className={`text-xl font-bold ${(s as any).hero ? 'text-white' : 'text-ink'}`}>
                  {(s as any).isCurrency
                    ? `$${s.value.toLocaleString()}`
                    : s.value
                  }
                </div>
              </div>
            )
          })}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <button onClick={() => setStatusFilter(null)}
            className={`filter-pill ${!statusFilter ? 'active' : ''}`}>
            All
          </button>
          {filterStatuses.map(st => (
            <button key={st} onClick={() => setStatusFilter(statusFilter === st ? null : st)}
              className={`filter-pill ${statusFilter === st ? 'active' : ''}`}>
              {STATUS_META[st].label}
            </button>
          ))}
        </div>

        {/* DataTable */}
        <DataTable<Project>
          items={sorted}
          getRowId={(p) => p.id}
          columns={columns}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          groups={groups}
          onRowClick={(p) => router.push(`/projects/${p.id}`)}
          emptyIcon="📁"
          emptyTitle="No projects yet"
          emptyMessage="Create your first project or convert a won tender."
          toolbar={
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
              <input
                type="text"
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-8 w-48"
              />
            </div>
          }
        />
      </main>

      {showCreate && (
        <ProjectFormModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
