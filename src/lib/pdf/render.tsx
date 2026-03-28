// src/lib/pdf/render.tsx
// Main PDF renderer: converts DocBlock[] → @react-pdf/renderer Document

import React from 'react'
import { Document, Page } from '@react-pdf/renderer'
import type { DocBlock, DocBranding, DocSettings } from '@/lib/doc-builder/types'
import { baseStyles } from './styles'
import { renderBlock } from './primitives'

interface RenderDocumentProps {
  title: string
  blocks: DocBlock[]
  branding: DocBranding
  settings?: DocSettings | null
}

export function RenderDocument({ title, blocks, branding, settings }: RenderDocumentProps) {
  const accent = branding.accentColor ?? settings?.accentColor
  const S = baseStyles(accent)
  const pageSize = settings?.pageSize ?? 'A4'

  // Separate footer blocks (rendered as fixed) from content blocks
  const footerBlocks = blocks.filter(b => b.type === 'footer')
  const contentBlocks = blocks.filter(b => b.type !== 'footer')

  const ctx = { branding, accent }

  return (
    <Document title={title} author={branding.companyName ?? 'Exaktt'}>
      <Page size={pageSize} style={S.page} wrap>
        {contentBlocks.map((block, i) => renderBlock(block, ctx, i))}
        {footerBlocks.map((block, i) => renderBlock(block, ctx, 1000 + i))}
      </Page>
    </Document>
  )
}
