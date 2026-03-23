// src/components/ThemeProvider.tsx
'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ThemeId } from '@/lib/theme'
import { THEME_STORAGE_KEY, DARK_STORAGE_KEY } from '@/lib/theme'

interface ThemeCtx {
  theme:     ThemeId
  isDark:    boolean
  setTheme:  (t: ThemeId)   => void
  setDark:   (d: boolean)   => void
  toggle:    () => void
}

const Ctx = createContext<ThemeCtx>({
  theme: 'default', isDark: false,
  setTheme: () => {}, setDark: () => {}, toggle: () => {},
})

export function useTheme() { return useContext(Ctx) }

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme,  setThemeState]  = useState<ThemeId>('default')
  const [isDark, setDarkState]   = useState(false)
  const [ready,  setReady]       = useState(false)

  // Read initial values from localStorage (FOUC script already applied to DOM)
  useEffect(() => {
    const savedTheme = (localStorage.getItem(THEME_STORAGE_KEY) ?? 'default') as ThemeId
    const savedDark  = localStorage.getItem(DARK_STORAGE_KEY) === 'true'
    setThemeState(savedTheme)
    setDarkState(savedDark)
    setReady(true)
  }, [])

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t)
    localStorage.setItem(THEME_STORAGE_KEY, t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  const setDark = useCallback((d: boolean) => {
    setDarkState(d)
    localStorage.setItem(DARK_STORAGE_KEY, String(d))
    if (d) document.documentElement.classList.add('dark')
    else   document.documentElement.classList.remove('dark')
  }, [])

  const toggle = useCallback(() => setDark(!isDark), [isDark, setDark])

  if (!ready) return <>{children}</>

  return (
    <Ctx.Provider value={{ theme, isDark, setTheme, setDark, toggle }}>
      {children}
    </Ctx.Provider>
  )
}
