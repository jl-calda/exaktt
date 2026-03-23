// src/app/(app)/products/ProductsClient.tsx — Products hub
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Crown, Layers, Lock, Copy, BookOpen, ChevronRight, Trash2 } from 'lucide-react'
import { getLimits, atLimit } from '@/lib/limits'
import { formatDistanceToNow, format } from 'date-fns'
import type { Plan } from '@prisma/client'
import { SAMPLE_SYSTEMS } from '@/lib/sample-systems'

interface Props {
  user: {
    email: string
    name?: string | null
    plan: Plan
    profile?: { companyName?: string | null; companyLogo?: string | null } | null
  }
  initialSystems: any[]
  initialReports: any[]
}

const ICON_PRESETS = [
  { group: 'Safety & Access',    icons: ['🦺','🔗','⛑️','🚧','🪜','🧯'] },
  { group: 'Construction',       icons: ['🏗️','🧱','🪨','🔨','🪚','⚙️'] },
  { group: 'Roofing & Cladding', icons: ['🏠','🏢','☀️','🌧️','🪵','🏛️'] },
  { group: 'Mechanical & Elec.', icons: ['⚡','🔌','💡','🔧','🔩','📐'] },
  { group: 'General',            icons: ['📦','📋','🗂️','📊','🔖','🏷️'] },
]
const ALL_PRESET_ICONS = ICON_PRESETS.flatMap(g => g.icons)
const COLORS = ['#7917de','#0369a1','#059669','#dc2626','#b45309','#0891b2','#7c3aed','#be185d']

