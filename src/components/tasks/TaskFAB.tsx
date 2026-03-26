'use client'
import { ClipboardList } from 'lucide-react'
import { useTaskStore } from '@/store'

export default function TaskFAB() {
  const { drawerOpen, openDrawer, unreadCount } = useTaskStore()
  if (drawerOpen) return null  // hide when drawer is open

  return (
    <button onClick={() => openDrawer()}
      className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center">
      <ClipboardList className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
