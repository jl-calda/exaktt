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
  const accent = branding.accentColor ?? 'var(--color-primary)'

  return (
    <div className="pb-3 mb-4" style={{ borderBottom: `2px solid ${accent}` }}>
      <div className="flex items-start gap-3">
        {d.showLogo && (
          branding.companyLogo
            ? <img src={branding.companyLogo} alt="" className="w-20 h-10 object-contain" />
            : <div className="w-20 h-10 bg-surface-100 rounded flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-ink-faint" />
              </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-bold text-ink tracking-tight leading-tight">
            {branding.companyName ?? 'Company Name'}
          </div>
          {branding.companyAddr && (
            <div className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">{branding.companyAddr}</div>
          )}
          {d.showRegistration && branding.registrationNo && (
            <div className="text-[11px] text-ink-faint mt-0.5">
              {branding.registrationLabel ?? 'Reg'}: {branding.registrationNo}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
