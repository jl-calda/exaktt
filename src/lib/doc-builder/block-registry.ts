// src/lib/doc-builder/block-registry.ts
// Registry of all block types with metadata for the block palette

import type { DocBlockType, DocBlock } from './types'

export type PaletteCategory = 'layout' | 'content' | 'data' | 'signature'

export type BlockMeta = {
  type: DocBlockType
  label: string
  icon: string         // Lucide icon name
  category: PaletteCategory
  description: string
  createDefault: () => DocBlock
}

let _counter = 0
function uid() {
  _counter += 1
  return `blk_${Date.now()}_${_counter}`
}

export const BLOCK_REGISTRY: BlockMeta[] = [
  // ── Layout ───────────────────────────────────────────
  {
    type: 'header',
    label: 'Company Header',
    icon: 'Building2',
    category: 'layout',
    description: 'Company logo, name, address, and registration',
    createDefault: () => ({
      type: 'header', id: uid(),
      data: { showLogo: true, showRegistration: true, showContact: true },
    }),
  },
  {
    type: 'footer',
    label: 'Page Footer',
    icon: 'PanelBottom',
    category: 'layout',
    description: 'Company name and page numbers at bottom',
    createDefault: () => ({
      type: 'footer', id: uid(),
      data: { showPageNumbers: true, showCompanyName: true },
    }),
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: 'Minus',
    category: 'layout',
    description: 'Horizontal line separator',
    createDefault: () => ({
      type: 'divider', id: uid(),
      data: { style: 'line' },
    }),
  },
  {
    type: 'spacer',
    label: 'Spacer',
    icon: 'Space',
    category: 'layout',
    description: 'Empty vertical space',
    createDefault: () => ({
      type: 'spacer', id: uid(),
      data: { height: 20 },
    }),
  },

  // ── Content ──────────────────────────────────────────
  {
    type: 'meta',
    label: 'Document Info',
    icon: 'FileText',
    category: 'content',
    description: 'Key-value fields (reference, date, status)',
    createDefault: () => ({
      type: 'meta', id: uid(),
      data: { fields: [
        { label: 'Reference', value: '' },
        { label: 'Date', value: '' },
        { label: 'Status', value: '' },
      ]},
    }),
  },
  {
    type: 'recipient',
    label: 'Recipient',
    icon: 'UserCircle',
    category: 'content',
    description: 'To: block with name, contact, address',
    createDefault: () => ({
      type: 'recipient', id: uid(),
      data: { label: 'To:', name: '', contact: '', email: '', address: '' },
    }),
  },
  {
    type: 'rich_text',
    label: 'Rich Text',
    icon: 'Type',
    category: 'content',
    description: 'Paragraphs with bold, italic, headings, lists',
    createDefault: () => ({
      type: 'rich_text', id: uid(),
      data: { tiptapJson: { type: 'doc', content: [{ type: 'paragraph' }] } },
    }),
  },
  {
    type: 'table',
    label: 'Table',
    icon: 'Table',
    category: 'content',
    description: 'Data table with columns and rows',
    createDefault: () => ({
      type: 'table', id: uid(),
      data: {
        columns: [
          { key: 'item', label: 'Item', align: 'left' },
          { key: 'qty', label: 'Qty', align: 'center' },
          { key: 'price', label: 'Price', align: 'right', format: 'currency' },
        ],
        rows: [],
        showTotals: false,
      },
    }),
  },
  {
    type: 'image',
    label: 'Image',
    icon: 'Image',
    category: 'content',
    description: 'Image grid (1–4 columns)',
    createDefault: () => ({
      type: 'image', id: uid(),
      data: { images: [], columns: 1 },
    }),
  },

  // ── Data ─────────────────────────────────────────────
  {
    type: 'data_snapshot',
    label: 'Data Snapshot',
    icon: 'Database',
    category: 'data',
    description: 'Snapshot of calculator run, BOM, or material list',
    createDefault: () => ({
      type: 'data_snapshot', id: uid(),
      data: { sourceType: '', sourceId: '', label: 'Data', snapshot: null },
    }),
  },

  // ── Signature ────────────────────────────────────────
  {
    type: 'signature',
    label: 'Signature',
    icon: 'PenLine',
    category: 'signature',
    description: 'Signature lines for two parties',
    createDefault: () => ({
      type: 'signature', id: uid(),
      data: { leftLabel: 'Authorized By', rightLabel: 'Received By', showDate: true },
    }),
  },
]

export const BLOCK_MAP = Object.fromEntries(
  BLOCK_REGISTRY.map(b => [b.type, b])
) as Record<DocBlockType, BlockMeta>

export function createBlock(type: DocBlockType): DocBlock {
  return BLOCK_MAP[type].createDefault()
}
