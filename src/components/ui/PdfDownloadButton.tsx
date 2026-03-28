// src/components/ui/PdfDownloadButton.tsx
'use client'
import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface Props {
  url: string
  filename?: string
  label?: string
  className?: string
}

export default function PdfDownloadButton({ url, filename, label, className }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename ?? 'document.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      console.error('PDF download failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={className ?? 'btn-ghost inline-flex items-center gap-1.5 px-2 py-1 text-[11px]'}
      title={label ?? 'Download PDF'}
    >
      {loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <Download className="w-3.5 h-3.5" />
      }
      {label && <span>{label}</span>}
    </button>
  )
}
