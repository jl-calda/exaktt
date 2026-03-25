import { useEffect, useRef } from 'react'
import { useCalcStore } from '@/store'

export function useAutoSaveDraft(systemId: string) {
  const runs = useCalcStore(s => s.runs)
  const stockOptimMode = useCalcStore(s => s.stockOptimMode)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const lastSavedRef = useRef<string>('')
  const mountedRef = useRef(true)

  useEffect(() => {
    const snapshot = JSON.stringify({ runs, stockOptimMode })

    // Skip if nothing changed (prevents save on mount with restored data)
    if (snapshot === lastSavedRef.current) return

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (!mountedRef.current) return
      try {
        await fetch('/api/mto/drafts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemId, runs, stockOptimMode }),
        })
        if (!mountedRef.current) return
        lastSavedRef.current = snapshot
      } catch {
        // Silent failure — draft saving is best-effort
        // Mark snapshot as unsaved so next change triggers a retry
        lastSavedRef.current = ''
      }
    }, 2000)

    return () => {
      clearTimeout(timerRef.current)
      mountedRef.current = false
    }
  }, [runs, stockOptimMode, systemId])
}
