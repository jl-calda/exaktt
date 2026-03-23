// src/components/dashboard/SampleSystemsGuide.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { SAMPLE_SYSTEMS } from '@/lib/sample-systems'

interface Props {
  onCreated: (system: any) => void
  atLimit:   boolean
}

const FEATURE_COLORS: Record<string, { bg: string; text: string }> = {
  'Custom Dim':     { bg: '#ede9fe', text: '#7c3aed' },
  'Custom Criteria':{ bg: '#fef3c7', text: '#b45309' },
  'Warning':        { bg: '#fee2e2', text: '#dc2626' },
  'Variant':        { bg: '#dbeafe', text: '#1d4ed8' },
  'Custom Bracket': { bg: '#dcfce7', text: '#16a34a' },
}

const RULE_COLORS: Record<string, { bg: string; text: string }> = {
  linear_metre:     { bg: '#dbeafe', text: '#1d4ed8' },
  ratio:            { bg: '#f3e8ff', text: '#7c3aed' },
  ratio_length:     { bg: '#e0f2fe', text: '#0369a1' },
  base_plus_length: { bg: '#fef3c7', text: '#b45309' },
  fixed_qty:        { bg: '#f0fdf4', text: '#15803d' },
  stock_length_qty: { bg: '#fce7f3', text: '#be185d' },
  coverage_per_item:{ bg: '#fff7ed', text: '#c2410c' },
  tile_size:        { bg: '#fef9c3', text: '#854d0e' },
  kg_per_sqm:       { bg: '#f0fdf4', text: '#166534' },
  ratio_area:       { bg: '#ecfeff', text: '#0e7490' },
}

const CATEGORY_ICONS: Record<string, string> = {
  'Fall Protection':    '🦺',
  'Solar & Electrical': '☀️',
  'Coating & Finishing':'🎨',
  'Joinery & Interiors':'🪵',
  'Civil & Structural': '🌉',
  'Cladding & Roofing': '🏠',
}

export default function SampleSystemsGuide({ onCreated, atLimit }: Props) {
  const router    = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(SAMPLE_SYSTEMS.map(s => s.category)))

  const filtered = activeCategory
    ? SAMPLE_SYSTEMS.filter(s => s.category === activeCategory)
    : SAMPLE_SYSTEMS

  const handleCreate = async (templateKey: string) => {
    if (atLimit) { setError('You\'ve reached your system limit — upgrade to add more systems.'); return }
    setLoading(templateKey); setError(null)
    const res = await fetch('/api/mto/systems/from-template', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateKey }),
    })
    const { data, error: err } = await res.json()
    if (data)  { onCreated(data); router.push('/products/' + data.id) }
    if (err)   { setError(String(err)) }
    setLoading(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-lg text-ink mb-1">Sample Systems</h2>
        <p className="text-sm text-ink-muted">
          Ready-made templates covering common industries. Each demonstrates custom dimensions, criteria, and variants.
          Create from a template then swap in your own product codes.
        </p>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            activeCategory === null ? 'bg-ink text-white border-ink' : 'bg-white text-ink-muted border-surface-300 hover:border-surface-400'
          }`}>
          All <span className="text-[10px] opacity-60">{SAMPLE_SYSTEMS.length}</span>
        </button>
        {categories.map(cat => (
          <button key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeCategory === cat ? 'bg-ink text-white border-ink' : 'bg-white text-ink-muted border-surface-300 hover:border-surface-400'
            }`}>
            {CATEGORY_ICONS[cat] ?? '📦'} {cat}
            <span className="text-[10px] opacity-60">{SAMPLE_SYSTEMS.filter(s => s.category === cat).length}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {error}
        </div>
      )}

      {/* Grid — grouped by category */}
      {(activeCategory ? [activeCategory] : categories).map(cat => {
        const items = filtered.filter(s => s.category === cat)
        if (!items.length) return null
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base leading-none">{CATEGORY_ICONS[cat] ?? '📦'}</span>
              <span className="font-bold text-sm text-ink">{cat}</span>
              <div className="flex-1 h-px bg-surface-200" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {items.map(s => (
                <div key={s.key} className="card flex flex-col overflow-hidden">
                  <div className="h-1.5 w-full" style={{ background: s.template.color ?? '#7917de' }} />
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: (s.template.color ?? '#7917de') + '18', border: `1.5px solid ${s.template.color ?? '#7917de'}30` }}>
                        {s.template.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-ink leading-tight">{s.label}</div>
                        <span className="badge bg-surface-100 text-ink-muted text-[10px] mt-1 inline-block">
                          {s.template.inputModel === 'linear_run' ? '🗺 Linear Run' : s.template.inputModel === 'area' ? '⬛ Area' : '📐 Simple Dims'}
                        </span>
                      </div>
                    </div>

                    {/* Feature tags */}
                    <div className="flex flex-wrap gap-1">
                      {s.featureTags.map(tag => {
                        const c = FEATURE_COLORS[tag] ?? { bg: '#f1f5f9', text: '#64748b' }
                        return (
                          <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: c.bg, color: c.text }}>
                            ✓ {tag}
                          </span>
                        )
                      })}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-ink-muted leading-relaxed">{s.description}</p>

                    {/* Highlights */}
                    <div className="flex-1 space-y-1.5 border-t border-surface-200 pt-3">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-ink-faint mb-2">What this demonstrates</div>
                      {s.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-ink">
                          <span className="text-primary mt-0.5 flex-shrink-0 font-bold">›</span>
                          <span className="leading-snug">{h}</span>
                        </div>
                      ))}
                    </div>

                    {/* Material chips */}
                    <div className="border-t border-surface-200 pt-3">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-ink-faint mb-2">Materials</div>
                      <div className="flex flex-wrap gap-1">
                        {(s.template.materials ?? []).slice(0, 8).map(m => {
                          const rt = m.ruleSet?.[0]?.ruleType ?? ''
                          const c  = RULE_COLORS[rt] ?? { bg: '#f1f5f9', text: '#64748b' }
                          return (
                            <span key={m.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: c.bg, color: c.text }}>
                              {m.name.split(' ').slice(0, 3).join(' ')}
                            </span>
                          )
                        })}
                        {(s.template.materials ?? []).length > 8 && (
                          <span className="text-[10px] text-ink-faint px-1.5 py-0.5">
                            +{(s.template.materials ?? []).length - 8} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => handleCreate(s.key)}
                      disabled={loading === s.key || atLimit}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white mt-auto"
                      style={{ background: loading === s.key ? '#94a3b8' : (s.template.color ?? '#7917de') }}>
                      {loading === s.key
                        ? <><span className="animate-spin inline-block">⏳</span> Creating…</>
                        : <><Plus className="w-3.5 h-3.5" /> Use this template</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <p className="text-xs text-ink-faint text-center pb-2">
        Templates are fully editable — replace product codes, adjust rules, and add your own materials.
      </p>
    </div>
  )
}
