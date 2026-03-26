// src/components/layout/TopNav.tsx
'use client'
import { usePathname } from 'next/navigation'
import { Sun, Moon } from 'lucide-react'
import NotificationBell from '@/components/tasks/NotificationBell'
import { useTheme } from '@/components/ThemeProvider'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products':  'Products',
  '/tenders':   'Tenders',
  '/clients':   'Clients',
  '/logistics': 'Logistics',
  '/finance':   'Finance',
  '/people':    'People',
  '/settings':  'Settings',
  '/billing':   'Billing',
}

interface Props {
  userName?:  string | null
  userEmail?: string | null
  plan?:      string
}

export default function TopNav({ userName, userEmail, plan }: Props) {
  const pathname      = usePathname()
  const { isDark, toggle } = useTheme()

  const title = Object.entries(TITLES)
    .filter(([key]) => pathname.startsWith(key))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'Exakt'

  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (userEmail?.[0] ?? 'U').toUpperCase()

  return (
    <header className="h-[52px] flex items-center px-5 pl-14 md:pl-5 gap-4 sticky top-0 z-30"
      style={{ background: 'var(--color-sidebar)', borderBottom: '1px solid var(--color-sidebar-border)' }}>
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-[13px] text-ink truncate">{title}</h2>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={toggle}
          className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-surface-100 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? <Sun className="w-[15px] h-[15px]" /> : <Moon className="w-[15px] h-[15px]" />}
        </button>
        <NotificationBell />

        <div className="flex items-center gap-2 pl-1.5 ml-0.5 border-l border-surface-200">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ background: 'var(--color-primary)' }}
            title={userName ?? userEmail ?? ''}>
            {initials}
          </div>
          <div className="hidden sm:block">
            <div className="text-[12px] font-medium text-ink leading-none">{userName ?? userEmail}</div>
            {plan && (
              <div className="text-[11px] text-ink-faint mt-0.5 capitalize">{plan.toLowerCase()}</div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
