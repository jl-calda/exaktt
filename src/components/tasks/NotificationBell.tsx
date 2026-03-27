'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
import { useTaskStore } from '@/store'

export default function NotificationBell() {
  const { unreadCount, setUnreadCount } = useTaskStore()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(j => {
      if (j.data) {
        setNotifications(j.data)
        setUnreadCount(j.data.filter((n: any) => !n.isRead).length)
      }
    })
  }, [setUnreadCount])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead).map(n => n.id)
    if (unread.length === 0) return
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: unread }) })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-faint hover:text-ink hover:bg-surface-200/60 transition-colors relative" title="Notifications">
        <Bell className="w-[15px] h-[15px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-surface border border-surface-200 shadow-xl overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
          <div className="px-3 py-2 border-b border-surface-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">Notifications</span>
            {unreadCount > 0 && <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-surface-100">
            {notifications.slice(0, 20).map(n => (
              <div key={n.id} className={`px-3 py-2.5 ${n.isRead ? '' : 'bg-primary/5'}`}>
                <div className="text-xs font-medium text-ink">{n.title}</div>
                {n.body && <div className="text-[10px] text-ink-muted mt-0.5">{n.body}</div>}
                <div className="text-[9px] text-ink-faint mt-1">{format(new Date(n.createdAt), 'dd MMM HH:mm')}</div>
              </div>
            ))}
            {notifications.length === 0 && <div className="px-3 py-6 text-center text-xs text-ink-faint">No notifications</div>}
          </div>
        </div>
      )}
    </div>
  )
}
