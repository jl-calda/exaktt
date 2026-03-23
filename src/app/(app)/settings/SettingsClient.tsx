// src/app/settings/SettingsClient.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Tag, User2, Save, Crown, Palette, Sun, Moon, Monitor } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { CompanyProfile, GlobalTag } from '@/types'
import type { Plan } from '@prisma/client'
import { getLimits, PLAN_META } from '@/lib/limits'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/ThemeProvider'
import { THEME_PRESETS } from '@/lib/theme'

type Tab = 'company' | 'tags' | 'appearance' | 'account'

const TAG_COLORS = ['#7c3aed','#0891b2','#059669','#dc2626','#b45309','#be185d','#4f46e5','#0369a1','#64748b','#f59e0b']

interface Props {
  user:           { id: string; email: string; name?: string | null; subscription?: { plan: Plan } | null }
  initialProfile: CompanyProfile | null
  initialTags:    GlobalTag[]
}

export default function SettingsClient({ user, initialProfile, initialTags }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const plan     = user.subscription?.plan ?? 'FREE'
  const limits   = getLimits(plan)
  const { theme, isDark, setTheme, setDark } = useTheme()

  const [tab,     setTab]     = useState<Tab>('company')
  const [profile, setProfile] = useState<CompanyProfile>(initialProfile ?? {
    id: '', userId: '', registrationLabel: '', defaultShowPricing: false,
    country: 'Singapore', defaultCurrency: 'SGD', reportLogoPosition: 'left', reportAccentColor: '#0f172a',
  })
  const [tags,       setTags]       = useState<GlobalTag[]>(initialTags)
  const [saving,     setSaving]     = useState(false)
  const [saveMsg,    setSaveMsg]    = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor,setNewTagColor]= useState('#7c3aed')

  const showSaved = (msg = 'Saved') => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 2500) }

  const saveProfile = async () => {
    setSaving(true)
    await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) })
    setSaving(false); showSaved('Profile saved')
  }

  const saveTags = async (updated: GlobalTag[]) => {
    await fetch('/api/tags', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: updated }) })
  }

  const addTag = () => {
    if (!newTagName.trim()) return
    const updated = [...tags, { id: nanoid(), name: newTagName.trim(), color: newTagColor, order: tags.length }]
    setTags(updated); saveTags(updated)
    setNewTagName(''); setNewTagColor('#7c3aed')
  }

  const removeTag = (id: string) => {
    const updated = tags.filter(t => t.id !== id)
    setTags(updated); saveTags(updated)
  }

  const set = (k: keyof CompanyProfile) => (v: any) => setProfile(p => ({ ...p, [k]: v }))

  const TABS = [
    { id: 'company'    as Tab, label: 'Company Profile', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'tags'       as Tab, label: 'Material Tags',   icon: <Tag       className="w-3.5 h-3.5" /> },
    { id: 'appearance' as Tab, label: 'Appearance',      icon: <Palette   className="w-3.5 h-3.5" /> },
    { id: 'account'    as Tab, label: 'Account',         icon: <User2     className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="min-h-full">
      <main className="px-6 py-5 flex gap-6">
        {saveMsg && (
          <div className="fixed top-[5.5rem] right-4 z-50 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-card">
            {saveMsg}
          </div>
        )}
        {/* Sidebar */}
        <nav className="w-44 flex-shrink-0 space-y-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${tab === t.id ? 'bg-primary text-white' : 'text-ink-muted hover:bg-surface-200 hover:text-ink'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ── Company Profile ─────────────────────────────────── */}
          {tab === 'company' && (
            <div className="space-y-5">
              {!limits.canBrandReports && (
                <div className="card p-4 flex items-center gap-3 bg-primary/5 border-primary/20">
                  <Crown className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 text-sm text-ink">Company branding on reports requires <strong>Pro or Max</strong> plan.</div>
                  <button onClick={() => router.push('/billing')} className="btn-primary text-xs py-1.5 px-3">Upgrade</button>
                </div>
              )}

              <div className="card p-6 space-y-4">
                <h2 className="font-semibold text-[13px] text-ink">Company Identity</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Company Name</label>
                    <input value={profile.companyName ?? ''} onChange={e => set('companyName')(e.target.value)} className="input" placeholder="Acme QS Consultants" />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input value={profile.phone ?? ''} onChange={e => set('phone')(e.target.value)} className="input" placeholder="+65 1234 5678" />
                  </div>
                  <div>
                    <label className="label">Website</label>
                    <input value={profile.website ?? ''} onChange={e => set('website')(e.target.value)} className="input" placeholder="www.yourfirm.com" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Address</label>
                    <input value={profile.address ?? ''} onChange={e => set('address')(e.target.value)} className="input" placeholder="123 Orchard Road" />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input value={profile.city ?? ''} onChange={e => set('city')(e.target.value)} className="input" placeholder="Singapore" />
                  </div>
                  <div>
                    <label className="label">Country</label>
                    <input value={profile.country ?? ''} onChange={e => set('country')(e.target.value)} className="input" />
                  </div>
                </div>
              </div>

              <div className="card p-6 space-y-4">
                <h2 className="font-semibold text-[13px] text-ink">Professional Registration</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Label (e.g. UEN, ABN)</label>
                    <input value={profile.registrationLabel ?? ''} onChange={e => set('registrationLabel')(e.target.value)} className="input" placeholder="UEN" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Registration Number</label>
                    <input value={profile.registrationNumber ?? ''} onChange={e => set('registrationNumber')(e.target.value)} className="input" placeholder="202312345A" />
                  </div>
                  <div className="col-span-3">
                    <label className="label">QS Licence Number</label>
                    <input value={profile.qs_license ?? ''} onChange={e => set('qs_license')(e.target.value)} className="input" placeholder="QS/2024/12345" />
                  </div>
                </div>
              </div>

              <div className="card p-6 space-y-4">
                <h2 className="font-semibold text-[13px] text-ink">Report Defaults</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Default Prepared By</label>
                    <input value={profile.defaultPreparedBy ?? ''} onChange={e => set('defaultPreparedBy')(e.target.value)} className="input" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="label">Default Currency</label>
                    <select value={profile.defaultCurrency} onChange={e => set('defaultCurrency')(e.target.value)} className="input">
                      {['SGD','USD','AUD','GBP','EUR','MYR','THB'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Logo Position</label>
                    <select value={profile.reportLogoPosition} onChange={e => set('reportLogoPosition')(e.target.value)} className="input">
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Report Accent Colour</label>
                    <input type="color" value={profile.reportAccentColor} onChange={e => set('reportAccentColor')(e.target.value)}
                      className="h-10 w-full rounded-lg border border-surface-300 p-1 cursor-pointer" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Default Disclaimer</label>
                    <textarea value={profile.defaultDisclaimer ?? ''} onChange={e => set('defaultDisclaimer')(e.target.value)}
                      rows={3} className="input resize-none"
                      placeholder="This take-off is based on design drawings dated... Quantities are approximate..." />
                  </div>
                </div>
              </div>

              <button onClick={saveProfile} disabled={saving}
                className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          )}

          {/* ── Material Tags ────────────────────────────────────── */}
          {tab === 'tags' && (
            <div className="space-y-5">
              {!limits.tags && (
                <div className="card p-4 flex items-center gap-3 bg-primary/5 border-primary/20">
                  <Crown className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 text-sm text-ink">Material tags require <strong>Pro or Max</strong> plan.</div>
                  <button onClick={() => router.push('/billing')} className="btn-primary text-xs py-1.5 px-3">Upgrade</button>
                </div>
              )}

              <div className="card p-6">
                <h2 className="font-semibold text-[13px] text-ink mb-1">Material Tags</h2>
                <p className="text-sm text-ink-muted mb-5">Tags categorise materials across all systems — e.g. "FHLL", "structural", "hot-dip-galv".</p>

                {/* Add tag */}
                <div className="flex flex-wrap gap-3 items-end p-4 bg-surface-100 rounded-xl border border-surface-300 mb-5">
                  <div className="flex-1 min-w-36">
                    <label className="label">New tag</label>
                    <input value={newTagName} onChange={e => setNewTagName(e.target.value)}
                      placeholder='e.g. "structural"'
                      className="input" onKeyDown={e => { if (e.key === 'Enter') addTag() }}
                      disabled={!limits.tags} />
                  </div>
                  <div>
                    <label className="label">Colour</label>
                    <div className="flex gap-2 flex-wrap">
                      {TAG_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setNewTagColor(c)} disabled={!limits.tags}
                          style={{ background: c, outline: newTagColor === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }}
                          className="w-6 h-6 rounded-md transition-all disabled:opacity-40" />
                      ))}
                    </div>
                  </div>
                  <button onClick={addTag} disabled={!limits.tags || !newTagName.trim()} className="btn-primary">Add</button>
                </div>

                {/* Tag chips preview */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {tags.map(t => (
                      <span key={t.id} style={{ background: t.color + '18', color: t.color, borderColor: t.color + '40' }}
                        className="badge border rounded-full px-3 py-1 text-sm font-bold">
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Tag list */}
                <div className="space-y-2">
                  {tags.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-surface-300 bg-surface-50">
                      <span style={{ background: t.color }} className="w-3 h-3 rounded-full flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium text-ink">{t.name}</span>
                      <button onClick={() => removeTag(t.id)} className="text-xs text-red-400 hover:text-red-600 font-semibold">Remove</button>
                    </div>
                  ))}
                  {tags.length === 0 && <p className="text-sm text-ink-faint text-center py-6">No tags yet.</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── Appearance ───────────────────────────────────────── */}
          {tab === 'appearance' && (
            <div className="space-y-5">

              {/* Light / Dark */}
              <div className="card p-5">
                <h2 className="font-semibold text-[13px] text-ink mb-4">Mode</h2>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { label: 'Light', icon: <Sun  className="w-4 h-4" />, value: false },
                    { label: 'Dark',  icon: <Moon className="w-4 h-4" />, value: true  },
                  ] as const).map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => setDark(opt.value)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                        isDark === opt.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-surface-200 text-ink-muted hover:border-surface-300'
                      }`}>
                      {opt.icon}
                      <span className="font-medium text-[13px]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color preset */}
              <div className="card p-5">
                <h2 className="font-semibold text-[13px] text-ink mb-1">Color Preset</h2>
                <p className="text-[12px] text-ink-faint mb-4">Changes the accent color and surface tones across the app.</p>
                <div className="grid grid-cols-2 gap-3">
                  {THEME_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setTheme(preset.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${
                        theme === preset.id
                          ? 'border-primary bg-primary/5'
                          : 'border-surface-200 hover:border-surface-300'
                      }`}>
                      {/* Swatch */}
                      <div className="flex gap-1 shrink-0">
                        <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.accent }} />
                        <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.surface }} />
                      </div>
                      <div className="min-w-0">
                        <div className={`font-semibold text-[13px] ${theme === preset.id ? 'text-primary' : 'text-ink'}`}>
                          {preset.name}
                        </div>
                        <div className="text-[11px] text-ink-faint truncate">{preset.description}</div>
                      </div>
                      {theme === preset.id && (
                        <div className="ml-auto w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--color-primary)' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Account ──────────────────────────────────────────── */}
          {tab === 'account' && (
            <div className="space-y-5">
              <div className="card p-6">
                <h2 className="font-semibold text-[13px] text-ink mb-4">Account</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-surface-200">
                    <span className="text-ink-muted">Email</span>
                    <span className="text-ink font-medium">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-surface-200">
                    <span className="text-ink-muted">Plan</span>
                    <span className="font-bold" style={{ color: PLAN_META[plan].color }}>{PLAN_META[plan].name}</span>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="font-semibold text-[13px] text-ink mb-4 text-red-600">Danger Zone</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-ink">Sign out</div>
                    <div className="text-xs text-ink-faint">Sign out of your account on this device</div>
                  </div>
                  <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
                    className="btn-secondary text-sm">Sign out</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
