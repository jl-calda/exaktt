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
    <div className="p-3 space-y-2">
      {images.length > 0 && (
        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img src={img.url} alt="" className="w-full h-24 object-cover rounded" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 p-0.5 bg-white/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
              <input
                value={img.caption ?? ''}
                onChange={e => updateCaption(i, e.target.value)}
                className="mt-1 w-full text-[9px] text-ink-muted bg-transparent outline-none text-center"
                placeholder="Caption"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={handleUpload} disabled={uploading} className="btn-ghost text-[10px] inline-flex items-center gap-1 px-2 py-0.5">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          Upload Image
        </button>
        <select
          value={columns}
          onChange={e => onChange({ ...block.data, columns: Number(e.target.value) })}
          className="text-[10px] px-1.5 py-0.5 border border-surface-200 rounded bg-surface-50"
        >
          <option value={1}>1 Column</option>
          <option value={2}>2 Columns</option>
          <option value={3}>3 Columns</option>
          <option value={4}>4 Columns</option>
        </select>
      </div>
    </div>
  )
}
