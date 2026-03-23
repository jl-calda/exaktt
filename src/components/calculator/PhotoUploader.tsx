// src/components/calculator/PhotoUploader.tsx
'use client'
import { useState } from 'react'
import { Camera, X } from 'lucide-react'
import { compressToThumb } from '@/lib/utils'

interface Props {
  photo:   string | null
  onPhoto: (photo: string | null) => void
  size?:   number
}

export function MatPhoto({ photo, size = 28, className = '' }: { photo: string | null; size?: number; className?: string }) {
  const [preview, setPreview] = useState(false)
  if (!photo) return null
  return (
    <>
      <img src={photo} alt="material"
        onClick={() => setPreview(true)}
        style={{ width: size, height: size }}
        className={`object-cover rounded cursor-pointer border border-surface-300 flex-shrink-0 ${className}`} />
      {preview && (
        <div onClick={() => setPreview(false)}
          className="fixed inset-0 bg-ink/80 z-[200] flex items-center justify-center cursor-pointer">
          <img src={photo} alt="material" className="max-w-[80vw] max-h-[80vh] object-contain rounded-xl shadow-float" />
        </div>
      )}
    </>
  )
}

export default function PhotoUploader({ photo, onPhoto, size = 36 }: Props) {
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const thumb = await compressToThumb(file)
      onPhoto(thumb)
    } catch (err) {
      console.error('Photo compress failed:', err)
    }
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      {photo ? (
        <>
          <MatPhoto photo={photo} size={size} />
          <label className="btn-ghost text-xs py-1.5 px-2.5 cursor-pointer flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" /> Replace
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
          <button onClick={() => onPhoto(null)} className="btn-ghost text-xs py-1.5 px-2 text-red-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <label className="flex items-center gap-1.5 border-2 border-dashed border-surface-300 rounded-lg px-3 py-2 text-xs text-ink-faint hover:border-primary/40 hover:text-primary cursor-pointer transition-colors">
          <Camera className="w-3.5 h-3.5" /> Add Photo
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      )}
      <span className="text-[9px] text-ink-faint">~120×120px</span>
    </div>
  )
}
