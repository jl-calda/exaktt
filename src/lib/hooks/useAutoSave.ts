// src/lib/hooks/useAutoSave.ts
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

type Status = 'idle' | 'saving' | 'saved' | 'error'

export function useAutoSave<T>(
  value: T,
  saveFn: (value: T) => Promise<void>,
  delay = 1500,
) {
  const [status, setStatus] = useState<Status>('idle')
  const [dirty,  setDirty]  = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const mountRef = useRef(false)
  const mountedRef = useRef(true)

  // Mark dirty after first mount
  useEffect(() => {
    if (!mountRef.current) { mountRef.current = true; return }
    setDirty(true)
  }, [value])

  useEffect(() => {
    if (!dirty) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (!mountedRef.current) return
      setStatus('saving')
      try {
        await saveFn(value)
        if (!mountedRef.current) return
        setStatus('saved')
        setDirty(false)
        setTimeout(() => {
          if (!mountedRef.current) return
          setStatus('idle')
        }, 2000)
      } catch {
        if (!mountedRef.current) return
        setStatus('error')
        setDirty(true)  // Allow retry on next change
      }
    }, delay)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      mountedRef.current = false
    }
  }, [value, dirty, saveFn, delay])

  return { status, dirty }
}
