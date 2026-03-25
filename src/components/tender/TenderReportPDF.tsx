// src/components/tender/TenderReportPDF.tsx
// PDF document for tender quotation reports using @react-pdf/renderer

import React from 'react'
import {
  Document, Page, View, Text, StyleSheet, Font,
} from '@react-pdf/renderer'
import type {
  TenderReport,
  TenderReportSection,
  TenderReportJobLine,
  TenderReportCustomLine,
  TenderReportTextBlock,
} from '@/types'

// ─── Colours ──────────────────────────────────────────────────────────────────

const C = {
  primary: '#7917de',
  ink:     '#1e293b',
  muted:   '#64748b',
  faint:   '#94a3b8',
  surface: '#f8fafc',
  border:  '#e2e8f0',
  white:   '#ffffff',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', fontSize: 9, color: C.ink,
    padding: '28pt 32pt 48pt 32pt', backgroundColor: C.white,
  },
  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 18, paddingBottom: 14, borderBottom: '2pt solid ' + C.primary,
  },
  logoBox: {
    width: 80, height: 40, backgroundColor: C.surface, borderRadius: 4,
    justifyContent: 'center', alignItems: 'center',
  },
  companyCol: { flex: 1, paddingLeft: 12 },
  companyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 2 },
  companyAddr: { fontSize: 8, color: C.muted, lineHeight: 1.5 },
  reportMeta: { alignItems: 'flex-end' },
  metaRow: { flexDirection: 'row', marginBottom: 2 },
  metaLabel: { fontSize: 7.5, color: C.faint, width: 68, textAlign: 'right', marginRight: 5 },
  metaValue: { fontSize: 7.5, color: C.ink, fontFamily: 'Helvetica-Bold' },
  // Client block
  clientBlock: {
    marginBottom: 14, padding: '10pt 12pt', backgroundColor: C.surface,
    borderRadius: 5, borderLeft: '3pt solid ' + C.primary,
  },
  clientLabel: { fontSize: 7.5, color: C.faint, marginBottom: 2 },
  clientName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 2 },
  clientDetail: { fontSize: 8, color: C.muted, lineHeight: 1.5 },
  // Text block
  textBlockWrap: { marginBottom: 10 },
  textBlockTitle: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 3 },
  textBlockContent: { fontSize: 8.5, color: C.muted, lineHeight: 1.6 },
  // Cost table
  section: { marginBottom: 14 },
  sectionHdr: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.primary, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 6, paddingBottom: 3, borderBottom: '0.5pt solid ' + C.border,
  },
  table: { width: '100%' },
  tableHdr: { flexDirection: 'row', backgroundColor: C.ink, paddingVertical: 4, paddingHorizontal: 6 },
  tableHdrTx: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.white },
  tableRow: {
    flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6,
    borderBottom: '0.5pt solid ' + C.border,
  },
  tableRowAlt: {
    flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6,
    borderBottom: '0.5pt solid ' + C.border, backgroundColor: C.surface,
  },
  colNo: { width: 24 },
  colDesc: { flex: 3, paddingRight: 6 },
  colAmt: { width: 80, textAlign: 'right' },
  // Total rows
  subtotalRow: {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6,
    borderTop: '1pt solid ' + C.border, backgroundColor: C.surface,
  },
  grandTotalRow: {
    flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 6,
    backgroundColor: C.ink, marginTop: 2,
  },
  totalLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  totalValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  // Payment terms
  paymentBlock: {
    marginTop: 16, padding: '10pt 12pt', backgroundColor: C.surface,
    borderRadius: 5, borderLeft: '3pt solid ' + C.primary,
  },
  paymentTitle: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
  },
  paymentText: { fontSize: 8.5, color: C.ink, lineHeight: 1.6 },
  // Disclaimer
  disclaimer: { marginTop: 12, fontSize: 7, color: C.faint, fontStyle: 'italic', lineHeight: 1.5 },
  // Footer
  footer: {
    position: 'absolute', bottom: 16, left: 32, right: 32,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTop: '0.5pt solid ' + C.border, paddingTop: 5,
  },
  footerTx: { fontSize: 7, color: C.faint },
  // Appendix
  appendixHdr: {
    fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.ink,
    marginBottom: 12, paddingBottom: 6, borderBottom: '2pt solid ' + C.primary,
  },
  appendixJobHdr: {
    fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.primary,
    marginBottom: 6, marginTop: 10,
  },
  appendixSmall: { fontSize: 7.5, color: C.muted, lineHeight: 1.4 },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, dp = 0) =>
  n.toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const fmtPrice = (n: number | null | undefined, currency: string) =>
  n != null ? `${currency} ${fmt(n, 2)}` : '\u2014'

