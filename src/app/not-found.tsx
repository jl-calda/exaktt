// src/app/not-found.tsx
import Link from 'next/link'
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-100">
      <div className="text-center p-8 max-w-sm">
        <div className="text-6xl mb-6">📐</div>
        <h1 className="font-display font-black text-3xl text-ink mb-2">404</h1>
        <p className="text-ink-muted mb-8">This page doesn't exist or you don't have access to it.</p>
        <Link href="/dashboard" className="btn-primary inline-flex">Back to dashboard</Link>
      </div>
    </div>
  )
}
