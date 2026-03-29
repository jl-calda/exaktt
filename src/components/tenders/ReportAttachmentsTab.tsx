// src/components/tenders/ReportAttachmentsTab.tsx
'use client'
import { useState } from 'react'
import { Upload, Trash2, Loader2, FileText, Image as ImageIcon, GripVertical, Eye, EyeOff } from 'lucide-react'

interface Attachment {
  id: string
  url: string
  name: string
  type: string  // 'image' | 'pdf' | 'other'
  includeInPdf: boolean
}

interface Props {
  reportId: string
  tenderId: string
  initialAttachments: Attachment[]
}

let _aid = 0
function aid() { _aid++; return `att_${Date.now()}_${_aid}` }

export default function ReportAttachmentsTab({ reportId, tenderId, initialAttachments }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleUpload() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,.pdf'
    input.multiple = true
    input.onchange = async () => {
      const files = input.files
      if (!files?.length) return
      setUploading(true)
      try {
        const newAtts: Attachment[] = []
        for (const file of Array.from(files)) {
          const form = new FormData()
          form.append('file', file)
          const res = await fetch(`/api/documents/${reportId}/upload`, { method: 'POST', body: form })
          const json = await res.json()
          if (json.data?.url) {
            const isImage = file.type.startsWith('image/')
            const isPdf = file.type === 'application/pdf'
            newAtts.push({
              id: aid(),
              url: json.data.url,
              name: file.name,
              type: isImage ? 'image' : isPdf ? 'pdf' : 'other',
              includeInPdf: true,
            })
          }
        }
        const updated = [...attachments, ...newAtts]
        setAttachments(updated)
        await saveAttachments(updated)
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  async function removeAttachment(id: string) {
    const updated = attachments.filter(a => a.id !== id)
    setAttachments(updated)
    await saveAttachments(updated)
  }

  async function toggleInclude(id: string) {
    const updated = attachments.map(a => a.id === id ? { ...a, includeInPdf: !a.includeInPdf } : a)
    setAttachments(updated)
    await saveAttachments(updated)
  }

  async function saveAttachments(atts: Attachment[]) {
    setSaving(true)
    try {
      await fetch(`/api/tenders/${tenderId}/report`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, attachments: atts }),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full px-4 py-4 md:px-6 md:py-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Attachments</h3>
          <p className="text-[11px] text-ink-faint mt-0.5">
            Upload files to append to the final PDF. Toggle visibility per attachment.
          </p>
        </div>
        <button onClick={handleUpload} disabled={uploading} className="btn-primary text-[11px]">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Upload
        </button>
      </div>

      {attachments.length === 0 ? (
        <div className="card py-12 flex flex-col items-center justify-center text-ink-faint gap-3">
          <Upload className="w-6 h-6" />
          <p className="text-[12px]">No attachments yet</p>
          <button onClick={handleUpload} disabled={uploading} className="text-[11px] text-primary hover:underline">
            Click to upload images or PDFs
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map(att => (
            <div key={att.id} className="card p-3 flex items-center gap-3 group">
              <GripVertical className="w-3.5 h-3.5 text-ink-faint cursor-grab shrink-0" />

              {/* Preview */}
              <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 overflow-hidden">
                {att.type === 'image' ? (
                  <img src={att.url} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : att.type === 'pdf' ? (
                  <FileText className="w-4 h-4 text-red-500" />
                ) : (
                  <FileText className="w-4 h-4 text-ink-faint" />
                )}
              </div>

              {/* Name + type */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-ink truncate">{att.name}</div>
                <div className="text-[10px] text-ink-faint">{att.type === 'image' ? 'Image' : att.type === 'pdf' ? 'PDF' : 'File'}</div>
              </div>

              {/* Include in PDF toggle */}
              <button
                onClick={() => toggleInclude(att.id)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  att.includeInPdf
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-surface-100 text-ink-faint'
                }`}
                title={att.includeInPdf ? 'Included in PDF' : 'Excluded from PDF'}
              >
                {att.includeInPdf ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {att.includeInPdf ? 'In PDF' : 'Hidden'}
              </button>

              {/* Delete */}
              <button
                onClick={() => removeAttachment(att.id)}
                className="p-1.5 text-ink-faint hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {saving && <div className="text-[10px] text-ink-faint text-center mt-3">Saving...</div>}
    </div>
  )
}
