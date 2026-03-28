// src/components/doc-builder/blocks/HeaderBlock.tsx
'use client'
import type { DocBlock, DocBranding } from '@/lib/doc-builder/types'
import { Building2 } from 'lucide-react'

type Block = Extract<DocBlock, { type: 'header' }>

interface Props {
  block: Block
  branding: DocBranding
  onChange: (data: Block['data']) => void
}

export default function HeaderBlock({ block, branding, onChange }: Props) {
  const d = block.data
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-start gap-3">
        {d.showLogo && (
          branding.companyLogo
            ? <img src={branding.companyLogo} alt="" className="w-16 h-8 object-contain rounded" />
            : <div className="w-16 h-8 bg-surface-100 rounded flex items-center justify-center">
                <Building2 className="w-4 h-4 text-ink-faint" />
              </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-xs text-ink">{branding.companyName ?? 'Company Name'}</div>
          {branding.companyAddr && <div className="text-[10px] text-ink-muted mt-0.5">{branding.companyAddr}</div>}
          {d.showRegistration && branding.registrationNo && (
            <div className="text-[10px] text-ink-faint mt-0.5">
              {branding.registrationLabel ?? 'Reg'}: {branding.registrationNo}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <label className="flex items-center gap-1.5 text-[10px] text-ink-muted">
          <input type="checkbox" checked={d.showLogo} onChange={e => onChange({ ...d, showLogo: e.target.checked })} className="rounded" />
          Logo
        </label>
        <label className="flex items-center gap-1.5 text-[10px] text-ink-muted">
          <input type="checkbox" checked={d.showRegistration} onChange={e => onChange({ ...d, showRegistration: e.target.checked })} className="rounded" />
          Registration
        </label>
        <label className="flex items-center gap-1.5 text-[10px] text-ink-muted">
          <input type="checkbox" checked={d.showContact} onChange={e => onChange({ ...d, showContact: e.target.checked })} className="rounded" />
          Contact
        </label>
      </div>
    </div>
  )
}
