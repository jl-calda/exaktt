// src/app/(app)/dashboard/DashboardClient.tsx
'use client'
import { useRouter } from 'next/navigation'
import { Layers, ChevronRight, CalendarDays, Package, FileText, Users, FolderKanban, CheckSquare } from 'lucide-react'
import { getLimits } from '@/lib/limits'
import { formatDistanceToNow, format } from 'date-fns'
import type { Plan } from '@prisma/client'

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: '#f1f5f9', color: '#64748b' },
  SUBMITTED: { label: 'Submitted', bg: '#eff6ff', color: '#1d4ed8' },
  WON:       { label: 'Won',       bg: '#f0fdf4', color: '#16a34a' },
  LOST:      { label: 'Lost',      bg: '#fef2f2', color: '#dc2626' },
  CANCELLED: { label: 'Cancelled', bg: '#f9fafb', color: '#9ca3af' },
}

interface Props {
  plan:         Plan
  userName:     string | null
  systems:      any[]
  systemsCount: number
  tenders:      any[]
  tendersCount: number
  reportsCount: number
  clientsCount: number
}

export default function DashboardClient({
  plan, userName, systems, systemsCount, tenders, tendersCount, reportsCount, clientsCount,
}: Props) {
  const router  = useRouter()
  const limits  = getLimits(plan)
  const firstName = userName?.split(' ')[0] ?? 'there'
  const dateStr   = format(new Date(), 'EEE, d MMM yyyy')

  const stats = [
    {
      label: 'Products',
      value: systemsCount,
      icon:  Package,
      href:  '/products',
      sub:   plan === 'FREE' && limits.maxSystems !== -1
               ? `${systemsCount} / ${limits.maxSystems} used`
               : null,
    },
    { label: 'Tenders', value: tendersCount, icon: FileText, href: '/tenders', sub: null },
    { label: 'Reports', value: reportsCount, icon: FileText, href: '/products', sub: null },
    { label: 'Clients', value: clientsCount, icon: Users,    href: '/clients',  sub: null },
  ]

  return (
    <div className="min-h-full">
      <main className="px-4 py-4 md:px-6 md:py-5 max-w-6xl">

        {/* Greeting */}
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="font-semibold text-base text-ink">
            Good morning, {firstName}
          </h1>
          <span className="text-xs text-ink-faint" suppressHydrationWarning>{dateStr}</span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <button key={s.label} onClick={() => router.push(s.href)}
                className="card p-4 text-left hover:shadow-panel hover:-translate-y-0.5 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-ink-faint font-medium">{s.label}</span>
                  <Icon className="w-3.5 h-3.5 text-ink-faint group-hover:text-primary transition-colors" />
                </div>
                <div className="text-2xl font-bold text-ink">{s.value}</div>
                {s.sub && <div className="text-[11px] text-ink-faint mt-0.5">{s.sub}</div>}
              </button>
            )
          })}
        </div>

        {/* Two-column main sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* Recent Products */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
              <span className="text-xs font-semibold text-ink">Recent Products</span>
              <button onClick={() => router.push('/products')}
                className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {systems.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-ink-faint mb-2">No products yet</p>
                <button onClick={() => router.push('/products')}
                  className="text-xs text-primary hover:underline">Create one →</button>
              </div>
            ) : (
              <div className="divide-y divide-surface-200">
                {systems.map(sys => (
                  <button key={sys.id} onClick={() => router.push('/products/' + sys.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors group text-left">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: sys.color + '18', border: `1.5px solid ${sys.color}30` }}>
                      {sys.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-ink group-hover:text-primary transition-colors truncate">
                        {sys.name}
                      </div>
                      <div className="text-[11px] text-ink-faint flex items-center gap-1.5 mt-0.5">
                        <Layers className="w-3 h-3" />
                        {sys._count?.jobs ?? 0} jobs
                        <span>·</span>
                        <span suppressHydrationWarning>{formatDistanceToNow(new Date(sys.updatedAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-primary transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Tenders */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
              <span className="text-xs font-semibold text-ink">Active Tenders</span>
              <button onClick={() => router.push('/tenders')}
                className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {tenders.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-ink-faint mb-2">No active tenders</p>
                <button onClick={() => router.push('/tenders')}
                  className="text-xs text-primary hover:underline">Create one →</button>
              </div>
            ) : (
              <div className="divide-y divide-surface-200">
                {tenders.map(t => {
                  const meta        = STATUS_META[t.status] ?? STATUS_META.DRAFT
                  const displayName = t.client?.name ?? t.clientName
                  return (
                    <button key={t.id} onClick={() => router.push('/tenders/' + t.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors group text-left">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-ink group-hover:text-primary transition-colors truncate">
                            {t.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: meta.bg, color: meta.color }}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-faint flex items-center gap-2">
                          {displayName && <span>{displayName}</span>}
                          {t.submissionDate && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              <span suppressHydrationWarning>{format(new Date(t.submissionDate), 'dd MMM yyyy')}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-primary transition-colors flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coming soon: Projects + My Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <div className="card p-5 opacity-60 border-dashed">
            <div className="flex items-center gap-2 mb-2">
              <FolderKanban className="w-4 h-4 text-ink-faint" />
              <span className="text-xs font-semibold text-ink">Projects</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-100 text-ink-faint">
                Coming soon
              </span>
            </div>
            <p className="text-xs text-ink-faint leading-relaxed">
              Awarded tenders will become Projects. A PM can break them into tasks and assign work to team members.
            </p>
          </div>

          <div className="card p-5 opacity-60 border-dashed">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare className="w-4 h-4 text-ink-faint" />
              <span className="text-xs font-semibold text-ink">My Tasks</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-100 text-ink-faint">
                Coming soon
              </span>
            </div>
            <p className="text-xs text-ink-faint leading-relaxed">
              Tasks assigned to you across all active projects will appear here, with notifications when new work is assigned.
            </p>
          </div>

        </div>
      </main>
    </div>
  )
}
