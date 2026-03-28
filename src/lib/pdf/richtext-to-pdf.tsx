// src/lib/pdf/richtext-to-pdf.tsx
// Converts Tiptap JSON content → @react-pdf/renderer components

import React from 'react'
import { Text, View, Image } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'

type TiptapNode = {
  type: string
  attrs?: Record<string, any>
  content?: TiptapNode[]
  marks?: { type: string; attrs?: Record<string, any> }[]
  text?: string
}

const FONT_MAP: Record<string, string> = {
  'Inter': 'Helvetica',
  'serif': 'Times-Roman',
  'monospace': 'Courier',
}

function resolveFont(family?: string): string {
  if (!family) return 'Helvetica'
  return FONT_MAP[family] ?? 'Helvetica'
}

function renderMarks(text: string, marks?: TiptapNode['marks']): React.ReactElement {
  const style: Style = { fontSize: 8.5 }

  if (marks) {
    for (const mark of marks) {
      switch (mark.type) {
        case 'bold':
          style.fontFamily = (style.fontFamily ?? 'Helvetica') === 'Helvetica'
            ? 'Helvetica-Bold' : style.fontFamily
          break
        case 'italic':
          style.fontStyle = 'italic'
          break
        case 'underline':
          style.textDecoration = 'underline'
          break
        case 'textStyle':
          if (mark.attrs?.fontFamily) {
            style.fontFamily = resolveFont(mark.attrs.fontFamily)
          }
          if (mark.attrs?.fontSize) {
            style.fontSize = parseInt(mark.attrs.fontSize, 10) || 8.5
          }
          if (mark.attrs?.color) {
            style.color = mark.attrs.color
          }
          break
      }
    }
  }

  return <Text style={style}>{text}</Text>
}

function renderNode(node: TiptapNode, key: number): React.ReactElement | null {
  switch (node.type) {
    case 'doc':
      return (
        <View key={key}>
          {node.content?.map((child, i) => renderNode(child, i))}
        </View>
      )

    case 'paragraph': {
      const align = node.attrs?.textAlign ?? 'left'
      return (
        <View key={key} style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 8.5, color: '#1e293b', lineHeight: 1.6, textAlign: align }}>
            {node.content?.map((child, i) => renderNode(child, i)) ?? ' '}
          </Text>
        </View>
      )
    }

    case 'heading': {
      const level = node.attrs?.level ?? 2
      const sizes: Record<number, number> = { 1: 14, 2: 11, 3: 9.5 }
      return (
        <View key={key} style={{ marginBottom: 4, marginTop: level === 1 ? 8 : 4 }}>
          <Text style={{
            fontSize: sizes[level] ?? 9.5,
            fontFamily: 'Helvetica-Bold',
            color: '#1e293b',
          }}>
            {node.content?.map((child, i) => renderNode(child, i))}
          </Text>
        </View>
      )
    }

    case 'bulletList':
      return (
        <View key={key} style={{ marginBottom: 4, paddingLeft: 12 }}>
          {node.content?.map((child, i) => renderNode(child, i))}
        </View>
      )

    case 'orderedList':
      return (
        <View key={key} style={{ marginBottom: 4, paddingLeft: 12 }}>
          {node.content?.map((child, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 2 }}>
              <Text style={{ fontSize: 8.5, color: '#64748b', width: 16 }}>{i + 1}.</Text>
              <View style={{ flex: 1 }}>
                {child.content?.map((c, j) => renderNode(c, j))}
              </View>
            </View>
          ))}
        </View>
      )

    case 'listItem':
      return (
        <View key={key} style={{ flexDirection: 'row', marginBottom: 2 }}>
          <Text style={{ fontSize: 8.5, color: '#64748b', width: 10 }}>{'\u2022'}</Text>
          <View style={{ flex: 1 }}>
            {node.content?.map((child, i) => renderNode(child, i))}
          </View>
        </View>
      )

    case 'text':
      return <React.Fragment key={key}>{renderMarks(node.text ?? '', node.marks)}</React.Fragment>

    case 'image':
      return (
        <View key={key} style={{ marginVertical: 6 }}>
          <Image src={node.attrs?.src} style={{ maxHeight: 200, objectFit: 'contain' }} />
        </View>
      )

    case 'hardBreak':
      return <Text key={key}>{'\n'}</Text>

    default:
      // Render children for unknown node types
      if (node.content) {
        return (
          <View key={key}>
            {node.content.map((child, i) => renderNode(child, i))}
          </View>
        )
      }
      return null
  }
}

export function renderTiptapToPdf(json: TiptapNode | null | undefined): React.ReactElement {
  if (!json) return <View />
  return renderNode(json, 0) ?? <View />
}
