// src/lib/doc-builder/presets.ts
// Default block configurations per document type

import type { DocBlock, DocBranding } from './types'

let _c = 0
function uid() { _c += 1; return `preset_${Date.now()}_${_c}` }

type PresetContext = {
  branding?: DocBranding
  sourceData?: any  // PO, DO, Tender data
}

// ─── Purchase Order ──────────────────────────────────────────────────────────

export function createPOPreset(ctx: PresetContext): DocBlock[] {
  const po = ctx.sourceData
  const supplier = po?.supplier ?? {}
  const lines = (po?.lines ?? []).map((l: any, i: number) => ({
    no: i + 1,
    item: l.itemName ?? '',
    unit: l.itemUnit ?? '',
    qty: l.qtyOrdered ?? 0,
    unitPrice: l.unitPrice ?? 0,
    total: (l.qtyOrdered ?? 0) * (l.unitPrice ?? 0),
  }))

  return [
    { type: 'header', id: uid(), data: { showLogo: true, showRegistration: true, showContact: true } },
    { type: 'meta', id: uid(), data: { fields: [
      { label: 'Document', value: 'PURCHASE ORDER' },
      { label: 'Reference', value: po?.ref ?? '' },
      { label: 'Date', value: po?.orderDate ? new Date(po.orderDate).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '' },
      { label: 'Expected Delivery', value: po?.expectedDate ? new Date(po.expectedDate).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '' },
      { label: 'Status', value: po?.status ?? 'DRAFT' },
    ]}},
    { type: 'recipient', id: uid(), data: {
      label: 'To:',
      name: po?.supplierName ?? supplier.name ?? '',
      contact: supplier.contactPerson ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
    }},
    { type: 'divider', id: uid(), data: { style: 'line' } },
    { type: 'table', id: uid(), data: {
      columns: [
        { key: 'no', label: '#', width: '30px', align: 'center' as const },
        { key: 'item', label: 'Description', align: 'left' as const },
        { key: 'unit', label: 'Unit', width: '50px', align: 'center' as const },
        { key: 'qty', label: 'Qty', width: '50px', align: 'center' as const, format: 'number' as const },
        { key: 'unitPrice', label: 'Unit Price', width: '80px', align: 'right' as const, format: 'currency' as const },
        { key: 'total', label: 'Total', width: '80px', align: 'right' as const, format: 'currency' as const },
      ],
      rows: lines,
      showTotals: true,
      totalLabel: 'Total',
      currency: ctx.branding?.currency ?? 'SGD',
    }},
    { type: 'rich_text', id: uid(), data: {
      tiptapJson: po?.notes
        ? { type: 'doc', content: [
            { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Notes' }] },
            { type: 'paragraph', content: [{ type: 'text', text: po.notes }] },
          ]}
        : { type: 'doc', content: [{ type: 'paragraph' }] },
    }},
    { type: 'rich_text', id: uid(), data: {
      tiptapJson: { type: 'doc', content: [
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Terms & Conditions' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Payment terms and delivery conditions as agreed.' }] },
      ]},
    }},
    { type: 'signature', id: uid(), data: { leftLabel: 'Authorized By', rightLabel: 'Acknowledged By', showDate: true } },
    { type: 'footer', id: uid(), data: { showPageNumbers: true, showCompanyName: true } },
  ]
}

// ─── Delivery Order ──────────────────────────────────────────────────────────

