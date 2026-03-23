// src/lib/pdf/ReportDocument.tsx
// Server-side PDF generation using @react-pdf/renderer
// Called from /api/reports/[id]/pdf route

import React from 'react'
import {
  Document, Page, View, Text, Image, StyleSheet, Font,
} from '@react-pdf/renderer'
import type { Report, MultiRunResult, MaterialSpec, MultiRunMaterial } from '@/types'

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
  primary:   '#7917de',
  ink:       '#1e293b',
  muted:     '#64748b',
  faint:     '#94a3b8',
  surface:   '#f8fafc',
  border:    '#e2e8f0',
  red:       '#dc2626',
  green:     '#16a34a',
  white:     '#ffffff',
}

const S = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 9, color: C.ink, padding: '28pt 32pt', backgroundColor: C.white },
  // Header
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, paddingBottom: 14, borderBottom: '2pt solid ' + C.primary },
  logo:       { width: 80, height: 40, objectFit: 'contain' },
  logoBox:    { width: 80, height: 40, backgroundColor: C.surface, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  companyCol: { flex: 1, paddingLeft: 12 },
  companyName:{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 2 },
  companyAddr:{ fontSize: 8, color: C.muted, lineHeight: 1.5 },
  reportMeta: { alignItems: 'flex-end' },
  metaRow:    { flexDirection: 'row', marginBottom: 2 },
  metaLabel:  { fontSize: 7.5, color: C.faint, width: 68, textAlign: 'right', marginRight: 5 },
  metaValue:  { fontSize: 7.5, color: C.ink, fontFamily: 'Helvetica-Bold' },
  // Title block
  titleBlock: { marginBottom: 14, padding: '10pt 12pt', backgroundColor: C.surface, borderRadius: 5, borderLeft: '3pt solid ' + C.primary },
  docTitle:   { fontSize: 15, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 3 },
  docSub:     { fontSize: 8.5, color: C.muted },
  // Section
  section:    { marginBottom: 14 },
  sectionHdr: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, paddingBottom: 3, borderBottom: '0.5pt solid ' + C.border },
  // Table
  table:      { width: '100%' },
  tableHdr:   { flexDirection: 'row', backgroundColor: C.ink, paddingVertical: 4, paddingHorizontal: 6 },
  tableHdrTx: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.white },
  tableRow:   { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderBottom: '0.5pt solid ' + C.border },
  tableRowAlt:{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderBottom: '0.5pt solid ' + C.border, backgroundColor: C.surface },
  // Cols: No | Material | Code | Unit | [per-run cols] | Total | [Price | Total $]
  colNo:      { width: 18 },
  colMat:     { flex: 2, paddingRight: 4 },
  colCode:    { width: 54, paddingRight: 4 },
  colUnit:    { width: 28, textAlign: 'center' },
  colQty:     { width: 36, textAlign: 'center' },
  colPrice:   { width: 44, textAlign: 'right' },
  colTotal:   { width: 50, textAlign: 'right' },
  // Run header
  runTag:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  runChip:    { fontSize: 7.5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, backgroundColor: C.primary + '18', color: C.primary, fontFamily: 'Helvetica-Bold' },
  // Totals row
  totalRow:   { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, backgroundColor: C.ink, marginTop: 2 },
  totalTx:    { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white },
  // Watermark
  watermark:  { position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', fontSize: 7, color: C.faint },
  // Footer
  footer:     { position: 'absolute', bottom: 16, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', borderTop: '0.5pt solid ' + C.border, paddingTop: 5 },
  footerTx:   { fontSize: 7, color: C.faint },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, dp = 0) => n.toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const fmtPrice = (n: number | null | undefined, currency: string) =>
  n != null ? currency + ' ' + fmt(n, 2) : '—'

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface ReportDocumentProps {
  report:  Report
  results: MultiRunResult | null
  specs:   Record<string, MaterialSpec>
}

export function ReportDocument({ report, results, specs }: ReportDocumentProps) {
  const combined = results?.combined ?? []
  const runs     = results?.runs     ?? []
  const showCost = report.showPricing
  const currency = report.currency ?? 'SGD'
  const isMultiRun = runs.length > 1

  // Per-run column width allocation
  const runColW = isMultiRun ? Math.min(40, 200 / runs.length) : 0

  // Grand total cost
  let grandCost = 0

  return (
    <Document title={report.title} author={report.preparedBy ?? 'MaterialMTO'}>
      <Page size="A4" style={S.page}>

        {/* ── HEADER ── */}
        <View style={S.header}>
          {/* Logo + company */}
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {report.companyLogo
              ? <Image src={report.companyLogo} style={S.logo} />
              : <View style={S.logoBox}><Text style={{ fontSize: 7, color: C.faint }}>LOGO</Text></View>}
            <View style={S.companyCol}>
              {report.companyName && <Text style={S.companyName}>{report.companyName}</Text>}
              {report.companyAddr && <Text style={S.companyAddr}>{report.companyAddr}</Text>}
              {report.abn         && <Text style={{ ...S.companyAddr, marginTop: 2 }}>ABN / Reg: {report.abn}</Text>}
            </View>
          </View>
          {/* Report meta */}
          <View style={S.reportMeta}>
            {[
              ['Document',   'Material Take-Off Report'],
              ['Job Ref',     report.jobRef       ?? '—'],
              ['Prepared by', report.preparedBy   ?? '—'],
              ['Prepared for',report.preparedFor  ?? '—'],
              ['Date',        formatDate(report.reportDate)],
              ['Revision',    report.revisionNo],
            ].map(([label, value]) => (
              <View key={label} style={S.metaRow}>
                <Text style={S.metaLabel}>{label}</Text>
                <Text style={S.metaValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── TITLE ── */}
        <View style={S.titleBlock}>
          <Text style={S.docTitle}>{report.title}</Text>
          {report.systemName && <Text style={S.docSub}>System: {report.systemName}</Text>}
        </View>

        {/* ── RUNS SUMMARY ── */}
        {isMultiRun && (
          <View style={S.section}>
            <Text style={S.sectionHdr}>Runs</Text>
            <View style={S.runTag}>
              {runs.map((r, i) => (
                <Text key={r.id} style={S.runChip}>
                  #{i + 1} {r.name}{r.qty > 1 ? ' ×' + r.qty : ''}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* ── MATERIALS TABLE ── */}
        <View style={S.section}>
          <Text style={S.sectionHdr}>Material Take-Off</Text>
          <View style={S.table}>
            {/* Header */}
            <View style={S.tableHdr}>
              <Text style={{ ...S.tableHdrTx, ...S.colNo }}>#</Text>
              <Text style={{ ...S.tableHdrTx, ...S.colMat }}>Material</Text>
              <Text style={{ ...S.tableHdrTx, ...S.colCode }}>Code</Text>
              <Text style={{ ...S.tableHdrTx, ...S.colUnit }}>Unit</Text>
              {isMultiRun && runs.map(r => (
                <Text key={r.id} style={{ ...S.tableHdrTx, width: runColW, textAlign: 'center' }}>
                  {r.name}
                </Text>
              ))}
              <Text style={{ ...S.tableHdrTx, ...S.colQty }}>Total</Text>
              {showCost && <Text style={{ ...S.tableHdrTx, ...S.colPrice }}>Unit $</Text>}
              {showCost && <Text style={{ ...S.tableHdrTx, ...S.colTotal }}>Amount</Text>}
            </View>

            {/* Rows */}
            {combined.filter(m => !m.allBlocked).map((mat, idx) => {
              const spec    = specs[mat.productCode] ?? specs[mat.id]
              const unitPrice = spec?.unitPrice ?? null
              const lineTotal = unitPrice != null ? (unitPrice * mat.grandTotal) : null
              if (lineTotal != null) grandCost += lineTotal

              return (
                <View key={mat.id} style={idx % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                  <Text style={{ ...S.colNo, fontSize: 8, color: C.faint }}>{idx + 1}</Text>
                  <View style={S.colMat}>
                    <Text style={{ fontSize: 8.5 }}>{mat.name}</Text>
                    {mat.notes ? <Text style={{ fontSize: 7, color: C.faint }}>{mat.notes}</Text> : null}
                  </View>
                  <Text style={{ fontSize: 8, color: C.muted, ...S.colCode }}>{mat.productCode || '—'}</Text>
                  <Text style={{ fontSize: 8, color: C.muted, ...S.colUnit }}>{mat.unit}</Text>
                  {isMultiRun && mat.perRun.map((pr, ri) => (
                    <Text key={ri} style={{ fontSize: 8.5, width: runColW, textAlign: 'center', fontFamily: 'Courier' }}>
                      {pr.totalQty > 0 ? pr.totalQty : '—'}
                    </Text>
                  ))}
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', ...S.colQty }}>
                    {mat.grandTotal}
                  </Text>
                  {showCost && (
                    <Text style={{ fontSize: 8, color: C.muted, ...S.colPrice }}>
                      {fmtPrice(unitPrice, currency)}
                    </Text>
                  )}
                  {showCost && (
                    <Text style={{ fontSize: 8, fontFamily: lineTotal != null ? 'Helvetica-Bold' : 'Helvetica', ...S.colTotal }}>
                      {fmtPrice(lineTotal, currency)}
                    </Text>
                  )}
                </View>
              )
            })}

            {/* Totals row */}
            <View style={S.totalRow}>
              <Text style={{ ...S.totalTx, ...S.colNo }} />
              <Text style={{ ...S.totalTx, flex: 2 }}>Subtotal</Text>
              <Text style={{ ...S.totalTx, ...S.colCode }} />
              <Text style={{ ...S.totalTx, ...S.colUnit }} />
              {isMultiRun && runs.map((_, ri) => (
                <Text key={ri} style={{ ...S.totalTx, width: runColW, textAlign: 'center' }}>
                  {combined.filter(m => !m.allBlocked).reduce((a, m) => a + (m.perRun[ri]?.totalQty ?? 0), 0)}
                </Text>
              ))}
              <Text style={{ ...S.totalTx, ...S.colQty }}>
                {combined.filter(m => !m.allBlocked).reduce((a, m) => a + m.grandTotal, 0)}
              </Text>
              {showCost && <Text style={{ ...S.totalTx, ...S.colPrice }} />}
              {showCost && (
                <Text style={{ ...S.totalTx, ...S.colTotal }}>
                  {grandCost > 0 ? fmtPrice(grandCost, currency) : '—'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* ── NOTES ── */}
        {report.notes && (
          <View style={S.section}>
            <Text style={S.sectionHdr}>Notes</Text>
            <Text style={{ fontSize: 8, color: C.muted, lineHeight: 1.6 }}>{report.notes}</Text>
          </View>
        )}

        {/* ── DISCLAIMER ── */}
        <View style={{ marginTop: 8, padding: '7pt 10pt', backgroundColor: '#fffbeb', borderRadius: 4, borderLeft: '2pt solid #f59e0b' }}>
          <Text style={{ fontSize: 7, color: '#92400e', lineHeight: 1.5 }}>
            ⚠  All quantities are rounded up to the nearest whole unit. This report is indicative only — verify site conditions and supplier specifications before ordering. Prices are indicative and subject to change.
          </Text>
        </View>

        {/* ── WATERMARK (Free plan) ── */}
        {report.companyLogo === null && !report.companyName && (
          <Text style={S.watermark}>
            Generated with MaterialMTO Free Plan · Upgrade to Pro to remove this watermark
          </Text>
        )}

        {/* ── FOOTER ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerTx}>MaterialMTO · materialmto.com</Text>
          <Text style={S.footerTx}>
            {report.title} · Rev {report.revisionNo} · {formatDate(report.reportDate)}
          </Text>
          <Text style={S.footerTx} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
