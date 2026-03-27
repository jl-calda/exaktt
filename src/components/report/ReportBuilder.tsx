// src/components/report/ReportBuilder.tsx
'use client'
import { useState } from 'react'
import { FileText, Download, Share2, Eye, Crown } from 'lucide-react'
import type { MtoSystem, MultiRunCombined, Run, CompanyProfile } from '@/types'
import type { Plan } from '@prisma/client'
import { getLimits, PLAN_META } from '@/lib/limits'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface Props {
  sys:      MtoSystem
  jobId?:   string
  results:  MultiRunCombined[]
  runs:     Run[]
  plan:     Plan
  profile?: CompanyProfile | null
  onClose?: () => void
}

export default function ReportBuilder({ sys, jobId, results, runs, plan, profile, onClose }: Props) {
  const router  = useRouter()
  const limits  = getLimits(plan)

  const [config, setConfig] = useState({
    title:        sys.name + ' — Material Take-Off',
    jobReference: '',
    preparedBy:   profile?.defaultPreparedBy ?? '',
    preparedFor:  '',
    reportDate:   format(new Date(), 'yyyy-MM-dd'),
    revisionNo:   'A',
    notes:        '',
    showPricing:  false,
    showStockInfo:false,
    currency:     profile?.defaultCurrency ?? 'SGD',
  })

  const [generating, setGenerating] = useState(false)
  const [sharing,    setSharing]    = useState(false)
  const [reportId,   setReportId]   = useState<string | null>(null)
  const [shareUrl,   setShareUrl]   = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  const set = (k: keyof typeof config) => (v: any) => setConfig(c => ({ ...c, [k]: v }))

  const generateReport = async () => {
    setGenerating(true); setError(null)
    const res = await fetch('/api/mto/reports', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        systemId:       sys.id,
        jobId:          jobId ?? null,
        ...config,
        companyName:    profile?.companyName,
        companyLogo:    profile?.companyLogo,
        showPricing:    limits.pricing   ? config.showPricing  : false,
        showStockInfo:  limits.stockInfo ? config.showStockInfo: false,
        resultsSnapshot: results,
        systemSnapshot:  sys,
      }),
    })
    const { data, error: err } = await res.json()
    if (err) { setError(err); setGenerating(false); return }
    setReportId(data.id)
    setGenerating(false)
    // Trigger PDF download
    window.open(`/api/reports/${data.id}/pdf`, '_blank')
  }

  const shareReport = async () => {
    if (!reportId) return
    setSharing(true)
    const res = await fetch(`/api/reports/${reportId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ _action: 'publish' }),
    })
    const { data, error: err } = await res.json()
    if (err) { setError(err); setSharing(false); return }
    setShareUrl(`${window.location.origin}/report/${data.shareToken}`)
    setSharing(false)
  }

  const activeResults = results.filter(m => !m.allBlocked && m.grandTotal > 0)
  const grandCost = config.showPricing
    ? activeResults.reduce((sum, mat) => sum + ((mat as any).spec?.unitPrice ?? 0) * mat.grandTotal, 0)
    : 0

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-h-[90vh] overflow-auto">

      {/* ── Left: Config ─────────────────────────────────────────── */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
        <div className="font-display font-bold text-base text-ink">📄 Generate Report</div>

        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide">Report Details</h3>
          <div>
            <label className="label">Title</label>
            <input value={config.title} onChange={e => set('title')(e.target.value)} className="input text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Job Reference</label>
              <input value={config.jobReference} onChange={e => set('jobReference')(e.target.value)} className="input text-sm" placeholder="T2024-001" />
            </div>
            <div>
              <label className="label">Revision</label>
              <input value={config.revisionNo} onChange={e => set('revisionNo')(e.target.value)} className="input text-sm" placeholder="A" />
            </div>
          </div>
          <div>
            <label className="label">Prepared By</label>
            <input value={config.preparedBy} onChange={e => set('preparedBy')(e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="label">Prepared For (Client)</label>
            <input value={config.preparedFor} onChange={e => set('preparedFor')(e.target.value)} className="input text-sm" placeholder="Client name" />
          </div>
          <div>
            <label className="label">Report Date</label>
            <input type="date" value={config.reportDate} onChange={e => set('reportDate')(e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="label">Notes / Assumptions</label>
            <textarea value={config.notes} onChange={e => set('notes')(e.target.value)}
              rows={3} className="input text-sm resize-none"
              placeholder="Quantities based on design drawings dated..." />
          </div>
        </div>

        {/* Pro+ options */}
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide">Content Options</h3>

          {/* Pricing */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-ink">Show Pricing</div>
              <div className="text-xs text-ink-faint">Unit price + total cost columns</div>
            </div>
            {limits.pricing ? (
              <button onClick={() => set('showPricing')(!config.showPricing)}
                className={`relative w-10 h-5 rounded-full transition-colors ${config.showPricing ? 'bg-primary' : 'bg-surface-300'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${config.showPricing ? 'left-5' : 'left-0.5'}`} />
              </button>
            ) : (
              <button onClick={() => router.push('/billing')}
                className="flex items-center gap-1 text-xs text-primary font-semibold">
                <Crown className="w-3 h-3" /> Pro
              </button>
            )}
          </div>

          {/* Stock info */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-ink">Show Stock Info</div>
              <div className="text-xs text-ink-faint">Stock length, storage length</div>
            </div>
            {limits.stockInfo ? (
              <button onClick={() => set('showStockInfo')(!config.showStockInfo)}
                className={`relative w-10 h-5 rounded-full transition-colors ${config.showStockInfo ? 'bg-primary' : 'bg-surface-300'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${config.showStockInfo ? 'left-5' : 'left-0.5'}`} />
              </button>
            ) : (
              <button onClick={() => router.push('/billing')}
                className="flex items-center gap-1 text-xs text-primary font-semibold">
                <Crown className="w-3 h-3" /> Pro
              </button>
            )}
          </div>

          {/* Currency */}
          {config.showPricing && limits.pricing && (
            <div>
              <label className="label">Currency</label>
              <select value={config.currency} onChange={e => set('currency')(e.target.value)} className="input text-sm">
                {['SGD','USD','AUD','GBP','EUR','MYR'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Branding preview */}
        {profile?.companyName && (
          <div className="card p-4 bg-surface-50">
            <div className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Branding</div>
            {limits.canBrandReports ? (
              <div className="flex items-center gap-2 text-sm">
                {profile.companyLogo && (
                  <img src={profile.companyLogo} alt="logo" className="h-8 object-contain" />
                )}
                <span className="font-semibold text-ink">{profile.companyName}</span>
              </div>
            ) : (
              <div className="text-xs text-ink-faint">
                Upgrade to Pro to include your company logo and branding.
              </div>
            )}
          </div>
        )}

        {/* Free plan watermark notice */}
        {!limits.canBrandReports && (
          <div className="text-xs text-ink-faint bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ Free plan reports include a "DRAFT — Free Plan" watermark.
            <button onClick={() => router.push('/billing')} className="ml-1 text-primary underline font-semibold">Upgrade</button>
          </div>
        )}

        {/* Error */}
        {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button onClick={generateReport} disabled={generating}
            className="btn-primary w-full justify-center">
            {generating ? (
              <><span className="animate-spin">⏳</span> Generating PDF…</>
            ) : (
              <><Download className="w-4 h-4" /> Generate PDF</>
            )}
          </button>

          {reportId && limits.canShareReports && (
            <button onClick={shareReport} disabled={sharing}
              className="btn-secondary w-full justify-center text-sm">
              <Share2 className="w-4 h-4" />
              {sharing ? 'Publishing…' : shareUrl ? 'Shared ✓' : 'Share (public URL)'}
            </button>
          )}

          {reportId && !limits.canShareReports && (
            <button onClick={() => router.push('/billing')}
              className="btn-secondary w-full justify-center text-sm text-primary border-primary/30">
              <Crown className="w-4 h-4" /> Upgrade to share reports
            </button>
          )}

          {shareUrl && (
            <div className="card p-3 bg-emerald-50 border-emerald-200">
              <div className="text-xs font-bold text-emerald-700 mb-1">Report shared!</div>
              <div className="flex items-center gap-2">
                <input value={shareUrl} readOnly className="input text-xs py-1 flex-1 bg-surface-50" />
                <button onClick={() => navigator.clipboard.writeText(shareUrl)}
                  className="text-xs text-primary font-semibold">Copy</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Preview ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="card overflow-hidden">
          {/* Report preview header */}
          <div className="p-5 border-b border-surface-300 flex items-start justify-between"
            style={{ borderBottomColor: profile?.reportAccentColor + '30' }}>
            <div>
              {profile?.companyName && limits.canBrandReports && (
                <div className="font-bold text-sm text-ink mb-0.5">{profile.companyName}</div>
              )}
              <div className="text-xl font-display font-black" style={{ color: profile?.reportAccentColor ?? '#0f172a' }}>
                {config.title || 'Untitled Report'}
              </div>
              <div className="text-xs text-ink-muted mt-1 space-x-3">
                {config.jobReference && <span>Ref: {config.jobReference}</span>}
                {config.revisionNo && <span>Rev {config.revisionNo}</span>}
                <span>{format(new Date(config.reportDate || new Date()), 'dd MMM yyyy')}</span>
              </div>
              {config.preparedBy && <div className="text-xs text-ink-muted mt-0.5">Prepared by: {config.preparedBy}</div>}
              {config.preparedFor && <div className="text-xs text-ink-muted">Prepared for: {config.preparedFor}</div>}
            </div>
            {profile?.companyLogo && limits.canBrandReports && (
              <img src={profile.companyLogo} alt="logo" className="h-12 object-contain ml-4" />
            )}
          </div>

          {/* MTO table preview */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-surface-100">
                  <th className="text-left px-3 py-2 font-bold text-ink-muted uppercase tracking-wide text-[10px] w-6">#</th>
                  <th className="text-left px-3 py-2 font-bold text-ink-muted uppercase tracking-wide text-[10px]">Material</th>
                  <th className="px-3 py-2 font-bold text-ink-muted uppercase tracking-wide text-[10px] text-center w-16">Code</th>
                  <th className="px-3 py-2 font-bold text-ink-muted uppercase tracking-wide text-[10px] text-center w-12">Unit</th>
                  {runs.map(r => (
                    <th key={r.id} className="px-3 py-2 font-bold text-ink-muted uppercase tracking-wide text-[10px] text-center w-16">{r.name}</th>
                  ))}
                  <th className="px-3 py-2 font-bold uppercase tracking-wide text-[10px] text-center w-14"
                    style={{ color: profile?.reportAccentColor ?? '#0f172a' }}>Total</th>
                  {config.showStockInfo && limits.stockInfo && (
                    <th className="px-3 py-2 font-bold text-ink-muted uppercase tracking-wide text-[10px] text-right w-20">Stock</th>
                  )}
                  {config.showPricing && limits.pricing && (
                    <th className="px-3 py-2 font-bold text-ink-muted uppercase tracking-wide text-[10px] text-right w-20">Unit Price</th>
                  )}
                  {config.showPricing && limits.pricing && (
                    <th className="px-3 py-2 font-bold text-ink-muted uppercase tracking-wide text-[10px] text-right w-20">Amount</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeResults.map((mat, i) => {
                  const price  = config.showPricing  ? ((mat as any).spec?.unitPrice ?? 0) : 0
                  const amount = price * mat.grandTotal
                  const stock  = config.showStockInfo ? ((mat as any).spec?.stockLengthMm) : null
                  return (
                    <tr key={mat.id} className={i % 2 === 0 ? 'bg-surface-50' : 'bg-surface-100/50'}>
                      <td className="px-3 py-1.5 text-ink-faint">{i + 1}</td>
                      <td className="px-3 py-1.5">
                        <div className="font-medium text-ink">{mat.name}</div>
                        {mat.notes && <div className="text-ink-faint">{mat.notes}</div>}
                      </td>
                      <td className="px-3 py-1.5 text-center font-mono text-ink-muted">{mat.productCode || '—'}</td>
                      <td className="px-3 py-1.5 text-center text-ink-muted">{mat.unit}</td>
                      {mat.perRun.map(pr => (
                        <td key={pr.runId} className="px-3 py-1.5 text-center font-semibold text-ink">
                          {pr.totalQty > 0 ? pr.totalQty : '—'}
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-center font-black" style={{ color: profile?.reportAccentColor ?? '#0f172a' }}>
                        {mat.grandTotal}
                      </td>
                      {config.showStockInfo && limits.stockInfo && (
                        <td className="px-3 py-1.5 text-right text-ink-muted">{stock ? stock + 'mm' : '—'}</td>
                      )}
                      {config.showPricing && limits.pricing && (
                        <td className="px-3 py-1.5 text-right">{price > 0 ? `${config.currency} ${price.toFixed(2)}` : '—'}</td>
                      )}
                      {config.showPricing && limits.pricing && (
                        <td className="px-3 py-1.5 text-right font-semibold">{amount > 0 ? `${config.currency} ${amount.toFixed(2)}` : '—'}</td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: profile?.reportAccentColor ?? '#0f172a' }}>
                  <td colSpan={4 + runs.length} className="px-3 py-2 text-white text-xs font-bold">
                    TOTAL · {activeResults.length} materials
                  </td>
                  <td className="px-3 py-2 text-center text-white font-black">
                    {activeResults.reduce((a, m) => a + m.grandTotal, 0)}
                  </td>
                  {config.showStockInfo && limits.stockInfo && <td />}
                  {config.showPricing && limits.pricing && <td />}
                  {config.showPricing && limits.pricing && (
                    <td className="px-3 py-2 text-right text-white font-black">
                      {grandCost > 0 ? `${config.currency} ${grandCost.toFixed(2)}` : '—'}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Free watermark notice in preview */}
          {!limits.canBrandReports && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700 font-semibold">
              ⚠️ "DRAFT — Free Plan" watermark will appear on the PDF
            </div>
          )}

          {config.notes && (
            <div className="px-4 py-3 border-t border-surface-300">
              <div className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-1">Notes</div>
              <div className="text-xs text-ink">{config.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
