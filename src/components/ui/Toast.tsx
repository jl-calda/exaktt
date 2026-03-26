// src/components/ui/Toast.tsx
'use client'
import { useState, useCallback, createContext, useContext } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'
interface ToastItem { id: string; message: string; type: ToastType }

const ToastContext = createContext<(msg: string, type?: ToastType) => void>(() => {})
export function useToast() { return useContext(ToastContext) }

export function Toast({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const add = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  const icons = { success: <CheckCircle className="w-4 h-4 text-emerald-500"/>, error: <XCircle className="w-4 h-4 text-red-500"/>, warning: <AlertTriangle className="w-4 h-4 text-amber-500"/>, info: <Info className="w-4 h-4 text-blue-500"/> }
  return (
    <ToastContext.Provider value={add}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="flex items-center gap-2.5 bg-white/80 backdrop-blur-xl backdrop-saturate-150 border border-surface-200/60 rounded-2xl px-5 py-3.5 shadow-panel text-sm font-medium text-ink animate-slide-up pointer-events-auto max-w-xs">
            {icons[t.type]}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
