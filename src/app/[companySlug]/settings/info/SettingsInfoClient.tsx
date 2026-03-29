'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Crown } from 'lucide-react'
import type { CompanyProfile } from '@/types'
import type { Plan } from '@prisma/client'
import { getLimits } from '@/lib/limits'
import { Select } from '@/components/ui/Select'

const COUNTRIES = [
  'Australia', 'Canada', 'China', 'India', 'Indonesia', 'Japan', 'Malaysia',
  'New Zealand', 'Philippines', 'Singapore', 'South Korea', 'Thailand',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam',
].map(c => ({ value: c, label: c }))

interface Props {
  initialProfile: CompanyProfile | null
  plan: Plan
}

export default function SettingsInfoClient({ initialProfile, plan }: Props) {
  const router = useRouter()
  const limits = getLimits(plan)

  const [profile, setProfile] = useState<CompanyProfile>(initialProfile ?? {
    id: '', userId: '', registrationLabel: '', defaultShowPricing: false,
    country: 'Singapore', defaultCurrency: 'SGD', reportLogoPosition: 'left', reportAccentColor: '#0f172a',
  })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const showSaved = (msg = 'Saved') => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 2500) }

  const saveProfile = async () => {
    setSaving(true)
    await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) })
    setSaving(false); showSaved('Profile saved')
  }

  const set = (k: keyof CompanyProfile) => (v: any) => setProfile(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">
      {saveMsg && (
        <div className="fixed top-[5.5rem] right-4 z-50 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-card">
          {saveMsg}
        </div>
      )}

      {!limits.canBrandReports && (
        <div className="card p-4 flex items-center gap-3 bg-primary/5 border-primary/20">
          <span className="w-8 h-8 rounded-lg bg-surface-200/40 flex items-center justify-center flex-shrink-0">
            <Crown className="w-4 h-4 text-primary" />
          </span>
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
            <Select options={COUNTRIES} value={profile.country ?? ''} onChange={e => set('country')(e.target.value)} />
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
        {saving ? 'Saving\u2026' : 'Save Profile'}
      </button>
    </div>
  )
}
