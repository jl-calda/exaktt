// src/components/projects/ProjectFormModal.tsx
'use client'
import { useState } from 'react'
import { X, MapPin, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const STATUS_OPTIONS = [
  { value: 'PLANNING',  label: 'Planning' },
  { value: 'ACTIVE',    label: 'Active' },
  { value: 'ON_HOLD',   label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

interface Props {
  initial?: {
    name?: string
    clientName?: string
    address?: string
    contractValue?: number
    status?: string
    startDate?: string
    endDate?: string
    managerId?: string
    managerName?: string
    longitude?: number
    latitude?: number
    quotationNo?: string
    tenderId?: string
    reportId?: string
    systemIds?: string[]
  }
  clients?: { id: string; name: string; address?: string | null }[]
  members?: { userId: string; user: { id: string; name: string | null; email: string } }[]
  onSave: (data: any) => void
  onClose: () => void
}

export default function ProjectFormModal({ initial, clients, members, onSave, onClose }: Props) {
  const [name, setName]               = useState(initial?.name ?? '')
  const [clientName, setClientName]   = useState(initial?.clientName ?? '')
  const [address, setAddress]         = useState(initial?.address ?? '')
  const [contractValue, setContractValue] = useState(initial?.contractValue ?? 0)
  const [status, setStatus]           = useState(initial?.status ?? 'PLANNING')
  const [startDate, setStartDate]     = useState(initial?.startDate ?? '')
  const [endDate, setEndDate]         = useState(initial?.endDate ?? '')
  const [managerName, setManagerName] = useState(initial?.managerName ?? '')
  const [managerId, setManagerId]     = useState(initial?.managerId ?? '')
  const [latitude, setLatitude]       = useState<number | null>(initial?.latitude ?? null)
  const [longitude, setLongitude]     = useState<number | null>(initial?.longitude ?? null)
  const [geocoding, setGeocoding]     = useState(false)
  const [saving, setSaving]           = useState(false)

  const handleGeocode = async () => {
    if (!address.trim()) return
    setGeocoding(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        { headers: { 'Accept': 'application/json' } }
      )
      const data = await res.json()
      if (data.length > 0) {
        setLatitude(parseFloat(data[0].lat))
        setLongitude(parseFloat(data[0].lon))
      }
    } catch {
      // silently fail
    } finally {
      setGeocoding(false)
    }
  }

  const clearCoords = () => {
    setLatitude(null)
    setLongitude(null)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      clientName: clientName || null,
      address: address || null,
      contractValue,
      status,
      startDate: startDate || null,
      endDate: endDate || null,
      managerName: managerName || null,
      managerId: managerId || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      ...(initial?.tenderId ? { tenderId: initial.tenderId } : {}),
      ...(initial?.reportId ? { reportId: initial.reportId } : {}),
      ...(initial?.quotationNo ? { quotationNo: initial.quotationNo } : {}),
      ...(initial?.systemIds ? { systemIds: initial.systemIds } : {}),
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-50 rounded-2xl shadow-float w-full max-w-md mx-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <h2 className="font-semibold text-sm text-ink">
            {initial ? 'Edit Project' : 'New Project'}
          </h2>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label mb-1">Project Name *</label>
            <input className="input w-full" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Marina Bay Tower" />
          </div>

          <div>
            <label className="label mb-1">Client</label>
            {clients && clients.length > 0 ? (
              <select className="input w-full" value={clientName}
                onChange={e => {
                  const selected = clients.find(c => c.name === e.target.value)
                  setClientName(e.target.value)
                  if (selected?.address) setAddress(selected.address)
                }}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            ) : (
              <input className="input w-full" value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="Client name" />
            )}
          </div>

          <div>
            <label className="label mb-1">Address</label>
            <div className="flex gap-2">
              <input className="input flex-1" value={address} onChange={e => setAddress(e.target.value)}
                placeholder="Project address" />
              <Button variant="ghost" size="sm" onClick={handleGeocode}
                disabled={!address.trim() || geocoding}
                title="Lookup coordinates">
                <MapPin className={`w-3.5 h-3.5 ${geocoding ? 'animate-pulse' : ''}`} />
              </Button>
            </div>
          </div>

          {(latitude !== null && longitude !== null) && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <label className="label">Coordinates</label>
                <button onClick={clearCoords} className="text-ink-faint hover:text-ink transition-colors"
                  title="Clear coordinates">
                  <XCircle className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="input w-full text-ink-muted" value={latitude.toFixed(6)} readOnly
                  tabIndex={-1} title="Latitude" />
                <input className="input w-full text-ink-muted" value={longitude.toFixed(6)} readOnly
                  tabIndex={-1} title="Longitude" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1">Start Date</label>
              <input type="date" className="input w-full" value={startDate}
                onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label mb-1">End Date</label>
              <input type="date" className="input w-full" value={endDate}
                onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1">Contract Value</label>
              <input type="number" className="input w-full" value={contractValue}
                onChange={e => setContractValue(Number(e.target.value))} />
            </div>
            <div>
              <label className="label mb-1">Status</label>
              <select className="input w-full" value={status}
                onChange={e => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label mb-1">Project Manager</label>
            {members && members.length > 0 ? (
              <select className="input w-full" value={managerId}
                onChange={e => {
                  const selected = members.find(m => m.userId === e.target.value)
                  setManagerId(e.target.value)
                  setManagerName(selected?.user?.name ?? '')
                }}>
                <option value="">No PM</option>
                {members.map(m => (
                  <option key={m.userId} value={m.userId}>{m.user.name || m.user.email}</option>
                ))}
              </select>
            ) : (
              <input className="input w-full" value={managerName}
                onChange={e => setManagerName(e.target.value)} placeholder="Manager name" />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-surface-200">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSubmit}
            disabled={!name.trim()}>
            {initial ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </div>
    </div>
  )
}
