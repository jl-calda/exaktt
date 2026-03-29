'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, Users2, DollarSign, FileText, FolderKanban,
  Globe, Palette, User2, UserCircle,
} from 'lucide-react'

const SETTINGS_NAV = [
  { label: 'Profile', href: '/settings/profile', icon: UserCircle, roles: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] },
  { label: 'Company Info', href: '/settings/info', icon: Building2, roles: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] },
  { label: 'Team', href: '/settings/team', icon: Users2, roles: ['OWNER', 'ADMIN'] },
  { label: 'Departments', href: '/settings/departments', icon: Building2, roles: ['OWNER'] },
  { label: 'Labour Rates', href: '/settings/labour', icon: DollarSign, roles: ['OWNER'] },
  { label: 'Tenders', href: '/settings/tenders', icon: FileText, roles: ['OWNER', 'ADMIN'] },
  { label: 'Projects', href: '/settings/projects', icon: FolderKanban, roles: ['OWNER', 'ADMIN'] },
  { label: 'Domain', href: '/settings/domain', icon: Globe, roles: ['OWNER'] },
  { label: 'Appearance', href: '/settings/appearance', icon: Palette, roles: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] },
  { label: 'Account', href: '/settings/account', icon: User2, roles: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] },
]

interface Props {
  role: string
  memberCount: number
  plan: string
}

export default function SettingsSidebar({ role, memberCount, plan }: Props) {
  const pathname = usePathname()
  const filteredNav = SETTINGS_NAV.filter(item => item.roles.includes(role))

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Mobile tab bar */}
      <nav className="md:hidden flex items-center gap-1 px-2 py-1.5 border-b border-surface-200 bg-surface-50 overflow-x-auto">
        {filteredNav.map(item => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 ${
                active ? 'bg-surface-50 text-ink font-semibold shadow-[var(--shadow-card)]' : 'text-ink-muted hover:text-ink hover:bg-surface-100'
              }`}>
              <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-48 shrink-0 border-r border-surface-200 bg-surface-50 flex-col sticky top-0 self-start overflow-y-auto"
        style={{ height: 'calc(100vh - 52px)', borderRight: '1px solid var(--sidebar-border)' }}>

        {/* Header */}
        <div className="px-3 py-3 border-b border-surface-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-surface-200/40 flex items-center justify-center text-sm flex-shrink-0">&#x2699;&#xFE0F;</span>
            <span className="font-semibold text-xs text-ink leading-tight truncate">Settings</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 flex flex-col gap-px">
          {filteredNav.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`sidebar-item text-[11px] ${active ? 'active' : ''}`}>
                <span className={`icon-well ${active ? 'text-primary' : ''}`}>
                  <Icon className="w-[15px] h-[15px]" strokeWidth={active ? 2.2 : 1.8} />
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-surface-200 space-y-1">
          <div className="flex justify-between text-[10px] text-ink-faint">
            <span>Members</span>
            <span className="font-semibold text-ink">{memberCount}</span>
          </div>
          <div className="flex justify-between text-[10px] text-ink-faint">
            <span>Plan</span>
            <span className="font-semibold text-ink">{plan}</span>
          </div>
        </div>
      </aside>
    </>
  )
}
