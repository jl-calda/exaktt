// src/components/logistics/LogisticsClient.tsx
'use client'
import { useState } from 'react'
import type { Plan } from '@prisma/client'
import { LayoutDashboard, Package, Building2, ShoppingCart, Truck, Factory } from 'lucide-react'
import OverviewTab        from './OverviewTab'
import MaterialsTab       from './MaterialsTab'
import SuppliersTab       from './SuppliersTab'
import ManufacturersTab   from './ManufacturersTab'
import PurchaseOrdersTab  from './PurchaseOrdersTab'
import DeliveriesTab      from './DeliveriesTab'

type Tab = 'overview' | 'materials' | 'suppliers' | 'manufacturers' | 'orders' | 'deliveries'

const NAV_TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'overview',       label: 'Overview',        Icon: LayoutDashboard },
  { id: 'materials',      label: 'Materials',        Icon: Package         },
  { id: 'suppliers',      label: 'Suppliers',        Icon: Building2       },
  { id: 'manufacturers',  label: 'Manufacturers',    Icon: Factory         },
  { id: 'orders',         label: 'Purchase Orders',  Icon: ShoppingCart    },
  { id: 'deliveries',     label: 'Deliveries',       Icon: Truck           },
]

interface Props {
  library:       any[]
  suppliers:     any[]
  pos:           any[]
  dos:           any[]
  plan:          Plan
  categories:    any[]
  grades:        any[]
  manufacturers: any[]
}

export default function LogisticsClient({ library: initialLibrary, suppliers: initialSuppliers, pos: initialPos, dos: initialDos, plan, categories: initialCategories, grades: initialGrades, manufacturers: initialManufacturers }: Props) {
  const [tab,           setTab]           = useState<Tab>('overview')
  const [library,       setLibrary]       = useState(initialLibrary)
  const [suppliers,     setSuppliers]     = useState(initialSuppliers)
  const [pos,           setPos]           = useState(initialPos)
  const [dos,           setDos]           = useState(initialDos)
  const [categories,    setCategories]    = useState(initialCategories)
  const [grades,        setGrades]        = useState(initialGrades)
  const [manufacturers, setManufacturers] = useState(initialManufacturers)

  const refreshLibrary       = () => fetch('/api/mto/library').then(r => r.json()).then(j => { if (j.data) setLibrary(j.data) })
  const refreshSuppliers     = () => fetch('/api/logistics/suppliers').then(r => r.json()).then(j => { if (j.data) setSuppliers(j.data) })
  const refreshPos           = () => fetch('/api/logistics/po').then(r => r.json()).then(j => { if (j.data) setPos(j.data) })
  const refreshDos           = () => fetch('/api/logistics/do').then(r => r.json()).then(j => { if (j.data) setDos(j.data) })
  const refreshCategories    = () => fetch('/api/mto/categories').then(r => r.json()).then(j => { if (j.data) setCategories(j.data) })
  const refreshGrades        = () => fetch('/api/mto/grades').then(r => r.json()).then(j => { if (j.data) setGrades(j.data) })
  const refreshManufacturers = () => fetch('/api/mto/manufacturers').then(r => r.json()).then(j => { if (j.data) setManufacturers(j.data) })

  return (
    <div className="flex" style={{ minHeight: '100%' }}>

      {/* Secondary sidebar */}
      <aside
        className="w-48 shrink-0 border-r border-surface-200 bg-surface-50 flex flex-col sticky top-0 self-start overflow-y-auto"
        style={{ height: 'calc(100vh - 52px)', borderRight: '1px solid var(--sidebar-border)' }}>

        {/* Header */}
        <div className="px-3 py-3 border-b border-surface-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base flex-shrink-0">🚚</span>
            <span className="font-semibold text-xs text-ink leading-tight truncate">Logistics</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 flex flex-col gap-px">
          {NAV_TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`sidebar-item text-[11px] ${tab === id ? 'active' : ''}`}>
              <Icon className="w-[15px] h-[15px] shrink-0" strokeWidth={tab === id ? 2.2 : 1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Counts summary */}
        <div className="px-3 py-3 border-t border-surface-200 space-y-1">
          <div className="flex justify-between text-[10px] text-ink-faint">
            <span>Materials</span><span className="font-semibold text-ink">{library.length}</span>
          </div>
          <div className="flex justify-between text-[10px] text-ink-faint">
            <span>Suppliers</span><span className="font-semibold text-ink">{suppliers.length}</span>
          </div>
          <div className="flex justify-between text-[10px] text-ink-faint">
            <span>Manufacturers</span><span className="font-semibold text-ink">{manufacturers.length}</span>
          </div>
          <div className="flex justify-between text-[10px] text-ink-faint">
            <span>Open POs</span><span className="font-semibold text-ink">{pos.filter(p => ['DRAFT','SENT'].includes(p.status)).length}</span>
          </div>
          <div className="flex justify-between text-[10px] text-ink-faint">
            <span>Pending DOs</span><span className="font-semibold text-ink">{dos.filter(d => ['PENDING','PARTIAL'].includes(d.status)).length}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="px-6 py-6">
          {tab === 'overview'   && <OverviewTab library={library} suppliers={suppliers} pos={pos} dos={dos} onNavigate={setTab} />}
          {tab === 'materials'  && <MaterialsTab library={library} suppliers={suppliers} categories={categories} grades={grades} manufacturers={manufacturers} onRefresh={refreshLibrary} onRefreshCategories={refreshCategories} onRefreshGrades={refreshGrades} onRefreshManufacturers={refreshManufacturers} />}
          {tab === 'suppliers'      && <SuppliersTab suppliers={suppliers} onRefresh={refreshSuppliers} />}
          {tab === 'manufacturers'  && <ManufacturersTab manufacturers={manufacturers} library={library} onRefresh={refreshManufacturers} />}
          {tab === 'orders'     && <PurchaseOrdersTab pos={pos} suppliers={suppliers} library={library} onRefresh={refreshPos} />}
          {tab === 'deliveries' && <DeliveriesTab dos={dos} pos={pos} library={library} onRefresh={refreshDos} onRefreshPos={refreshPos} />}
        </div>
      </div>

    </div>
  )
}
