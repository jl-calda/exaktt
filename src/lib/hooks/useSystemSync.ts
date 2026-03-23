// src/lib/hooks/useSystemSync.ts
import { useEffect, useRef, useCallback } from 'react'
import type { MtoSystem } from '@/types'

export function useSystemSync(sys: MtoSystem, dirty: boolean, onSaved: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async () => {
    if (!sys.id) return
    try {
      const res = await fetch('/api/mto/systems/' + sys.id, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name: sys.name, description: sys.description, icon: sys.icon,
          color: sys.color, inputModel: sys.inputModel,
          materials: sys.materials, customDims: sys.customDims,
          customCriteria: sys.customCriteria, variants: sys.variants, warnings: sys.warnings,
        }),
      })
      if (res.ok) onSaved()
    } catch (err) {
      console.error('System save failed:', err)
    }
  }, [sys, onSaved])

  useEffect(() => {
    if (!dirty) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(save, 1500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [sys, dirty, save])

  return { saveNow: save }
}
