// src/components/logistics/OverviewTab.tsx
'use client'
import { Package, Truck, ShoppingCart, ClipboardList, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

type Tab = 'overview' | 'materials' | 'suppliers' | 'orders' | 'deliveries'

const PO_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: '#f1f5f9', color: '#64748b' },
  SENT:      { label: 'Sent',      bg: '#eff6ff', color: '#1d4ed8' },
  PARTIAL:   { label: 'Partial',   bg: '#fffbeb', color: '#d97706' },
  RECEIVED:  { label: 'Received',  bg: '#f0fdf4', color: '#16a34a' },
  CANCELLED: { label: 'Cancelled', bg: '#f9fafb', color: '#9ca3af' },
}

const DO_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Pending',   bg: '#fffbeb', color: '#d97706' },
  PARTIAL:   { label: 'Partial',   bg: '#eff6ff', color: '#1d4ed8' },
  DELIVERED: { label: 'Delivered', bg: '#f0fdf4', color: '#16a34a' },
  CANCELLED: { label: 'Cancelled', bg: '#f9fafb', color: '#9ca3af' },
}

interface Props {
  library:    any[]
  suppliers:  any[]
  pos:        any[]
  dos:        any[]
  onNavigate: (tab: Tab) => void
}

export default function OverviewTab({ library, suppliers, pos, dos, onNavigate }: Props) {
  const openPOs       = pos.filter(p => ['DRAFT', 'SENT'].includes(p.status))
  const pendingDOs    = dos.filter(d => ['PENDING', 'PARTIAL'].includes(d.status))
  const recentPOs     = [...pos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
  const upcomingDOs   = [...dos]
    .filter(d => d.expectedDate && d.status !== 'DELIVERED' && d.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime())
    .slice(0, 5)

  const stats = [
    { label: 'Materials',          value: library.length,       icon: Package,       tab: 'materials'  as Tab },
    { label: 'Suppliers',          value: suppliers.length,      icon: ClipboardList, tab: 'suppliers'  as Tab },
    { label: 'Open Orders',        value: openPOs.length,        icon: ShoppingCart,  tab: 'orders'     as Tab },
    { label: 'Pending Deliveries', value: pendingDOs.length,     icon: Truck,         tab: 'deliveries' as Tab },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <button key={s.label} onClick={() => onNavigate(s.tab)}
              className="card p-4 text-left hover:shadow-panel hover:-translate-y-0.5 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-ink-faint font-medium">{s.label}</span>
                <span className="w-6 h-6 rounded-lg bg-surface-200/40 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Icon className="w-3.5 h-3.5 text-ink-faint group-hover:text-primary transition-colors" />
                </span>
              </div>
              <div className="text-2xl font-bold text-ink">{s.value}</div>
            </button>
          )
        })}
      </div>

      {/* Three-col lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Purchase Orders */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-200 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-ink">Recent Purchase Orders</h3>
            <button onClick={() => onNavigate('orders')} className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {recentPOs.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-ink-faint">No purchase orders yet.</div>
          ) : (
            <div className="divide-y divide-surface-100">
              {recentPOs.map(po => {
                const s = PO_STATUS[po.status] ?? PO_STATUS.DRAFT
                const ref = po.ref || `PO-${po.id.slice(0, 6).toUpperCase()}`
                return (
                  <div key={po.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{ref}</div>
                      <div className="text-xs text-ink-faint truncate">
                        {po.supplierName ?? po.supplier?.name ?? '—'}
                        {po.lines?.length ? ` · ${po.lines.length} items` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="badge text-[10px] font-semibold px-2 py-0.5"
                        style={{ background: s.bg, color: s.color }}>{s.label}</span>
                      <span className="text-[11px] text-ink-faint">
                        {format(new Date(po.orderDate), 'd MMM')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Upcoming Deliveries */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-200 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-ink">Upcoming Deliveries</h3>
            <button onClick={() => onNavigate('deliveries')} className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {upcomingDOs.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-ink-faint">No pending deliveries.</div>
          ) : (
            <div className="divide-y divide-surface-100">
              {upcomingDOs.map(doItem => {
                const s = DO_STATUS[doItem.status] ?? DO_STATUS.PENDING
                const ref = doItem.ref || `DO-${doItem.id.slice(0, 6).toUpperCase()}`
                return (
                  <div key={doItem.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{ref}</div>
                      <div className="text-xs text-ink-faint truncate">
                        {doItem.po?.supplierName ?? doItem.po?.ref ?? '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="badge text-[10px] font-semibold px-2 py-0.5"
                        style={{ background: s.bg, color: s.color }}>{s.label}</span>
                      {doItem.expectedDate && (
                        <span className="text-[11px] text-ink-faint">
                          {format(new Date(doItem.expectedDate), 'd MMM')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top Materials by Usage */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-200 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-ink">Most Used Materials</h3>
            <button onClick={() => onNavigate('materials')} className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {library.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-ink-faint">No materials yet.</div>
          ) : (
            <div className="divide-y divide-surface-100">
              {[...library]
                .sort((a, b) => (b.usedInSystems?.length ?? 0) - (a.usedInSystems?.length ?? 0))
                .slice(0, 6)
                .map(item => {
                  const count = item.usedInSystems?.length ?? 0
                  const sup = item.spec?.supplier
                  return (
                    <div key={item.id} className="px-5 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{item.name}</div>
                        {sup && <div className="text-xs text-ink-faint truncate">{sup}</div>}
                      </div>
                      <div className="flex-shrink-0">
                        {count > 0
                          ? <span className="badge bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5">{count} system{count !== 1 ? 's' : ''}</span>
                          : <span className="text-xs text-ink-faint">—</span>
                        }
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
