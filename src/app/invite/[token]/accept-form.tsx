// src/app/invite/[token]/accept-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AcceptInviteForm({ token, companyName }: { token: string; companyName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to accept invite')
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      {error && <p className="mb-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="btn-primary w-full justify-center"
      >
        {loading ? 'Joining...' : `Join ${companyName}`}
      </button>
    </div>
  )
}
