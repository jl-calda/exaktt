// src/components/billing/UpgradePrompt.tsx
'use client'
import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import type { Plan } from '@prisma/client'
import { PLANS } from '@/lib/plans'

interface UpgradePromptProps {
  feature:      string
  message?:     string
  description?: string   // alias for message
  plan?:        Plan
  inline?:      boolean   // true = inline banner, false = modal
  compact?:     boolean   // alias for inline
  upgradeTo?:   string   // accepted for compat, unused
  onDismiss?:   () => void
}

export default function UpgradePrompt({ feature, message, description, plan = 'FREE', inline, compact, onDismiss }: UpgradePromptProps) {
  const isInline = inline ?? compact
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (plan === 'PRO' || dismissed) return null

  const handleUpgrade = async (priceId: string) => {
    setLoading(true)
    const res = await fetch('/api/billing/checkout', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ priceId }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
    setLoading(false)
  }

  const proPlan     = PLANS.find(p => p.id === 'pro_monthly')!
  const annualPlan  = PLANS.find(p => p.id === 'pro_annual')!

  const displayMsg = message ?? description

  if (isInline) return (
    <div className="flex items-start gap-3 bg-gradient-to-r from-primary-50 to-accent/5 border border-primary/20 rounded-xl p-4">
      <span className="w-8 h-8 rounded-lg bg-surface-200/40 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-primary" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink mb-0.5">Pro feature</p>
        <p className="text-xs text-ink-muted">{displayMsg ?? 'Upgrade to Pro to unlock this feature.'}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() => handleUpgrade(proPlan.priceId!)} disabled={loading}
          className="btn-primary text-xs py-1.5 px-3">
          {loading ? '…' : 'Upgrade'}
        </button>
        {onDismiss && (
          <button onClick={() => { setDismissed(true); onDismiss() }} className="text-ink-faint hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onDismiss} />
      <div className="relative w-full max-w-md bg-surface-50 rounded-2xl shadow-float animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-accent p-6 text-white text-center">
          <span className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-6 h-6 opacity-90" />
          </span>
          <h2 className="font-display font-black text-xl">Upgrade to Pro</h2>
          <p className="text-sm opacity-80 mt-1">{displayMsg ?? 'Unlock ' + feature + ' and much more.'}</p>
        </div>
        {/* Plans */}
        <div className="p-5 space-y-3">
          {[proPlan, annualPlan].map(p => (
            <button key={p.id} onClick={() => handleUpgrade(p.priceId!)} disabled={loading}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 ${p.highlighted ? 'bg-surface-50 border-primary shadow-sm ring-1 ring-primary/20' : 'bg-surface-100/60 border-surface-200 hover:bg-surface-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-ink">{p.name}</div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {p.currency} {p.price} / {p.period}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.badge && <span className="badge bg-accent/10 text-accent font-bold text-[10px]">{p.badge}</span>}
                  <span className="btn-primary text-xs py-1.5 px-4">{loading ? '…' : 'Select'}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="absolute top-3 right-3 text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
