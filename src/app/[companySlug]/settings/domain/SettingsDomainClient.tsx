'use client'
import { useState, useEffect } from 'react'
import { Globe, Check, AlertCircle, Loader2 } from 'lucide-react'

export default function SettingsDomainClient() {
  const [domain, setDomain] = useState('')
  const [verified, setVerified] = useState(false)
  const [slug, setSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/domain').then(r => r.json()).then(j => {
      if (j.data) {
        setDomain(j.data.customDomain ?? '')
        setVerified(j.data.domainVerified ?? false)
        setSlug(j.data.slug ?? '')
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/settings/domain', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customDomain: domain.trim().toLowerCase() || null }),
    })
    const { data, error } = await res.json()
    if (error) alert(error)
    if (data) {
      setDomain(data.customDomain ?? '')
      setVerified(data.domainVerified ?? false)
    }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-ink-faint" /></div>

  return (
    <div className="space-y-5">
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-[13px] text-ink">Custom Domain</h2>
        <p className="text-xs text-ink-muted">
          Set up a custom domain so your clients see your own brand when accessing reports and documents.
        </p>

        {slug && (
          <div className="bg-surface-100 rounded-lg px-3 py-2">
            <div className="text-[10px] text-ink-faint uppercase tracking-wide font-bold mb-1">Default URL</div>
            <div className="text-xs text-ink font-mono">exaktt.com/{slug}</div>
          </div>
        )}

        <div>
          <label className="label">Custom Domain</label>
          <input
            value={domain}
            onChange={e => setDomain(e.target.value)}
            className="input"
            placeholder="estimates.yourcompany.com"
          />
        </div>

        {domain && (
          <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
            verified
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}>
            {verified ? (
              <>
                <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>Domain verified and active</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">DNS configuration required</div>
                  <div className="mt-1 text-[11px]">
                    Add a CNAME record pointing <span className="font-mono font-bold">{domain}</span> to <span className="font-mono font-bold">domains.exaktt.com</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
        <Globe className="w-4 h-4" />
        {saving ? 'Saving...' : 'Save Domain'}
      </button>
    </div>
  )
}
