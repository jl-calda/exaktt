// src/lib/pdf/primitives.tsx
// Reusable @react-pdf/renderer components for all document types

import React from 'react'
import { View, Text, Image } from '@react-pdf/renderer'
import type { DocBlock, DocBranding, TableColumn } from '@/lib/doc-builder/types'
import { baseStyles, colors } from './styles'
import { formatPrice, formatNumber } from './helpers'
import { renderTiptapToPdf } from './richtext-to-pdf'
import { resolveAllCells, indexToColLetter } from '@/lib/doc-builder/formula-engine'

type BlockRenderContext = {
  branding: DocBranding
  accent?: string | null
}

// ─── Header Block ────────────────────────────────────────────────────────────

function HeaderPdf({ block, ctx }: { block: Extract<DocBlock, { type: 'header' }>; ctx: BlockRenderContext }) {
  const S = baseStyles(ctx.accent)
  const C = colors(ctx.accent)
  const b = ctx.branding
  const d = block.data

  return (
    <View style={S.header}>
      <View style={{ flexDirection: 'row', flex: 1 }}>
        {d.showLogo && (
          b.companyLogo
            ? <Image src={b.companyLogo} style={{ width: 80, height: 40, objectFit: 'contain' }} />
            : <View style={S.logoBox}><Text style={{ fontSize: 7, color: C.faint }}>LOGO</Text></View>
        )}
        <View style={S.companyCol}>
          {b.companyName && <Text style={S.companyName}>{b.companyName}</Text>}
          {b.companyAddr && <Text style={S.companyAddr}>{b.companyAddr}</Text>}
          {d.showRegistration && b.registrationNo && (
            <Text style={{ ...S.companyAddr, marginTop: 2 }}>
              {b.registrationLabel ?? 'Reg'}: {b.registrationNo}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}

// ─── Meta Block ──────────────────────────────────────────────────────────────

function MetaPdf({ block, ctx }: { block: Extract<DocBlock, { type: 'meta' }>; ctx: BlockRenderContext }) {
  const S = baseStyles(ctx.accent)
  return (
    <View style={{ ...S.metaBlock, marginBottom: 14 }}>
      {block.data.fields.map((f, i) => (
        <View key={i} style={S.metaRow}>
          <Text style={S.metaLabel}>{f.label}</Text>
          <Text style={S.metaValue}>{f.value || '\u2014'}</Text>
        </View>
      ))}
    </View>
  )
}

// ─── Recipient Block ─────────────────────────────────────────────────────────

function RecipientPdf({ block, ctx }: { block: Extract<DocBlock, { type: 'recipient' }>; ctx: BlockRenderContext }) {
  const S = baseStyles(ctx.accent)
  const d = block.data
  return (
    <View style={S.recipientBlock}>
      <Text style={S.recipientLabel}>{d.label}</Text>
      <Text style={S.recipientName}>{d.name || '\u2014'}</Text>
      {d.contact && <Text style={S.recipientDetail}>{d.contact}</Text>}
      {d.email && <Text style={S.recipientDetail}>{d.email}</Text>}
      {d.address && <Text style={S.recipientDetail}>{d.address}</Text>}
    </View>
  )
}

// ─── Rich Text Block ─────────────────────────────────────────────────────────

function RichTextPdf({ block }: { block: Extract<DocBlock, { type: 'rich_text' }> }) {
  return (
    <View style={{ marginBottom: 10 }}>
      {renderTiptapToPdf(block.data.tiptapJson)}
    </View>
  )
}

// ─── Table Block ─────────────────────────────────────────────────────────────

function colStyle(col: TableColumn) {
  const s: Record<string, any> = {}
  if (col.width) {
    s.width = col.width.endsWith('%') ? col.width : parseInt(col.width, 10)
  } else {
    s.flex = 1
  }
  if (col.align) s.textAlign = col.align
  return s
}

function formatCell(value: any, col: TableColumn, currency?: string): string {
  if (value == null) return '\u2014'
  if (col.format === 'currency' && typeof value === 'number') {
    return formatPrice(value, currency ?? 'SGD')
  }
  if (col.format === 'number' && typeof value === 'number') {
    return formatNumber(value)
  }
  return String(value)
}

function TablePdf({ block, ctx }: { block: Extract<DocBlock, { type: 'table' }>; ctx: BlockRenderContext }) {
  const S = baseStyles(ctx.accent)
  const C = colors(ctx.accent)
  const { columns, rows, showTotals, totalLabel, currency } = block.data
  const cur = currency ?? ctx.branding.currency ?? 'SGD'

  // Compute total for currency columns
  const totals: Record<string, number> = {}
  if (showTotals) {
    for (const col of columns) {
      if (col.format === 'currency') {
        totals[col.key] = rows.reduce((s, r) => s + (typeof r[col.key] === 'number' ? r[col.key] : 0), 0)
      }
    }
  }

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Table header */}
      <View style={S.tableHdr}>
        {columns.map(col => (
          <Text key={col.key} style={{ ...S.tableHdrText, ...colStyle(col) }}>{col.label}</Text>
        ))}
      </View>

      {/* Table rows */}
      {rows.map((row, ri) => (
        <View key={ri} style={ri % 2 === 0 ? S.tableRow : S.tableRowAlt}>
          {columns.map(col => (
            <Text key={col.key} style={{ fontSize: 8.5, ...colStyle(col) }}>
              {formatCell(row[col.key], col, cur)}
            </Text>
          ))}
        </View>
      ))}

      {/* Totals */}
      {showTotals && Object.keys(totals).length > 0 && (
        <View style={S.grandTotalRow}>
          {columns.map((col, ci) => {
            if (totals[col.key] != null) {
              return (
                <Text key={col.key} style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.white, ...colStyle(col) }}>
                  {formatPrice(totals[col.key], cur)}
                </Text>
              )
            }
            // Put label in the column before the first total
            const firstTotalIdx = columns.findIndex(c => totals[c.key] != null)
            if (ci === firstTotalIdx - 1 || (firstTotalIdx === 0 && ci === 0)) {
              return (
                <Text key={col.key} style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.white, ...colStyle(col), textAlign: 'right' }}>
                  {totalLabel ?? 'Total'}
                </Text>
              )
            }
            return <Text key={col.key} style={colStyle(col)} />
          })}
        </View>
      )}
    </View>
  )
}

