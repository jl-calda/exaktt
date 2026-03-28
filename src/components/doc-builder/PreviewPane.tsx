// src/components/doc-builder/PreviewPane.tsx
'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Download, Loader2, RefreshCw } from 'lucide-react'
import type { DocBlock, DocBranding, DocSettings } from '@/lib/doc-builder/types'

interface Props {
  blocks: DocBlock[]
  branding: DocBranding
  settings?: DocSettings | null
  title: string
  documentId?: string
}

export default function PreviewPane({ blocks, branding, settings, title, documentId }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const prevBlobUrl = useRef<string | null>(null)

  const generatePreview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Dynamic import to avoid SSR issues with @react-pdf/renderer
      const { pdf } = await import('@react-pdf/renderer')
      const { RenderDocument } = await import('@/lib/pdf/render')
      const React = await import('react')

      const element = React.createElement(RenderDocument, {
        title,
        blocks,
        branding,
        settings: settings ?? undefined,
      })

      const blob = await pdf(element as any).toBlob()
      const url = URL.createObjectURL(blob)

      // Revoke previous blob URL
      if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current)
      prevBlobUrl.current = url
      setPdfUrl(url)
    } catch (err: any) {
      setError(err?.message ?? 'PDF generation failed')
      console.error('Preview error:', err)
    } finally {
      setLoading(false)
    }
  }, [blocks, branding, settings, title])

  // Debounced auto-refresh
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(generatePreview, 800)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [generatePreview])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current)
    }
  }, [])

  async function handleDownload() {
    if (!documentId) {
      // Generate and download directly from client
      if (pdfUrl) {
        const a = document.createElement('a')
        a.href = pdfUrl
        a.download = (title || 'document').replace(/[^a-z0-9_-]/gi, '_') + '.pdf'
        a.click()
      }
      return
    }
    // Download from server API
    try {
      const res = await fetch(`/api/documents/${documentId}/pdf`)
      if (!res.ok) throw new Error('PDF download failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = (title || 'document').replace(/[^a-z0-9_-]/gi, '_') + '.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      console.error('Download error:', err)
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-100/40">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-200 bg-surface-50">
        <span className="text-[10px] font-semibold text-ink-muted flex-1">Preview</span>
        <button onClick={generatePreview} className="btn-ghost p-1" title="Refresh preview">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={handleDownload} className="btn-ghost inline-flex items-center gap-1 px-2 py-1 text-[10px]" title="Download PDF">
          <Download className="w-3.5 h-3.5" />
          <span>PDF</span>
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-hidden p-4 flex items-start justify-center">
        {loading && !pdfUrl && (
          <div className="flex items-center gap-2 text-ink-faint text-[11px] py-12">
            <Loader2 className="w-4 h-4 animate-spin" /> Generating preview...
          </div>
        )}
        {error && (
          <div className="text-red-500 text-[11px] py-12 text-center">
            Preview error: {error}
          </div>
        )}
        {pdfUrl && (
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            className="w-full bg-white rounded-lg shadow-sm"
            style={{ height: 'calc(100vh - 140px)', maxWidth: '595px' }}
            title="PDF Preview"
          />
        )}
      </div>
    </div>
  )
}
