// src/components/projects/MapView.tsx
'use client'
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const STATUS_COLORS: Record<string, string> = {
  PLANNING:  '#64748b',
  ACTIVE:    '#16a34a',
  ON_HOLD:   '#d97706',
  COMPLETED: '#2563eb',
  CANCELLED: '#9ca3af',
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function createPillIcon(project: MapProject, isSelected: boolean, isDimmed: boolean) {
  const color = STATUS_COLORS[project.status] ?? '#64748b'
  const teams = project.teams ?? []
  const skills = project.skills ?? []
  const assets = project.assetNames ?? []
  const name = project.name.length > 24 ? project.name.slice(0, 22) + '…' : project.name
  const addr = project.address
    ? (project.address.length > 30 ? project.address.slice(0, 28) + '…' : project.address)
    : ''
  const font = 'Inter,system-ui,sans-serif'

  const teamHtml = teams.length > 0
    ? `<div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:4px;">
        ${teams.map(t => `<span style="display:inline-block;padding:1px 6px;border-radius:10px;background:#dbeafe;color:#2563eb;font-size:10px;font-weight:500;font-family:${font};">${esc(t)}</span>`).join('')}
      </div>`
    : ''

  const skillHtml = skills.length > 0
    ? `<div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:3px;">
        ${skills.slice(0, 4).map(s => `<span style="display:inline-block;padding:1px 5px;border-radius:10px;background:#f3f4f6;color:#6b7280;font-size:9px;font-family:${font};">${esc(s)}</span>`).join('')}
        ${skills.length > 4 ? `<span style="font-size:9px;color:#9ca3af;font-family:${font};">+${skills.length - 4}</span>` : ''}
      </div>`
    : ''

  const assetHtml = assets.length > 0
    ? `<div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:3px;">
        ${assets.slice(0, 3).map(n => `<span style="display:inline-block;padding:1px 5px;border-radius:10px;background:#fef3c7;color:#92400e;font-size:9px;font-family:${font};">${esc(n)}</span>`).join('')}
        ${assets.length > 3 ? `<span style="font-size:9px;color:#9ca3af;font-family:${font};">+${assets.length - 3}</span>` : ''}
      </div>`
    : ''

  const hasDetails = addr || teams.length > 0 || skills.length > 0 || assets.length > 0

  const html = `<div style="opacity:${isDimmed ? '0.35' : '1'};transition:opacity 0.2s;">
    <div style="
      background:white;
      border:1px solid ${isSelected ? color : '#e2e8f0'};
      border-left:3px solid ${color};
      border-radius:10px;
      padding:${hasDetails ? '8px 12px 10px' : '6px 10px 6px 8px'};
      font-family:${font};
      box-shadow:${isSelected ? '0 2px 8px rgba(0,0,0,0.18)' : '0 1px 4px rgba(0,0,0,0.1)'};
      cursor:pointer;
      max-width:200px;
    ">
      <div style="display:flex;align-items:center;gap:5px;">
        <span style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0;"></span>
        <span style="font-size:12px;font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(name)}</span>
      </div>
      ${addr ? `<div style="font-size:10px;color:#6b7280;margin-top:2px;padding-left:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(addr)}</div>` : ''}
      <div style="padding-left:11px;">
        ${teamHtml}
        ${skillHtml}
        ${assetHtml}
      </div>
    </div>
  </div>`

  return L.divIcon({
    className: 'map-pill-marker',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 20],
  })
}

export type MapProject = {
  id: string
  name: string
  status: string
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  teams?: string[]
  skills?: string[]
  assetNames?: string[]
}

interface Props {
  projects: MapProject[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  dimmedIds?: Set<string>
}

/* Auto-fit bounds when projects change */
function FitBounds({ projects }: { projects: MapProject[] }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (projects.length === 0 || fitted.current) return
    const bounds = L.latLngBounds(
      projects.map(p => [p.latitude!, p.longitude!] as [number, number]),
    )
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 })
    fitted.current = true
  }, [projects, map])

  return null
}

export default function MapView({ projects, selectedId, onSelect, dimmedIds }: Props) {
  const center: [number, number] = projects.length > 0
    ? [projects[0].latitude!, projects[0].longitude!]
    : [1.3521, 103.8198] // Default: Singapore

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds projects={projects} />

      <style>{`
        .map-pill-marker { background: none !important; border: none !important; }
      `}</style>

      {projects.map(p => {
        if (p.latitude == null || p.longitude == null) return null
        const isSelected = p.id === selectedId
        const isDimmed = dimmedIds ? dimmedIds.has(p.id) : false

        return (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={createPillIcon(p, isSelected, isDimmed)}
            eventHandlers={{
              click: () => onSelect(p.id),
            }}
          />
        )
      })}
    </MapContainer>
  )
}
