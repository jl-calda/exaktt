// src/lib/hooks/useAutoSave.ts
'use client'
import { useEffect, useRef, useState } from 'react'

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

  // Mark dirty after first mount
  useEffect(() => {
    if (!mountRef.current) { mountRef.current = true; return }
    setDirty(true)
  }, [value])

  useEffect(() => {
    if (!dirty) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setStatus('saving')
      try {
        await saveFn(value)
        setStatus('saved')
        setDirty(false)
        setTimeout(() => setStatus('idle'), 2000)
      } catch {
        setStatus('error')
      }
    }, delay)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [value, dirty, saveFn, delay])

  return { status, dirty }
}
