// src/lib/doc-builder/types.ts
// Block type definitions for the universal document builder

export type TableColumn = {
  key: string
  label: string
  width?: string      // e.g. '30%', '80px'
  align?: 'left' | 'center' | 'right'
  format?: 'text' | 'number' | 'currency'
}

// ─── Block Types ─────────────────────────────────────────────────────────────

export type HeaderBlockData = {
  showLogo: boolean
  showRegistration: boolean
  showContact: boolean
}

export type MetaBlockData = {
  fields: { label: string; value: string }[]
}

export type RecipientBlockData = {
  label: string       // 'To:', 'Bill To:', 'Ship To:'
  name: string
  contact?: string
  email?: string
  address?: string
}

export type RichTextBlockData = {
  tiptapJson: any     // Tiptap JSON content
}

export type TableBlockData = {
  columns: TableColumn[]
  rows: Record<string, any>[]
  showTotals: boolean
  totalLabel?: string
  currency?: string
}

export type ImageBlockData = {
  images: { url: string; caption?: string; width?: number }[]
  columns: number     // 1-4
}

export type SignatureBlockData = {
  leftLabel: string
  rightLabel: string
  showDate: boolean
}

export type DataSnapshotBlockData = {
  sourceType: string  // 'calculator_run', 'material_list', 'bom', etc.
  sourceId: string
  label: string
  snapshot: any       // Snapshotted data (frozen at insert time)
}

export type SpacerBlockData = {
  height: number      // in pt
}

export type DividerBlockData = {
  style: 'line' | 'thick' | 'double'
}

export type FooterBlockData = {
  showPageNumbers: boolean
  showCompanyName: boolean
  customText?: string
}

export type CellData = {
  value: string
  formula?: string
  format?: 'text' | 'number' | 'currency' | 'percent'
  bold?: boolean
  align?: 'left' | 'center' | 'right'
}

export type SpreadsheetBlockData = {
  columns: number
  rows: number
  cells: Record<string, CellData>
  columnWidths?: Record<string, number>
}

export type PageBreakBlockData = Record<string, never>

export type ColumnCellContent =
  | { type: 'text'; tiptapJson: any }
  | { type: 'image'; url: string; caption?: string }

export type MultiColumnBlockData = {
  columns: number               // 2, 3, or 4
  cells: ColumnCellContent[]    // one per column
  gap?: number                  // gap in px, default 16
}

// ─── Discriminated Union ─────────────────────────────────────────────────────

export type DocBlock =
  | { type: 'header';        id: string; data: HeaderBlockData }
  | { type: 'meta';          id: string; data: MetaBlockData }
  | { type: 'recipient';     id: string; data: RecipientBlockData }
  | { type: 'rich_text';     id: string; data: RichTextBlockData }
  | { type: 'table';         id: string; data: TableBlockData }
  | { type: 'image';         id: string; data: ImageBlockData }
  | { type: 'signature';     id: string; data: SignatureBlockData }
  | { type: 'data_snapshot'; id: string; data: DataSnapshotBlockData }
  | { type: 'spacer';        id: string; data: SpacerBlockData }
  | { type: 'divider';       id: string; data: DividerBlockData }
  | { type: 'footer';        id: string; data: FooterBlockData }
  | { type: 'spreadsheet';   id: string; data: SpreadsheetBlockData }
  | { type: 'page_break';    id: string; data: PageBreakBlockData }
  | { type: 'multi_column';  id: string; data: MultiColumnBlockData }

export type DocBlockType = DocBlock['type']

// ─── Estimate (for inserting calculator results into tables) ─────────────────

export type DocEstimate = {
  id: string
  systemName: string
  jobName: string
  description: string
  amount: number
  resultSnapshot?: any
}

// ─── Document Settings ───────────────────────────────────────────────────────

export type DocSettings = {
  accentColor?: string
  currency?: string
  pageSize?: 'A4' | 'LETTER' | 'LEGAL'
  margins?: { top: number; right: number; bottom: number; left: number }
}

// ─── Document Template ───────────────────────────────────────────────────────

export type DocTemplate = {
  id: string
  name: string
  docType: string     // 'purchase_order', 'delivery_order', 'quotation', 'custom'
  blocks: DocBlock[]
  settings?: DocSettings
}

// ─── Branding (snapshot from Profile) ────────────────────────────────────────

export type DocBranding = {
  companyName?: string | null
  companyLogo?: string | null
  companyAddr?: string | null
  registrationNo?: string | null
  registrationLabel?: string | null
  accentColor?: string | null
  currency: string
}
