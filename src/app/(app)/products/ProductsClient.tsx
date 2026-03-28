// src/app/(app)/products/ProductsClient.tsx — Products dashboard (grid + create)
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Layers, Lock, Copy, Trash2 } from 'lucide-react'
import { getLimits, atLimit } from '@/lib/limits'
import { formatDistanceToNow } from 'date-fns'
import type { Plan } from '@prisma/client'

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

  return (
    <div className="min-h-full px-4 py-4 md:px-6 md:py-5 space-y-6 md:space-y-8">

      {/* ── Stats strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Products',
            value: systems.length,
            sub:   plan === 'FREE' && limits.maxSystems !== -1
                     ? `${systems.length} / ${limits.maxSystems} used`
                     : null,
            hero:  true,
            well:  'bg-emerald-100 text-emerald-600',
          },
          { label: 'Jobs saved', value: totalJobs, sub: null, hero: false, well: 'bg-blue-100 text-blue-600' },
          { label: 'Reports', value: initialReports.length, sub: null, hero: false, well: 'bg-amber-100 text-amber-600' },
        ].map((s: any) => (
          <div key={s.label}
            className={s.hero
              ? 'card p-4 bg-primary border-transparent'
              : 'card p-4'}>
            <div className="flex items-center justify-between mb-2">
              <span className={s.hero ? 'text-xs text-white/70 font-medium' : 'text-xs text-ink-faint font-medium'}>{s.label}</span>
              <span className={s.hero
                ? 'w-6 h-6 rounded-lg flex items-center justify-center bg-white/20 text-white'
                : `w-6 h-6 rounded-lg flex items-center justify-center ${s.well}`}>
                <Layers className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className={s.hero ? 'text-2xl font-bold text-white' : 'text-2xl font-bold text-ink'}>{s.value}</div>
            {s.sub && <div className={s.hero ? 'text-[11px] text-white/60 mt-0.5' : 'text-[11px] text-ink-faint mt-0.5'}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Your Products ────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">
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
          <div className="mb-4 animate-fade-in border border-surface-200/60 bg-surface-50 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
            <div className="card-header">
              <span className="text-xs font-semibold text-ink">New Product</span>
            </div>
            <form onSubmit={handleCreate} className="p-4">
              {/* Main row */}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-40">
                  <label className="label">Product name *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder='e.g. "SecuRope Horizontal Lifeline"' className="input" autoFocus required
 />
                </div>
                <div className="flex-1 min-w-40">
                  <label className="label">Description</label>
                  <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                    placeholder='e.g. "Fallprotec EN 795-2012 Type C"' className="input"
 />
                </div>
                <div>
                  <label className="label">Icon</label>
                  <div className="flex items-center gap-1.5">
                    {/* Current icon */}
                    <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-base shrink-0 shadow-sm bg-surface-200/40">
                      {newIcon}
                    </div>
                    {/* Quick presets */}
                    {ALL_PRESET_ICONS.slice(0, 10).map(i => (
                      <button key={i} type="button" onClick={() => setNewIcon(i)}
                        className={`w-[26px] h-[26px] rounded-md text-sm flex items-center justify-center transition-all ${newIcon === i ? 'ring-2 ring-primary bg-surface-50' : 'bg-surface-100 hover:bg-surface-200'}`}>
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
                  <label className="label">Colour</label>
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
                            className={`w-[26px] h-[26px] rounded-md text-sm flex items-center justify-center transition-all ${newIcon === i ? 'ring-2 ring-primary bg-surface-50' : 'bg-surface-100 hover:bg-surface-200'}`}>
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
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 shadow-sm bg-surface-200/40">
                    {sys.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-ink group-hover:text-primary transition-colors truncate">{sys.name}</div>
                  </div>
                  <div className="relative z-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => handleDuplicate(sys.id, e)} disabled={duplicating === sys.id}
                      title="Duplicate" className="p-1 rounded-md text-ink-faint hover:text-primary hover:bg-surface-100 transition-colors disabled:opacity-40">
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
