// src/components/doc-builder/blocks/ImageBlock.tsx
'use client'
import { useState } from 'react'
import { Upload, Trash2, Loader2 } from 'lucide-react'
import type { DocBlock } from '@/lib/doc-builder/types'

type Block = Extract<DocBlock, { type: 'image' }>

interface Props {
  block: Block
  onChange: (data: Block['data']) => void
  documentId?: string
}

export default function ImageBlock({ block, onChange, documentId }: Props) {
  const [uploading, setUploading] = useState(false)
  const { images, columns } = block.data

  async function handleUpload() {
    if (!documentId) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async () => {
      const files = input.files
      if (!files?.length) return
      setUploading(true)
      try {
        const newImages = [...images]
        for (const file of Array.from(files)) {
          const form = new FormData()
          form.append('file', file)
          const res = await fetch(`/api/documents/${documentId}/upload`, { method: 'POST', body: form })
          const json = await res.json()
          if (json.data?.url) {
            newImages.push({ url: json.data.url })
          }
        }
        onChange({ ...block.data, images: newImages })
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  function removeImage(idx: number) {
    onChange({ ...block.data, images: images.filter((_, i) => i !== idx) })
  }

  function updateCaption(idx: number, caption: string) {
    const next = [...images]
    next[idx] = { ...next[idx], caption }
    onChange({ ...block.data, images: next })
  }

  return (
    <div className="mb-4 group/img">
      {images.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img src={img.url} alt="" className="w-full object-contain rounded max-h-48" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 p-1 bg-white/90 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
              <input
                value={img.caption ?? ''}
                onChange={e => updateCaption(i, e.target.value)}
                className="mt-1 w-full text-[10px] text-ink-faint bg-transparent outline-none text-center
                  hover:bg-surface-50 focus:bg-surface-50 rounded px-1 transition-colors"
                placeholder="Caption"
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload button — hover reveal */}
      <div className="flex items-center gap-2 mt-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="text-[10px] text-ink-faint hover:text-ink inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-surface-50 rounded transition-colors"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          Upload Image
        </button>
      </div>

      {images.length === 0 && (
        <div className="py-6 flex flex-col items-center justify-center text-ink-faint gap-2 border border-dashed border-surface-200 rounded-lg">
          <Upload className="w-5 h-5" />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="text-[11px] hover:text-ink transition-colors"
          >
            {uploading ? 'Uploading...' : 'Click to upload images'}
          </button>
        </div>
      )}
    </div>
  )
}
