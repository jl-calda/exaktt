// src/components/ui/ConfirmModal.tsx
import { Modal } from './Modal'
import { Button } from './Button'
import { Trash2 } from 'lucide-react'

interface Props {
  open:          boolean
  title?:        string
  message?:      string
  confirmLabel?: string
  onConfirm:     () => void
  onCancel:      () => void
}

export function ConfirmModal({
  open, title = 'Delete?', message = 'This action cannot be undone.',
  confirmLabel = 'Delete', onConfirm, onCancel,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <Trash2 className="w-4 h-4 text-red-500" />
        </div>
        <div>
          <div className="font-semibold text-sm text-ink">{title}</div>
          {message && <p className="text-xs text-ink-faint mt-1">{message}</p>}
        </div>
        <div className="flex gap-2 w-full pt-1">
          <Button variant="secondary" size="sm" fullWidth onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" fullWidth onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  )
}
