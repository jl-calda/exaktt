// src/components/layout/ModuleNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { CompanyRole } from '@/types'
import type { Plan } from '@prisma/client'

interface NavItem {
  label: string
  href:  string
  roles: CompanyRole[]
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', roles: ['OWNER', 'ADMIN', 'MEMBER'], exact: true },
  { label: 'Products',  href: '/products',  roles: ['OWNER', 'ADMIN', 'MEMBER'] },
  { label: 'Tenders',   href: '/tenders',   roles: ['OWNER', 'ADMIN', 'MEMBER'] },
  { label: 'Clients',   href: '/clients',   roles: ['OWNER', 'ADMIN', 'MEMBER'] },
  { label: 'Logistics', href: '/logistics', roles: ['OWNER', 'ADMIN', 'MEMBER'] },
  { label: 'Finance',   href: '/finance',   roles: ['OWNER', 'ADMIN'] },
  { label: 'People',    href: '/people',    roles: ['OWNER'] },
]

interface Props {
  role: CompanyRole
  plan: Plan
}

export default function ModuleNav({ role, plan: _plan }: Props) {
  const pathname = usePathname()
  const visible  = NAV_ITEMS.filter(item => item.roles.includes(role))
  const showSettings = role === 'OWNER' || role === 'ADMIN'

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <nav className="bg-white border-b border-surface-200 sticky top-12 z-30">
      <div className="max-w-screen-xl mx-auto px-4 flex items-center h-10">
        <div className="flex items-center gap-0.5 flex-1">
          {visible.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive(item)
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        {showSettings && (
          <Link
            href="/settings"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname.startsWith('/settings')
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-ink-muted hover:text-ink hover:bg-surface-100'
            }`}
          >
            Settings
          </Link>
        )}
      </div>
    </nav>
  )
}
