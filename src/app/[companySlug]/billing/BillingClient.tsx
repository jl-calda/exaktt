// src/app/billing/BillingClient.tsx
'use client'
import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { PLANS } from '@/lib/plans'
import type { Plan } from '@prisma/client'
import { format } from 'date-fns'

interface Props {
  plan:             Plan
  stripeCustomerId: string | null
  planExpiresAt:    Date | null
}

export default function BillingClient({ plan, stripeCustomerId, planExpiresAt }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleCheckout = async (priceId: string, planId: string) => {
    setLoading(planId)
    const res = await fetch('/api/billing/checkout', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ priceId }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
    setLoading(null)
  }

  const handlePortal = async () => {
    setLoading('portal')
    const res = await fetch('/api/billing/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const { url } = await res.json()
    if (url) window.location.href = url
    setLoading(null)
  }

  return (
    <div className="min-h-full">
      <main className="px-4 py-4 md:px-6 md:py-5">
        {/* Current plan banner */}
        <div className="card p-5 mb-8 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan === 'PRO' ? 'bg-primary text-white' : 'bg-surface-200 text-ink-muted'}`}>
            {plan === 'PRO' ? <Sparkles className="w-5 h-5" /> : '🆓'}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-ink">
              Current plan: <span className={plan === 'PRO' ? 'text-primary' : 'text-ink'}>{plan === 'PRO' ? 'Pro' : 'Free'}</span>
            </div>
            {plan === 'PRO' && planExpiresAt && (
              <div className="text-xs text-ink-muted mt-0.5">
                Renews {format(new Date(planExpiresAt), 'd MMM yyyy')}
              </div>
            )}
          </div>
          {plan === 'PRO' && stripeCustomerId && (
            <button onClick={handlePortal} disabled={loading === 'portal'} className="btn-secondary text-xs py-2">
              {loading === 'portal' ? 'Loading…' : 'Manage subscription'}
            </button>
          )}
        </div>

        <h1 className="font-semibold text-sm text-ink text-center mb-2">Simple, transparent pricing</h1>
        <p className="text-ink-muted text-xs text-center mb-10">Built for quantity surveyors and logistics teams.</p>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {PLANS.map(p => {
            const isCurrent = (p.id === 'free' && plan === 'FREE') || (p.id !== 'free' && plan === 'PRO')
            return (
              <div key={p.id} className={`card p-6 flex flex-col ${p.highlighted ? 'ring-2 ring-primary shadow-panel' : ''}`}>
                {p.highlighted && (
                  <div className="badge bg-primary text-white w-fit mb-3 text-[10px] font-bold">Most popular</div>
                )}
                {p.badge && (
                  <div className="badge bg-accent/10 text-accent w-fit mb-3 text-[10px] font-bold">{p.badge}</div>
                )}
                <div className="font-bold text-sm text-ink">{p.name}</div>
                <div className="mt-2 mb-4">
                  {p.price === 0
                    ? <span className="text-3xl font-black text-ink">Free</span>
                    : <><span className="text-xs text-ink-muted mr-1">{p.currency}</span><span className="text-3xl font-black text-ink">{p.price}</span><span className="text-xs text-ink-muted">/{p.period}</span></>}
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-[11px] text-ink-muted">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {p.id === 'free'
                  ? <div className="btn-secondary text-xs justify-center opacity-60 cursor-default">{isCurrent ? 'Current plan' : 'Free forever'}</div>
                  : isCurrent
                    ? <div className="btn-secondary text-xs justify-center opacity-60 cursor-default">Current plan</div>
                    : <button onClick={() => handleCheckout(p.priceId!, p.id)} disabled={!!loading}
                        className={`text-xs justify-center ${p.highlighted ? 'btn-primary' : 'btn-secondary'}`}>
                        {loading === p.id ? 'Loading…' : p.cta}
                      </button>}
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-ink-faint mt-8">
          Secure payments via Stripe. Cancel anytime. All prices in SGD.
        </p>
      </main>
    </div>
  )
}
