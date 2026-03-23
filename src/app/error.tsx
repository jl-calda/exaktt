// src/app/error.tsx
'use client'
import { useEffect } from 'react'
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-100">
      <div className="text-center p-8 max-w-sm">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="font-display font-bold text-xl text-ink mb-2">Something went wrong</h2>
        <p className="text-sm font-mono bg-surface-200 rounded-lg px-3 py-2 text-ink-muted mb-6">{error.message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary">Try again</button>
          <a href="/dashboard" className="btn-secondary">Dashboard</a>
        </div>
      </div>
    </div>
  )
}