export default function ProductsClient({ user, initialSystems, initialReports }: Props) {
  const router = useRouter()
  const plan   = user.plan
  const limits = getLimits(plan)

  const [systems,      setSystems]     = useState(initialSystems)
  const [reports]                      = useState(initialReports)
  const [creating,        setCreating]       = useState(false)
  const [newName,         setNewName]        = useState('')
  const [newDesc,         setNewDesc]        = useState('')
  const [newIcon,         setNewIcon]        = useState('📦')
  const [newColor,        setNewColor]       = useState('#7917de')
  const [showIconPicker,  setShowIconPicker] = useState(false)
  const [customEmoji,     setCustomEmoji]    = useState('')
  const [loading,         setLoading]        = useState(false)
  const [duplicating,  setDuplicating]  = useState<string | null>(null)
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [confirmDel,   setConfirmDel]   = useState<{ id: string; name: string } | null>(null)
  const [sampLoading,    setSampLoading]    = useState<string | null>(null)
  const [showAllSamples, setShowAllSamples] = useState(false)
  const [sampleCategory, setSampleCategory] = useState<string | null>(null)

  const systemsAtLimit = atLimit(systems.length, limits.maxSystems)
  const totalJobs      = systems.reduce((acc, s) => acc + (s._count?.jobs ?? 0), 0)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || systemsAtLimit) return
    setLoading(true)
    const res = await fetch('/api/mto/systems', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined, icon: newIcon, color: newColor }),
    })
    const { data, error } = await res.json()
    if (data) { setSystems(s => [data, ...s]); setCreating(false); setNewName(''); setNewDesc(''); router.push('/products/' + data.id) }
    if (error) alert(error)
    setLoading(false)
  }

  const handleDuplicate = async (sysId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (systemsAtLimit) { alert('System limit reached — upgrade to duplicate'); return }
    setDuplicating(sysId)
    const src = await fetch('/api/mto/systems/' + sysId).then(r => r.json())
    if (!src.data) { setDuplicating(null); return }
    const { id: _id, createdAt: _c, updatedAt: _u, userId: _uid, ...rest } = src.data
    const res = await fetch('/api/mto/systems', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rest, name: rest.name + ' (Copy)' }),
    })
    const { data } = await res.json()
    if (data) setSystems(s => [data, ...s])
    setDuplicating(null)
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    setDeleting(confirmDel.id)
    setConfirmDel(null)
    await fetch('/api/mto/systems/' + confirmDel.id, { method: 'DELETE' })
    setSystems(s => s.filter(x => x.id !== confirmDel.id))
    setDeleting(null)
  }

  const handleFromTemplate = async (templateKey: string) => {
    if (systemsAtLimit) { alert('System limit reached — upgrade to add more'); return }
    setSampLoading(templateKey)
    const res = await fetch('/api/mto/systems/from-template', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateKey }),
    })
    const { data, error } = await res.json()
    if (data)  { setSystems(s => [data, ...s]); router.push('/products/' + data.id) }
    if (error) alert(error)
    setSampLoading(null)
  }

  const recentReports    = reports.slice(0, 5)
  const sampleCategories = Array.from(new Set(SAMPLE_SYSTEMS.map(s => s.category)))
  const filteredSamples  = sampleCategory
    ? SAMPLE_SYSTEMS.filter(s => s.category === sampleCategory)
    : SAMPLE_SYSTEMS
  const visibleSamples   = showAllSamples ? filteredSamples : filteredSamples.slice(0, 6)

  return (
    <div className="min-h-full px-6 py-5 space-y-8">

      {/* ── Stats strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Products',
            value: systems.length,
            sub:   plan === 'FREE' && limits.maxSystems !== -1
                     ? `${systems.length} / ${limits.maxSystems} used`
                     : null,
            icon:  <BookOpen className="w-3.5 h-3.5" />,
          },
          { label: 'Jobs saved', value: totalJobs,      sub: null, icon: <Layers className="w-3.5 h-3.5" /> },
          { label: 'Reports',    value: reports.length, sub: null, icon: <FileText className="w-3.5 h-3.5" /> },
          plan === 'FREE'
            ? { label: 'Upgrade', value: 'Pro', sub: 'Unlimited products', icon: <Crown className="w-3.5 h-3.5" />, upgrade: true }
            : { label: 'Plan', value: 'Pro', sub: 'All features unlocked', icon: <Crown className="w-3.5 h-3.5" />, upgrade: false },
        ].map((s: any) => (
          <div key={s.label}
            onClick={s.upgrade ? () => router.push('/billing') : undefined}
            className={`card p-4 ${s.upgrade ? 'cursor-pointer hover:shadow-panel hover:-translate-y-0.5 transition-all border-primary/20 bg-primary/5' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-ink-faint font-medium">{s.label}</span>
              <span className={s.upgrade ? 'text-primary' : 'text-ink-faint'}>{s.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${s.upgrade ? 'text-primary' : 'text-ink'}`}>{s.value}</div>
            {s.sub && <div className="text-[11px] text-ink-faint mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Your Products ────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
            Your Products <span className="font-normal normal-case ml-1">{systems.length}</span>
          </h2>
          {systemsAtLimit ? (
            <button onClick={() => router.push('/billing')}
              className="btn-secondary text-xs flex items-center gap-1.5 text-primary border-primary/30">
              <Lock className="w-3.5 h-3.5" /> Upgrade to add more
            </button>
          ) : (
            <button onClick={() => setCreating(v => !v)} className="btn-primary text-xs">
              <Plus className="w-3.5 h-3.5" /> New Product
            </button>
          )}
        </div>

        {/* Create form */}
        {creating && (
          <div className="mb-4 animate-fade-in border border-secondary-200 bg-secondary-50/20 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
            <div className="px-4 py-2.5 bg-secondary-100 border-b border-secondary-200">
              <span className="text-xs font-semibold text-secondary-700">New Product</span>
            </div>
            <form onSubmit={handleCreate} className="p-4">
              {/* Main row */}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-40">
                  <label className="label !text-secondary-600">Product name *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder='e.g. "SecuRope Horizontal Lifeline"' className="input" autoFocus required
                    style={{ borderColor: 'var(--color-secondary-200)' }} />
                </div>
                <div className="flex-1 min-w-40">
                  <label className="label !text-secondary-600">Description</label>
                  <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                    placeholder='e.g. "Fallprotec EN 795-2012 Type C"' className="input"
                    style={{ borderColor: 'var(--color-secondary-200)' }} />
                </div>
                <div>
                  <label className="label !text-secondary-600">Icon</label>
                  <div className="flex items-center gap-1.5">
                    {/* Current icon */}
                    <div className="w-[30px] h-[30px] rounded-md flex items-center justify-center text-base shrink-0 border border-surface-300"
                      style={{ background: newColor + '18' }}>
                      {newIcon}
                    </div>
                    {/* Quick presets */}
                    {ALL_PRESET_ICONS.slice(0, 10).map(i => (
                      <button key={i} type="button" onClick={() => setNewIcon(i)}
                        className={`w-[26px] h-[26px] rounded-md text-sm flex items-center justify-center transition-all ${newIcon === i ? 'ring-2 ring-primary bg-primary/10' : 'bg-surface-100 hover:bg-surface-200'}`}>
                        {i}
                      </button>
                    ))}
                    <button type="button" onClick={() => setShowIconPicker(v => !v)}
                      className="text-[11px] text-primary hover:underline whitespace-nowrap px-1">
                      {showIconPicker ? '↑' : '···'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label !text-secondary-600">Colour</label>
                  <div className="flex gap-1.5">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setNewColor(c)}
                        style={{ background: c, outline: newColor === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }}
                        className="w-5 h-5 rounded-md transition-all" />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={loading || !newName.trim()} className="btn-primary text-xs">
                    {loading ? 'Creating…' : 'Create'}
                  </button>
                  <button type="button" onClick={() => { setCreating(false); setNewName(''); setNewDesc(''); setShowIconPicker(false) }}
                    className="btn-secondary text-xs">Cancel</button>
                </div>
              </div>

              {/* Expanded icon picker */}
              {showIconPicker && (
                <div className="mt-3 pt-3 border-t border-surface-200 flex flex-wrap gap-4">
                  {ICON_PRESETS.map(group => (
                    <div key={group.group}>
                      <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-1">{group.group}</div>
                      <div className="flex gap-1">
                        {group.icons.map(i => (
                          <button key={i} type="button" onClick={() => { setNewIcon(i); setShowIconPicker(false) }}
                            className={`w-[26px] h-[26px] rounded-md text-sm flex items-center justify-center transition-all ${newIcon === i ? 'ring-2 ring-primary bg-primary/10' : 'bg-surface-100 hover:bg-surface-200'}`}>
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-1">Custom</div>
                    <div className="flex gap-1.5 items-center">
                      <input value={customEmoji} onChange={e => setCustomEmoji(e.target.value)}
                        placeholder="Emoji…" maxLength={2}
                        className="input w-16 text-center text-base px-1" />
                      <button type="button"
                        onClick={() => { if (customEmoji.trim()) { setNewIcon(customEmoji.trim()); setShowIconPicker(false); setCustomEmoji('') } }}
                        disabled={!customEmoji.trim()} className="btn-secondary text-xs">Use</button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {systems.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="text-4xl mb-3">📐</div>
            <h3 className="font-semibold text-sm text-ink mb-1">No products yet</h3>
            <p className="text-xs text-ink-muted mb-4 max-w-xs mx-auto">
              Create your first product to start building material take-offs, or duplicate a sample below.
            </p>
            <button onClick={() => setCreating(true)} className="btn-primary text-xs mx-auto">
              <Plus className="w-3.5 h-3.5" /> Create first product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {systems.map(sys => (
              <div key={sys.id} className="card p-4 text-left hover:shadow-panel hover:-translate-y-0.5 transition-all group relative">
                <button className="absolute inset-0 rounded-2xl" onClick={() => router.push('/products/' + sys.id)} />
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: sys.color + '18', border: `1.5px solid ${sys.color}30` }}>
                    {sys.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-ink group-hover:text-primary transition-colors truncate">{sys.name}</div>
                  </div>
                  <div className="relative z-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => handleDuplicate(sys.id, e)} disabled={duplicating === sys.id}
                      title="Duplicate" className="p-1 rounded-md text-ink-faint hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-40">
                      <Copy className="w-3 h-3" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDel({ id: sys.id, name: sys.name }) }}
                      disabled={deleting === sys.id}
                      title="Delete" className="p-1 rounded-md text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-ink-faint">
                  <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{sys._count?.jobs ?? 0} jobs</span>
                  <span suppressHydrationWarning>· {formatDistanceToNow(new Date(sys.updatedAt), { addSuffix: true })}</span>
                </div>
              </div>
            ))}

            {/* New Product ghost card */}
            {!systemsAtLimit && (
              <button onClick={() => setCreating(true)}
                className="card p-4 border-dashed flex flex-col items-center justify-center gap-1.5 text-ink-faint hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all min-h-[88px]">
                <Plus className="w-4 h-4" />
                <span className="text-xs font-medium">New Product</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Recent Reports ───────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
            Recent Reports <span className="font-normal normal-case ml-1">{reports.length}</span>
          </h2>
        </div>

        {recentReports.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-3xl mb-2">📄</div>
            <p className="text-xs text-ink-muted max-w-xs mx-auto">
              Open a product, run a calculation, then click <strong>Generate Report</strong> to create your first PDF take-off.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-100 border-b border-surface-200">
                  <th className="text-left px-4 py-2.5 font-semibold text-ink-muted text-xs">Report</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted text-xs">Product</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted text-xs">Date</th>
                  <th className="px-3 py-2.5 w-16" />
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r: any, i: number) => (
                  <tr key={r.id} className={i % 2 === 0 ? 'bg-surface-50' : 'bg-surface-100/50'}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-ink text-xs">{r.title}</div>
                      {r.jobRef && <div className="text-[11px] text-ink-faint">{r.jobRef}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted">
                      {r.mtoSystem?.icon} {r.mtoSystem?.name}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted" suppressHydrationWarning>
                      {format(new Date(r.reportDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-3 py-2.5">
                      <a href={`/api/mto/reports/${r.id}/pdf`} target="_blank"
                        className="btn-ghost text-xs py-1 px-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Sample Systems ───────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Sample Systems</h2>
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
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
              sampleCategory === null
                ? 'bg-ink text-surface-50 border-ink'
                : 'bg-surface-50 text-ink-faint border-surface-200 hover:border-surface-300 hover:text-ink-muted'
            }`}>
            All <span className="opacity-60 ml-0.5">{SAMPLE_SYSTEMS.length}</span>
          </button>
          {sampleCategories.map(cat => (
            <button key={cat}
              onClick={() => { setSampleCategory(sampleCategory === cat ? null : cat); setShowAllSamples(false) }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                sampleCategory === cat
                  ? 'bg-ink text-surface-50 border-ink'
                  : 'bg-surface-50 text-ink-faint border-surface-200 hover:border-surface-300 hover:text-ink-muted'
              }`}>
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
              <div className="w-1 shrink-0" style={{ background: s.template.color ?? '#7917de' }} />
              {/* Icon */}
              <div className="flex items-center justify-center px-2.5 shrink-0"
                style={{ background: (s.template.color ?? '#7917de') + '10' }}>
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

      {/* ── Delete confirmation modal ────────────────────────────── */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in"
          onClick={() => setConfirmDel(null)}>
          <div className="card p-6 w-full max-w-sm mx-4 shadow-float" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-ink">Delete product?</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  <span className="font-medium text-ink">"{confirmDel.name}"</span> and all its jobs will be permanently deleted. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDel(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="btn-primary text-xs !bg-red-500 hover:!bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