// ─── Image Block ─────────────────────────────────────────────────────────────

function ImagePdf({ block }: { block: Extract<DocBlock, { type: 'image' }> }) {
  const C = colors()
  const cols = Math.min(4, Math.max(1, block.data.columns))
  const imgWidth = `${Math.floor(100 / cols)}%` as any
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6, flexWrap: 'wrap' }}>
      {block.data.images.map((img, i) => (
        <View key={i} style={{ width: imgWidth }}>
          <Image src={img.url} style={{ objectFit: 'contain', maxHeight: 200 }} />
          {img.caption && (
            <Text style={{ fontSize: 7, color: C.muted, textAlign: 'center', marginTop: 2 }}>{img.caption}</Text>
          )}
        </View>
      ))}
    </View>
  )
}

// ─── Signature Block ─────────────────────────────────────────────────────────

function SignaturePdf({ block, ctx }: { block: Extract<DocBlock, { type: 'signature' }>; ctx: BlockRenderContext }) {
  const S = baseStyles(ctx.accent)
  const d = block.data
  return (
    <View style={S.signatureBlock}>
      <View style={S.signatureCol}>
        <View style={S.signatureLine} />
        <Text style={S.signatureLabel}>{d.leftLabel}</Text>
        {d.showDate && <Text style={S.signatureDate}>Date: _______________</Text>}
      </View>
      <View style={S.signatureCol}>
        <View style={S.signatureLine} />
        <Text style={S.signatureLabel}>{d.rightLabel}</Text>
        {d.showDate && <Text style={S.signatureDate}>Date: _______________</Text>}
      </View>
    </View>
  )
}

// ─── Data Snapshot Block ─────────────────────────────────────────────────────

function DataSnapshotPdf({ block, ctx }: { block: Extract<DocBlock, { type: 'data_snapshot' }>; ctx: BlockRenderContext }) {
  const C = colors(ctx.accent)
  const d = block.data
  if (!d.snapshot) return <View />

  // Render as a simple key-value list or table depending on snapshot shape
  if (Array.isArray(d.snapshot)) {
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 4 }}>{d.label}</Text>
        {d.snapshot.map((item: any, i: number) => (
          <View key={i} style={{ flexDirection: 'row', paddingVertical: 2, borderBottom: '0.5pt solid ' + C.border }}>
            <Text style={{ flex: 1, fontSize: 8.5, color: C.ink }}>{item.name ?? item.label ?? JSON.stringify(item)}</Text>
            {item.value != null && <Text style={{ fontSize: 8.5, color: C.muted }}>{String(item.value)}</Text>}
          </View>
        ))}
      </View>
    )
  }

  // Object — render as key-value pairs
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 4 }}>{d.label}</Text>
      {Object.entries(d.snapshot).map(([key, val], i) => (
        <View key={i} style={{ flexDirection: 'row', paddingVertical: 2 }}>
          <Text style={{ width: 100, fontSize: 8, color: C.faint }}>{key}</Text>
          <Text style={{ flex: 1, fontSize: 8.5, color: C.ink }}>{String(val)}</Text>
        </View>
      ))}
    </View>
  )
}

