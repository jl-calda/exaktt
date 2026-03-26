// src/components/layout/Sidebar.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, FileText, Users, Truck,
  BarChart2, UserCog, Settings, Menu, X,
} from 'lucide-react'
import type { CompanyRole } from '@/types'
import type { Plan } from '@prisma/client'

interface NavItem {
  label: string
  href:  string
  icon:  React.ElementType
  roles: CompanyRole[]
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['OWNER', 'ADMIN', 'MEMBER'], exact: true },
  { label: 'Products',  href: '/products',  icon: Package,         roles: ['OWNER', 'ADMIN', 'MEMBER'] },
  { label: 'Tenders',   href: '/tenders',   icon: FileText,        roles: ['OWNER', 'ADMIN', 'MEMBER'] },
  { label: 'Clients',   href: '/clients',   icon: Users,           roles: ['OWNER', 'ADMIN', 'MEMBER'] },
  { label: 'Logistics', href: '/logistics', icon: Truck,           roles: ['OWNER', 'ADMIN', 'MEMBER'] },
  { label: 'Finance',   href: '/finance',   icon: BarChart2,       roles: ['OWNER', 'ADMIN'] },
  { label: 'People',    href: '/people',    icon: UserCog,         roles: ['OWNER'] },
]

interface Props { role: CompanyRole; plan: Plan }

export default function Sidebar({ role }: Props) {
  const pathname = usePathname()
  const visible  = NAV_ITEMS.filter(item => item.roles.includes(role))
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  const settingsLink = (
    <Link href="/settings"
      onClick={() => setMobileOpen(false)}
      className={`sidebar-item${pathname.startsWith('/settings') ? ' active' : ''}`}>
      <Settings className="w-[15px] h-[15px] shrink-0" strokeWidth={1.8} />
      <span className="text-[13px] font-medium whitespace-nowrap
        md:opacity-0 md:group-hover/sb:opacity-100 transition-opacity duration-150 delay-75">
        Settings
      </span>
    </Link>
  )

  const navContent = (mobile: boolean) => (
    <>
      {/* Settings at top on mobile */}
      {mobile && (
        <div className="py-2 px-2 shrink-0" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          {settingsLink}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-2 flex flex-col gap-px px-2 overflow-y-auto overflow-x-hidden">
        {visible.map(item => {
          const active = isActive(item)
          const Icon   = item.icon
          return (
            <Link key={item.href} href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`sidebar-item${active ? ' active' : ''}`}>
              <Icon className="w-[15px] h-[15px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[13px] font-medium whitespace-nowrap
                md:opacity-0 md:group-hover/sb:opacity-100 transition-opacity duration-150 delay-75">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Settings at bottom on desktop */}
      {!mobile && (
        <div className="py-2 px-2 shrink-0" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          {settingsLink}
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-0 left-0 z-50 h-[52px] w-[52px] flex items-center justify-center text-ink-muted hover:text-ink"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside
            className="relative w-56 flex flex-col h-screen"
            style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
          >
            {/* Logo + close */}
            <div className="h-[52px] flex items-center justify-between px-[14px] shrink-0"
              style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center font-bold text-white text-[11px]"
                  style={{ background: 'var(--color-primary)' }}>E</div>
                <span className="font-bold text-[13px] text-ink">Exakt</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            {navContent(true)}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="group/sb hidden md:flex w-[52px] hover:w-52 transition-[width] duration-200 ease-out shrink-0 overflow-hidden flex-col h-screen sticky top-0 z-40"
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      >
        {/* Logo */}
        <div className="h-[52px] flex items-center px-[14px] shrink-0"
          style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <Link href="/dashboard"
            className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center font-bold text-white text-[11px]"
            style={{ background: 'var(--color-primary)' }}>
            E
          </Link>
          <span className="ml-3 font-bold text-[13px] text-ink whitespace-nowrap
            opacity-0 group-hover/sb:opacity-100 transition-opacity duration-150 delay-75 select-none">
            Exakt
          </span>
        </div>
        {navContent(false)}
      </aside>
    </>
  )
}
