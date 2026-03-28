// src/components/projects/ProjectsSidebar.tsx
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { FolderKanban, Layers, MapPin, UsersRound, Wrench, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Projects', icon: FolderKanban, path: '/projects', exact: true },
  { label: 'Overview', icon: Layers, path: '/projects/overview' },
  { label: 'Map', icon: MapPin, path: '/projects/map' },
  { label: 'Teams', icon: UsersRound, path: '/projects/teams' },
  { label: 'Assets', icon: Wrench, path: '/projects/assets' },
  { label: 'Settings', icon: Settings, path: '/projects/settings' },
]

interface Props {
  counts?: {
    total?: number
    active?: number
    teams?: number
    assets?: number
  }
}

export default function ProjectsSidebar({ counts }: Props) {
  const pathname = usePathname()

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (item.exact) {
      // /projects exact OR /projects/[id] detail pages
      return pathname === item.path || /^\/projects\/[^/]+$/.test(pathname)
    }
    return pathname.startsWith(item.path)
  }

  return (
    <>
      {/* Mobile tab bar */}
      <nav className="md:hidden flex items-center gap-1 px-2 py-1.5 border-b border-surface-200 bg-surface-50 overflow-x-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link key={item.path} href={item.path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 ${
                active ? 'bg-surface-50 text-ink font-semibold shadow-[var(--shadow-card)]' : 'text-ink-muted hover:text-ink hover:bg-surface-100'
              }`}>
              <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Desktop secondary sidebar */}
      <aside
        className="hidden md:flex w-48 shrink-0 border-r border-surface-200 bg-surface-50 flex-col sticky top-0 self-start overflow-y-auto"
        style={{ height: 'calc(100vh - 52px)', borderRight: '1px solid var(--sidebar-border)' }}>

        {/* Header */}
        <div className="px-3 py-3 border-b border-surface-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-surface-200/40 flex items-center justify-center text-sm flex-shrink-0">📊</span>
            <span className="font-semibold text-xs text-ink leading-tight truncate">Projects</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 flex flex-col gap-px">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <Link key={item.path} href={item.path}
                className={`sidebar-item text-[11px] ${active ? 'active' : ''}`}>
                <span className={`icon-well ${active ? 'text-primary' : ''}`}>
                  <Icon className="w-[15px] h-[15px]" strokeWidth={active ? 2.2 : 1.8} />
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Counts summary */}
        {counts && (
          <div className="px-3 py-3 border-t border-surface-200 space-y-1">
            {counts.total != null && (
              <div className="flex justify-between text-[10px] text-ink-faint">
                <span>Total</span><span className="font-semibold text-ink">{counts.total}</span>
              </div>
            )}
            {counts.active != null && (
              <div className="flex justify-between text-[10px] text-ink-faint">
                <span>Active</span><span className="font-semibold text-ink">{counts.active}</span>
              </div>
            )}
            {counts.teams != null && (
              <div className="flex justify-between text-[10px] text-ink-faint">
                <span>Teams</span><span className="font-semibold text-ink">{counts.teams}</span>
              </div>
            )}
            {counts.assets != null && (
              <div className="flex justify-between text-[10px] text-ink-faint">
                <span>Assets</span><span className="font-semibold text-ink">{counts.assets}</span>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
