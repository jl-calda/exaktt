// src/lib/pdf/styles.ts
// Shared PDF styles and color tokens for @react-pdf/renderer

import { StyleSheet } from '@react-pdf/renderer'

export function colors(accent?: string | null) {
  return {
    primary: accent ?? '#7917de',
    ink:     '#1e293b',
    muted:   '#64748b',
    faint:   '#94a3b8',
    surface: '#f8fafc',
    border:  '#e2e8f0',
    white:   '#ffffff',
  }
}

export function baseStyles(accent?: string | null) {
  const C = colors(accent)

  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: C.ink,
      padding: '28pt 32pt 48pt 32pt',
      backgroundColor: C.white,
    },

    // ── Header ─────────────────────────────────────
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 18,
      paddingBottom: 14,
      borderBottom: '2pt solid ' + C.primary,
    },
    logoBox: {
      width: 80, height: 40,
      backgroundColor: C.surface,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    companyCol: { flex: 1, paddingLeft: 12 },
    companyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 2 },
    companyAddr: { fontSize: 8, color: C.muted, lineHeight: 1.5 },

    // ── Meta fields ────────────────────────────────
    metaBlock: { alignItems: 'flex-end' },
    metaRow: { flexDirection: 'row', marginBottom: 2 },
    metaLabel: { fontSize: 7.5, color: C.faint, width: 80, textAlign: 'right', marginRight: 5 },
    metaValue: { fontSize: 7.5, color: C.ink, fontFamily: 'Helvetica-Bold' },

    // ── Recipient ──────────────────────────────────
    recipientBlock: {
      marginBottom: 14,
      padding: '10pt 12pt',
      backgroundColor: C.surface,
      borderRadius: 5,
      borderLeft: '3pt solid ' + C.primary,
    },
    recipientLabel: { fontSize: 7.5, color: C.faint, marginBottom: 2 },
    recipientName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 2 },
    recipientDetail: { fontSize: 8, color: C.muted, lineHeight: 1.5 },

    // ── Table ──────────────────────────────────────
    tableHdr: {
      flexDirection: 'row',
      backgroundColor: C.ink,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    tableHdrText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.white },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderBottom: '0.5pt solid ' + C.border,
    },
    tableRowAlt: {
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderBottom: '0.5pt solid ' + C.border,
      backgroundColor: C.surface,
    },
    subtotalRow: {
      flexDirection: 'row',
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderTop: '1pt solid ' + C.border,
      backgroundColor: C.surface,
    },
    grandTotalRow: {
      flexDirection: 'row',
      paddingVertical: 6,
      paddingHorizontal: 6,
      backgroundColor: C.ink,
      marginTop: 2,
    },

    // ── Text blocks ────────────────────────────────
    textBlockWrap: { marginBottom: 10 },
    textBlockTitle: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.ink, marginBottom: 3 },
    textBlockContent: { fontSize: 8.5, color: C.muted, lineHeight: 1.6 },

    // ── Signature ──────────────────────────────────
    signatureBlock: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 30,
      paddingHorizontal: 12,
    },
    signatureCol: {
      width: '42%',
    },
    signatureLine: {
      borderBottom: '1pt solid ' + C.ink,
      marginBottom: 4,
      height: 40,
    },
    signatureLabel: { fontSize: 8, color: C.muted },
    signatureDate: { fontSize: 7.5, color: C.faint, marginTop: 8 },

    // ── Divider ────────────────────────────────────
    dividerLine: {
      borderBottom: '0.5pt solid ' + C.border,
      marginVertical: 8,
    },
    dividerThick: {
      borderBottom: '2pt solid ' + C.border,
      marginVertical: 10,
    },
    dividerDouble: {
      borderBottom: '0.5pt solid ' + C.border,
      marginTop: 8,
      marginBottom: 3,
    },

    // ── Footer ─────────────────────────────────────
    footer: {
      position: 'absolute',
      bottom: 16, left: 32, right: 32,
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTop: '0.5pt solid ' + C.border,
      paddingTop: 5,
    },
    footerText: { fontSize: 7, color: C.faint },
  })
}
