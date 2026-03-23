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
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full rounded-md bg-violet-600 px-4 py-2 text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {loading ? 'Joining...' : `Join ${companyName}`}
      </button>
    </div>
  )
}