// ─── Spacer Block ────────────────────────────────────────────────────────────

function SpacerPdf({ block }: { block: Extract<DocBlock, { type: 'spacer' }> }) {
  return <View style={{ height: block.data.height }} />
}

// ─── Divider Block ───────────────────────────────────────────────────────────

function DividerPdf({ block, ctx }: { block: Extract<DocBlock, { type: 'divider' }>; ctx: BlockRenderContext }) {
  const S = baseStyles(ctx.accent)
  const styleMap = {
    line: S.dividerLine,
    thick: S.dividerThick,
    double: S.dividerDouble,
  }
  return <View style={styleMap[block.data.style] ?? S.dividerLine} />
}

// ─── Footer Block ────────────────────────────────────────────────────────────

function FooterPdf({ block, ctx }: { block: Extract<DocBlock, { type: 'footer' }>; ctx: BlockRenderContext }) {
  const S = baseStyles(ctx.accent)
  const d = block.data
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>
        {d.showCompanyName ? (ctx.branding.companyName ?? 'Exaktt') : (d.customText ?? '')}
      </Text>
      {d.showPageNumbers && (
        <Text style={S.footerText} render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        } />
      )}
    </View>
  )
}

// ─── Spreadsheet Block ──────────────────────────────────────────────────────

function SpreadsheetPdf({ block, ctx }: { block: Extract<DocBlock, { type: 'spreadsheet' }>; ctx: BlockRenderContext }) {
  const S = baseStyles(ctx.accent)
  const C = colors(ctx.accent)
  const { columns, rows, cells } = block.data
  const resolved = resolveAllCells(cells)

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Header row with column letters */}
      <View style={S.tableHdr}>
        {Array.from({ length: columns }, (_, c) => (
          <Text key={c} style={{ ...S.tableHdrText, flex: 1, textAlign: 'center' }}>
            {indexToColLetter(c)}
          </Text>
        ))}
      </View>

      {/* Data rows */}
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={r % 2 === 0 ? S.tableRow : S.tableRowAlt}>
          {Array.from({ length: columns }, (_, c) => {
            const key = `${indexToColLetter(c)}${r + 1}`
            const cell = cells[key]
            const display = resolved[key] ?? cell?.value ?? ''
            return (
              <Text
                key={c}
                style={{
                  flex: 1,
                  fontSize: 8.5,
                  textAlign: cell?.align ?? 'left',
                  fontFamily: cell?.bold ? 'Helvetica-Bold' : 'Helvetica',
                }}
              >
                {display || '\u2014'}
              </Text>
            )
          })}
        </View>
      ))}
    </View>
  )
}

// ─── Page Break Block ───────────────────────────────────────────────────────

function PageBreakPdf() {
  return <View break />
}

// ─── Block Renderer Dispatch ─────────────────────────────────────────────────

export function renderBlock(block: DocBlock, ctx: BlockRenderContext, key: number): React.ReactElement | null {
  switch (block.type) {
    case 'header':        return <HeaderPdf key={key} block={block} ctx={ctx} />
    case 'meta':          return <MetaPdf key={key} block={block} ctx={ctx} />
    case 'recipient':     return <RecipientPdf key={key} block={block} ctx={ctx} />
    case 'rich_text':     return <RichTextPdf key={key} block={block} />
    case 'table':         return <TablePdf key={key} block={block} ctx={ctx} />
    case 'image':         return <ImagePdf key={key} block={block} />
    case 'signature':     return <SignaturePdf key={key} block={block} ctx={ctx} />
    case 'data_snapshot': return <DataSnapshotPdf key={key} block={block} ctx={ctx} />
    case 'spacer':        return <SpacerPdf key={key} block={block} />
    case 'divider':       return <DividerPdf key={key} block={block} ctx={ctx} />
    case 'footer':        return <FooterPdf key={key} block={block} ctx={ctx} />
    case 'spreadsheet':   return <SpreadsheetPdf key={key} block={block} ctx={ctx} />
    case 'page_break':    return <PageBreakPdf key={key} />
    default:              return null
  }
}