export function createDOPreset(ctx: PresetContext): DocBlock[] {
  const doData = ctx.sourceData
  const lines = (doData?.lines ?? []).map((l: any, i: number) => ({
    no: i + 1,
    item: l.itemName ?? '',
    unit: l.itemUnit ?? '',
    expected: l.qtyExpected ?? 0,
    delivered: l.qtyDelivered ?? 0,
  }))

  return [
    { type: 'header', id: uid(), data: { showLogo: true, showRegistration: true, showContact: true } },
    { type: 'meta', id: uid(), data: { fields: [
      { label: 'Document', value: 'DELIVERY ORDER' },
      { label: 'Reference', value: doData?.ref ?? '' },
      { label: 'PO Reference', value: doData?.po?.ref ?? '' },
      { label: 'Date', value: doData?.expectedDate ? new Date(doData.expectedDate).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '' },
      { label: 'Status', value: doData?.status ?? 'PENDING' },
    ]}},
    { type: 'recipient', id: uid(), data: {
      label: 'Deliver To:',
      name: doData?.po?.supplierName ?? '',
      contact: '',
      email: '',
      address: '',
    }},
    { type: 'divider', id: uid(), data: { style: 'line' } },
    { type: 'table', id: uid(), data: {
      columns: [
        { key: 'no', label: '#', width: '30px', align: 'center' as const },
        { key: 'item', label: 'Description', align: 'left' as const },
        { key: 'unit', label: 'Unit', width: '50px', align: 'center' as const },
        { key: 'expected', label: 'Expected', width: '70px', align: 'center' as const, format: 'number' as const },
        { key: 'delivered', label: 'Delivered', width: '70px', align: 'center' as const, format: 'number' as const },
      ],
      rows: lines,
      showTotals: false,
    }},
    { type: 'rich_text', id: uid(), data: {
      tiptapJson: doData?.notes
        ? { type: 'doc', content: [
            { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Notes' }] },
            { type: 'paragraph', content: [{ type: 'text', text: doData.notes }] },
          ]}
        : { type: 'doc', content: [{ type: 'paragraph' }] },
    }},
    { type: 'signature', id: uid(), data: { leftLabel: 'Delivered By', rightLabel: 'Received By', showDate: true } },
    { type: 'footer', id: uid(), data: { showPageNumbers: true, showCompanyName: true } },
  ]
}

// ─── Blank Document ──────────────────────────────────────────────────────────

export function createBlankPreset(): DocBlock[] {
  return [
    { type: 'header', id: uid(), data: { showLogo: true, showRegistration: true, showContact: true } },
    { type: 'rich_text', id: uid(), data: { tiptapJson: { type: 'doc', content: [{ type: 'paragraph' }] } } },
    { type: 'footer', id: uid(), data: { showPageNumbers: true, showCompanyName: true } },
  ]
}

// ─── Quotation (Tender Report) ──────────────────────────────────────────────

export function createQuotationPreset(ctx: PresetContext): DocBlock[] {
  const report = ctx.sourceData?.report
  const tender = ctx.sourceData?.tender
  const tenderItems = ctx.sourceData?.tenderItems ?? []

  // Build line items from tender items
  const lines = tenderItems.map((ti: any, i: number) => {
    const job = ti.job
    const system = ti.system
    const amount = job?.lastResults?.totals?.grandTotal ?? 0
    return {
      no: i + 1,
      description: `${system?.name ?? 'System'} — ${job?.name ?? 'Job'}`,
      amount,
      total: amount,
    }
  })

  // Build text content blocks from templates/existing sections
  const existingSections = report?.sections ?? []
  const textBlocks: DocBlock[] = existingSections
    .filter((s: any) => s.type === 'text_block')
    .map((s: any) => ({
      type: 'rich_text' as const,
      id: uid(),
      data: {
        tiptapJson: {
          type: 'doc',
          content: [
            ...(s.title ? [{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: s.title }] }] : []),
            ...(s.content ? [{ type: 'paragraph', content: [{ type: 'text', text: s.content }] }] : [{ type: 'paragraph' }]),
          ],
        },
      },
    }))

  const currency = report?.currency ?? ctx.branding?.currency ?? 'SGD'

  return [
    { type: 'header', id: uid(), data: { showLogo: true, showRegistration: true, showContact: true } },
    { type: 'meta', id: uid(), data: { fields: [
      { label: 'Document', value: 'QUOTATION' },
      { label: 'Reference', value: report?.reference ?? '' },
      { label: 'Date', value: report?.date ? new Date(report.date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) },
      { label: 'Valid Until', value: report?.validUntil ? new Date(report.validUntil).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : '' },
      { label: 'Prepared By', value: report?.preparedBy ?? '' },
      { label: 'Revision', value: report?.revisionNo ?? '1' },
    ]}},
    { type: 'recipient', id: uid(), data: {
      label: 'To:',
      name: report?.clientName ?? '',
      contact: report?.clientContact ?? '',
      email: report?.clientEmail ?? '',
      address: report?.clientAddr ?? '',
    }},
    { type: 'divider', id: uid(), data: { style: 'line' } },
    ...(lines.length > 0 ? [{
      type: 'table' as const,
      id: uid(),
      data: {
        columns: [
          { key: 'no', label: '#', width: '30px', align: 'center' as const },
          { key: 'description', label: 'Description', align: 'left' as const },
          { key: 'amount', label: 'Amount', width: '100px', align: 'right' as const, format: 'currency' as const },
          { key: 'total', label: 'Total', width: '100px', align: 'right' as const, format: 'currency' as const },
        ],
        rows: lines,
        showTotals: true,
        totalLabel: 'Subtotal',
        currency,
      },
    }] : [{
      type: 'table' as const,
      id: uid(),
      data: {
        columns: [
          { key: 'no', label: '#', width: '30px', align: 'center' as const },
          { key: 'description', label: 'Description', align: 'left' as const },
          { key: 'qty', label: 'Qty', width: '50px', align: 'center' as const, format: 'number' as const },
          { key: 'unitPrice', label: 'Unit Price', width: '100px', align: 'right' as const, format: 'currency' as const },
          { key: 'total', label: 'Total', width: '100px', align: 'right' as const, format: 'currency' as const },
        ],
        rows: [],
        showTotals: true,
        totalLabel: 'Subtotal',
        currency,
      },
    }]),
    ...textBlocks,
    ...(report?.paymentTerms ? [{
      type: 'rich_text' as const,
      id: uid(),
      data: {
        tiptapJson: { type: 'doc', content: [
          { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Payment Terms' }] },
          { type: 'paragraph', content: [{ type: 'text', text: report.paymentTerms }] },
        ]},
      },
    }] : []),
    ...(report?.disclaimer ? [{
      type: 'rich_text' as const,
      id: uid(),
      data: {
        tiptapJson: { type: 'doc', content: [
          { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Disclaimer' }] },
          { type: 'paragraph', content: [{ type: 'text', text: report.disclaimer }] },
        ]},
      },
    }] : []),
    ...(report?.notes ? [{
      type: 'rich_text' as const,
      id: uid(),
      data: {
        tiptapJson: { type: 'doc', content: [
          { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Notes' }] },
          { type: 'paragraph', content: [{ type: 'text', text: report.notes }] },
        ]},
      },
    }] : []),
    { type: 'signature', id: uid(), data: { leftLabel: 'Prepared By', rightLabel: 'Accepted By', showDate: true } },
    { type: 'footer', id: uid(), data: { showPageNumbers: true, showCompanyName: true } },
  ]
}

export const PRESET_MAP: Record<string, (ctx: PresetContext) => DocBlock[]> = {
  purchase_order: createPOPreset,
  delivery_order: createDOPreset,
  quotation: createQuotationPreset,
  custom: () => createBlankPreset(),
}
