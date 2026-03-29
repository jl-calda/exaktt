// src/app/(app)/products/templates/TemplatesClient.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getLimits, atLimit } from '@/lib/limits'
import type { Plan } from '@prisma/client'
import { SAMPLE_SYSTEMS } from '@/lib/sample-systems'

interface Props {
  plan: Plan
  systemCount: number
}

export default function TemplatesClient({ plan, systemCount }: Props) {
  const router = useRouter()
  const limits = getLimits(plan)
  const systemsAtLimit = atLimit(systemCount, limits.maxSystems)

  const [sampLoading,    setSampLoading]    = useState<string | null>(null)
  const [showAllSamples, setShowAllSamples] = useState(false)
  const [sampleCategory, setSampleCategory] = useState<string | null>(null)

  const handleFromTemplate = async (templateKey: string) => {
    if (systemsAtLimit) { alert('System limit reached — upgrade to add more'); return }
    setSampLoading(templateKey)
    const res = await fetch('/api/mto/systems/from-template', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateKey }),
    })
    const { data, error } = await res.json()
    if (data)  router.push('/products/' + data.id)
    if (error) alert(error)
    setSampLoading(null)
  }

  const sampleCategories = Array.from(new Set(SAMPLE_SYSTEMS.map(s => s.category)))
  const filteredSamples  = sampleCategory
    ? SAMPLE_SYSTEMS.filter(s => s.category === sampleCategory)
    : SAMPLE_SYSTEMS
  const visibleSamples   = showAllSamples ? filteredSamples : filteredSamples.slice(0, 12)

  return (
    <div className="min-h-full px-4 py-4 md:px-6 md:py-5 space-y-4">
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title">Sample Systems</h2>
            <p className="text-xs text-ink-faint mt-0.5">
              Global templates available to all users — duplicate to your account to edit.
            </p>
          </div>
          <button onClick={() => setShowAllSamples(v => !v)} className="btn-ghost text-xs">
            {showAllSamples ? 'Show less' : `All ${SAMPLE_SYSTEMS.length} →`}
          </button>
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => { setSampleCategory(null); setShowAllSamples(false) }}
            className={`filter-pill ${sampleCategory === null ? 'active' : ''}`}>
            All <span className="opacity-60 ml-0.5">{SAMPLE_SYSTEMS.length}</span>
          </button>
          {sampleCategories.map(cat => (
            <button key={cat}
              onClick={() => { setSampleCategory(sampleCategory === cat ? null : cat); setShowAllSamples(false) }}
              className={`filter-pill ${sampleCategory === cat ? 'active' : ''}`}>
              {cat} <span className="opacity-60 ml-0.5">{SAMPLE_SYSTEMS.filter(s => s.category === cat).length}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {visibleSamples.map(s => (
            <div key={s.key} className="relative group/card">
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-0 z-20 w-64
                card p-3 shadow-float opacity-0 group-hover/card:opacity-100 transition-opacity duration-150">
                <div className="font-semibold text-xs text-ink mb-1">{s.label}</div>
                <div className="text-[11px] text-ink-faint leading-relaxed">{s.description}</div>
                <div className="absolute top-full left-4 w-2 h-2 overflow-hidden">
                  <div className="w-2 h-2 bg-surface-50 border-r border-b border-surface-200 rotate-45 -translate-y-1/2" />
                </div>
              </div>
            <button
              onClick={() => handleFromTemplate(s.key)}
              disabled={sampLoading === s.key || systemsAtLimit}
              className="card overflow-hidden flex flex-row w-full hover:shadow-panel hover:-translate-y-0.5 transition-all group disabled:opacity-50 p-0 text-left">
              {/* Left colour strip */}
              <div className="w-1 shrink-0 bg-surface-300" />
              {/* Icon */}
              <div className="flex items-center justify-center px-2.5 shrink-0 bg-surface-100">
                <span className="text-lg">{s.template.icon}</span>
              </div>
              {/* Text */}
              <div className="flex flex-col justify-center flex-1 min-w-0 px-3 py-2 gap-0.5 overflow-hidden">
                <div className="text-[11px] font-semibold text-ink leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                  {sampLoading === s.key ? 'Opening…' : s.label}
                </div>
                <div className="text-[10px] text-ink-faint leading-snug line-clamp-1">
                  {s.description}
                </div>
              </div>
              <div className="flex items-center pr-3 shrink-0 text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Open →
              </div>
            </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
