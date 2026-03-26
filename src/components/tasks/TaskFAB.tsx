'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { useTaskStore } from '@/store'

export default function TaskFAB() {
  const pathname = usePathname()
  const { drawerOpen, openDrawer, unreadCount } = useTaskStore()
  const [linkedCount, setLinkedCount] = useState(0)

  // Fetch count of tasks linked to the current page
  useEffect(() => {
    if (!pathname || pathname === '/dashboard' || pathname === '/') return
    fetch(`/api/tasks?linkedUrl=${encodeURIComponent(pathname)}&countOnly=true`)
      .then(r => r.json())
      .then(j => setLinkedCount(j.count ?? 0))
      .catch(() => {})
  }, [pathname])

  if (drawerOpen) return null

  const totalBadge = unreadCount + linkedCount

  return (
    <button onClick={() => openDrawer(pathname)}
      className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center">
      <ClipboardList className="w-5 h-5" />
      {totalBadge > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {totalBadge > 9 ? '9+' : totalBadge}
        </span>
      )}
    </button>
  )
}