function formatDate(d: Date | string | null | undefined) {
  if (!d) return '\u2014'
  return new Intl.DateTimeFormat('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(d))
}

function linePrice(amount: number, marginPct: number) {
  return amount * (1 + marginPct)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  report: TenderReport
}

type CostLine = {
  description: string
  finalPrice: number
}

type TableSegment =
  | { kind: 'text'; block: TenderReportTextBlock }
  | { kind: 'lines'; lines: CostLine[] }

// ─── Component ────────────────────────────────────────────────────────────────

export function TenderReportPDF({ report }: Props) {
  const currency = report.currency ?? 'SGD'
  const accent = report.accentColor ?? C.primary

  // Build table segments: group consecutive cost lines, separated by text blocks
  const segments: TableSegment[] = []
  let currentLines: CostLine[] = []

  for (const sec of report.sections) {
    if (sec.type === 'text_block') {
      if (currentLines.length > 0) {
        segments.push({ kind: 'lines', lines: currentLines })
        currentLines = []
      }
      segments.push({ kind: 'text', block: sec })
    } else {
      currentLines.push({
        description: sec.description,
        finalPrice: linePrice(sec.amount, sec.marginPct),
      })
    }
  }
  if (currentLines.length > 0) {
    segments.push({ kind: 'lines', lines: currentLines })
  }

  // Compute totals
  const allCostLines = segments.flatMap(s => (s.kind === 'lines' ? s.lines : []))
  const subtotal = allCostLines.reduce((sum, l) => sum + l.finalPrice, 0)
  const grandTotal = subtotal * (1 + report.overallMarginPct)

  // Appendix items
  const appendixJobs = report.showAppendix
    ? (report.sections.filter(
        (s): s is TenderReportJobLine => s.type === 'job_line' && s.resultSnapshot != null
      ))
    : []

  // Running line counter across segments
  let lineCounter = 0

  return (
    <Document title={report.title} author={report.preparedBy ?? 'Exaktt'}>
      {/* ── MAIN PAGE(S) ── */}
      <Page size="A4" style={S.page} wrap>

        {/* ── HEADER ── */}
        <View style={S.header}>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            <View style={S.logoBox}>
              <Text style={{ fontSize: 7, color: C.faint }}>LOGO</Text>
            </View>
            <View style={S.companyCol}>
              {report.companyName && <Text style={S.companyName}>{report.companyName}</Text>}
              {report.companyAddr && <Text style={S.companyAddr}>{report.companyAddr}</Text>}
              {report.registrationNo && (
                <Text style={{ ...S.companyAddr, marginTop: 2 }}>
                  {report.registrationLabel ?? 'Reg'}: {report.registrationNo}
                </Text>
              )}
            </View>
          </View>
          <View style={S.reportMeta}>
            {([
              ['Document',    'QUOTATION'],
              ['Reference',   report.reference ?? '\u2014'],
              ['Date',        formatDate(report.date)],
              ['Valid Until', formatDate(report.validUntil)],
              ['Prepared by', report.preparedBy ?? '\u2014'],
              ['Revision',    report.revisionNo],
            ] as [string, string][]).map(([label, value]) => (
              <View key={label} style={S.metaRow}>
                <Text style={S.metaLabel}>{label}</Text>
                <Text style={S.metaValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── CLIENT BLOCK ── */}
        {report.clientName && (
          <View style={S.clientBlock}>
            <Text style={S.clientLabel}>To:</Text>
            <Text style={S.clientName}>{report.clientName}</Text>
            {report.clientContact && <Text style={S.clientDetail}>{report.clientContact}</Text>}
            {report.clientEmail && <Text style={S.clientDetail}>{report.clientEmail}</Text>}
            {report.clientAddr && <Text style={S.clientDetail}>{report.clientAddr}</Text>}
          </View>
        )}

        {/* ── SECTIONS ── */}
        {segments.map((seg, si) => {
          if (seg.kind === 'text') {
            return (
              <View key={`text-${si}`} style={S.textBlockWrap}>
                {seg.block.title && <Text style={S.textBlockTitle}>{seg.block.title}</Text>}
                <Text style={S.textBlockContent}>{seg.block.content}</Text>
              </View>
            )
          }

          // Cost table segment
          return (
            <View key={`lines-${si}`} style={S.section}>
              {si === 0 || segments[si - 1]?.kind === 'text' ? (
                <Text style={S.sectionHdr}>Cost Summary</Text>
              ) : null}
              <View style={S.table}>
                {/* Table header */}
                <View style={S.tableHdr}>
                  <Text style={{ ...S.tableHdrTx, ...S.colNo }}>#</Text>
                  <Text style={{ ...S.tableHdrTx, ...S.colDesc }}>Description</Text>
                  <Text style={{ ...S.tableHdrTx, ...S.colAmt }}>Amount</Text>
                </View>
                {/* Table rows */}
                {seg.lines.map((line, li) => {
                  lineCounter += 1
                  const rowStyle = li % 2 === 0 ? S.tableRow : S.tableRowAlt
                  return (
                    <View key={li} style={rowStyle}>
                      <Text style={{ ...S.colNo, fontSize: 8, color: C.faint }}>{lineCounter}</Text>
                      <Text style={{ ...S.colDesc, fontSize: 8.5 }}>{line.description}</Text>
                      <Text style={{ ...S.colAmt, fontSize: 8.5, fontFamily: 'Helvetica-Bold' }}>
                        {fmtPrice(line.finalPrice, currency)}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )
        })}

        {/* ── SUBTOTAL & GRAND TOTAL ── */}
        {allCostLines.length > 0 && (
          <View style={{ marginTop: 2 }}>
            <View style={S.subtotalRow}>
              <View style={S.colNo} />
              <Text style={{ ...S.colDesc, ...S.totalLabel, color: C.ink }}>Subtotal</Text>
              <Text style={{ ...S.colAmt, ...S.totalValue, color: C.ink }}>
                {fmtPrice(subtotal, currency)}
              </Text>
            </View>
            <View style={S.grandTotalRow}>
              <View style={S.colNo} />
              <Text style={{ ...S.colDesc, ...S.totalLabel, color: C.white }}>Grand Total</Text>
              <Text style={{ ...S.colAmt, ...S.totalValue, color: C.white }}>
                {fmtPrice(grandTotal, currency)}
              </Text>
            </View>
          </View>
        )}

        {/* ── PAYMENT TERMS ── */}
        {report.paymentTerms && (
          <View style={S.paymentBlock}>
            <Text style={S.paymentTitle}>Payment Terms</Text>
            <Text style={S.paymentText}>{report.paymentTerms}</Text>
            {report.validityPeriod && (
              <Text style={{ ...S.paymentText, marginTop: 4, color: C.muted }}>
                Validity: {report.validityPeriod}
              </Text>
            )}
          </View>
        )}

        {/* ── NOTES ── */}
        {report.notes && (
          <View style={{ marginTop: 12 }}>
            <Text style={S.sectionHdr}>Notes</Text>
            <Text style={{ fontSize: 8.5, color: C.muted, lineHeight: 1.6 }}>{report.notes}</Text>
          </View>
        )}

        {/* ── DISCLAIMER ── */}
        {report.disclaimer && (
          <Text style={S.disclaimer}>{report.disclaimer}</Text>
        )}

        {/* ── FOOTER ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerTx}>{report.companyName ?? 'Exaktt'}</Text>
          <Text style={S.footerTx} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
        </View>
      </Page>

      {/* ── APPENDIX PAGES ── */}
      {appendixJobs.map((job) => {
        const snap = job.resultSnapshot!
        const jobCurrency = currency
        return (
          <Page key={job.id} size="A4" style={S.page} wrap>
            <Text style={S.appendixHdr}>Appendix \u2014 {job.systemName} / {job.jobName}</Text>

            {/* BOM Table */}
            <View style={S.section}>
              <Text style={S.sectionHdr}>Bill of Materials</Text>
              <View style={S.table}>
                <View style={S.tableHdr}>
                  <Text style={{ ...S.tableHdrTx, ...S.colNo }}>#</Text>
                  <Text style={{ ...S.tableHdrTx, flex: 2 }}>Material</Text>
                  <Text style={{ ...S.tableHdrTx, width: 44 }}>Code</Text>
                  <Text style={{ ...S.tableHdrTx, width: 28, textAlign: 'center' }}>Unit</Text>
                  <Text style={{ ...S.tableHdrTx, width: 36, textAlign: 'center' }}>Qty</Text>
                  <Text style={{ ...S.tableHdrTx, width: 50, textAlign: 'right' }}>Unit $</Text>
                  <Text style={{ ...S.tableHdrTx, width: 58, textAlign: 'right' }}>Total</Text>
                </View>
                {snap.bom.map((mat, idx) => (
                  <View key={mat.id} style={idx % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                    <Text style={{ ...S.colNo, fontSize: 8, color: C.faint }}>{idx + 1}</Text>
                    <Text style={{ flex: 2, fontSize: 8.5 }}>{mat.name}</Text>
                    <Text style={{ width: 44, fontSize: 7.5, color: C.muted }}>{mat.productCode || '\u2014'}</Text>
                    <Text style={{ width: 28, fontSize: 8, color: C.muted, textAlign: 'center' }}>{mat.unit}</Text>
                    <Text style={{ width: 36, fontSize: 8.5, textAlign: 'center', fontFamily: 'Helvetica-Bold' }}>
                      {fmt(mat.grandTotal)}
                    </Text>
                    <Text style={{ width: 50, fontSize: 8, textAlign: 'right', color: C.muted }}>
                      {fmtPrice(mat.unitPrice, jobCurrency)}
                    </Text>
                    <Text style={{ width: 58, fontSize: 8, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                      {fmtPrice(mat.lineTotal, jobCurrency)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Work Schedule Summary */}
            {snap.workSchedule && (
              <View style={S.section}>
                <Text style={S.sectionHdr}>Work Schedule</Text>
                <Text style={S.appendixSmall}>
                  {typeof snap.workSchedule === 'string'
                    ? snap.workSchedule
                    : JSON.stringify(snap.workSchedule, null, 2)}
                </Text>
              </View>
            )}

            {/* Cost Totals */}
            <View style={S.section}>
              <Text style={S.sectionHdr}>Cost Totals</Text>
              <View style={S.table}>
                {([
                  ['Material Cost',     snap.totals.materialCost],
                  ['Labour Cost',       snap.totals.labourCost],
                  ['Third Party Cost',  snap.totals.thirdPartyCost],
                  ['Grand Total',       snap.totals.grandTotal],
                ] as [string, number][]).map(([label, value], i) => (
                  <View key={label} style={i === 3 ? S.grandTotalRow : (i % 2 === 0 ? S.tableRow : S.tableRowAlt)}>
                    <Text style={{
                      flex: 1, fontSize: 8.5,
                      fontFamily: i === 3 ? 'Helvetica-Bold' : 'Helvetica',
                      color: i === 3 ? C.white : C.ink,
                    }}>
                      {label}
                    </Text>
                    <Text style={{
                      width: 80, textAlign: 'right', fontSize: 8.5,
                      fontFamily: 'Helvetica-Bold',
                      color: i === 3 ? C.white : C.ink,
                    }}>
                      {fmtPrice(value, jobCurrency)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Footer */}
            <View style={S.footer} fixed>
              <Text style={S.footerTx}>{report.companyName ?? 'Exaktt'}</Text>
              <Text style={S.footerTx} render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              } />
            </View>
          </Page>
        )
      })}
    </Document>
  )
}
