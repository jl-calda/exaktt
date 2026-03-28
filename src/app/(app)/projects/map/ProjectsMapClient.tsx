// src/app/(app)/projects/map/ProjectsMapClient.tsx
'use client'
import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { format } from 'date-fns'
import { MapPin, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import ProjectsSidebar from '@/components/projects/ProjectsSidebar'

/* Lazy-load map to avoid SSR issues with Leaflet */
const MapView = dynamic(() => import('@/components/projects/MapView'), { ssr: false })

const STATUS_META: Record<string, { label: string; color: string }> = {
  PLANNING:  { label: 'Planning',  color: '#64748b' },
  ACTIVE:    { label: 'Active',    color: '#16a34a' },
  ON_HOLD:   { label: 'On Hold',   color: '#d97706' },
  COMPLETED: { label: 'Completed', color: '#2563eb' },
  CANCELLED: { label: 'Cancelled', color: '#9ca3af' },
}

type Project = {
  id: string
  name: string
  clientName?: string | null
  address?: string | null
  status: string
  latitude?: number | null
  longitude?: number | null
  startDate?: string | null
  endDate?: string | null
  contractValue: number
  milestones: { activities: { status: string }[] }[]
}

interface Props {
  projects: Project[]
}

export default function ProjectsMapClient({ projects }: Props) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const geoProjects = useMemo(
    () => projects.filter(p => p.latitude != null && p.longitude != null),
    [projects],
  )

  const filtered = useMemo(
    () => statusFilter ? geoProjects.filter(p => p.status === statusFilter) : geoProjects,
    [geoProjects, statusFilter],
  )

  const selectedProject = useMemo(
    () => projects.find(p => p.id === selected),
    [projects, selected],
  )

  const noGeoCount = projects.length - geoProjects.length

  return (
    <div className="flex flex-col md:flex-row" style={{ minHeight: '100%' }}>
      <ProjectsSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 md:px-6 flex items-center justify-between border-b border-surface-200 bg-surface-50">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-sm text-ink">Project Map</h1>
          <span className="text-[10px] text-ink-faint">
            {filtered.length} project{filtered.length !== 1 ? 's' : ''} on map
            {noGeoCount > 0 && ` · ${noGeoCount} without location`}
          </span>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-ink-faint" />
          <button
            onClick={() => setStatusFilter(null)}
            className={`filter-pill ${!statusFilter ? 'active' : ''}`}
          >
            All
          </button>
          {['ACTIVE', 'PLANNING', 'ON_HOLD', 'COMPLETED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(statusFilter === st ? null : st)}
              className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
            >
              {STATUS_META[st].label}
            </button>
          ))}
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="flex-1 flex relative" style={{ minHeight: 'calc(100vh - 108px)' }}>
        {/* Map */}
        <div className="flex-1">
          {filtered.length > 0 ? (
            <MapView
              projects={filtered}
              selectedId={selected}
              onSelect={setSelected}
            />
          ) : (
            <div className="flex-1 h-full flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-10 h-10 text-ink-faint mx-auto mb-3" />
                <h3 className="text-[13px] font-medium text-ink mb-1">No projects with locations</h3>
                <p className="text-[11px] text-ink-faint">
                  Add latitude and longitude to your projects to see them on the map.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Selected project sidebar */}
        {selectedProject && (
          <div className="w-72 border-l border-surface-200 bg-surface-50 p-4 overflow-y-auto animate-slide-in-right">
            <div className="flex items-start justify-between mb-3">
              <h2 className="font-semibold text-sm text-ink">{selectedProject.name}</h2>
              <button onClick={() => setSelected(null)} className="text-ink-faint hover:text-ink text-xs">
                &times;
              </button>
            </div>

            {selectedProject.clientName && (
              <p className="text-[11px] text-ink-faint mb-3">{selectedProject.clientName}</p>
            )}

            <div className="space-y-3">
              {/* Status */}
              <div>
                <span className="label mb-1">Status</span>
                <span
                  className="badge text-[10px]"
                  style={{
                    background: STATUS_META[selectedProject.status]?.color + '18',
                    color: STATUS_META[selectedProject.status]?.color,
                  }}
                >
                  {STATUS_META[selectedProject.status]?.label}
                </span>
              </div>

              {/* Address */}
              {selectedProject.address && (
                <div>
                  <span className="label mb-1">Address</span>
                  <p className="text-xs text-ink">{selectedProject.address}</p>
                </div>
              )}

              {/* Dates */}
              <div>
                <span className="label mb-1">Timeline</span>
                <p className="text-xs text-ink">
                  {selectedProject.startDate
                    ? format(new Date(selectedProject.startDate), 'd MMM yyyy')
                    : '—'}
                  {' → '}
                  {selectedProject.endDate
                    ? format(new Date(selectedProject.endDate), 'd MMM yyyy')
                    : '—'}
                </p>
              </div>

              {/* Value */}
              {selectedProject.contractValue > 0 && (
                <div>
                  <span className="label mb-1">Contract Value</span>
                  <p className="text-xs text-ink font-mono">
                    ${selectedProject.contractValue.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Progress */}
              {(() => {
                const activities = selectedProject.milestones.flatMap(m => m.activities)
                if (activities.length === 0) return null
                const done = activities.filter(a => a.status === 'COMPLETED').length
                const pct = Math.round((done / activities.length) * 100)
                return (
                  <div>
                    <span className="label mb-1">Progress</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-ink-faint font-mono">{pct}%</span>
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="mt-4 pt-3 border-t border-surface-200">
              <Link href={`/projects/${selectedProject.id}`}>
                <Button variant="primary" size="sm" className="w-full">
                  Open Project
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
