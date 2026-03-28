// src/components/projects/MapView.tsx
'use client'
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const STATUS_COLORS: Record<string, string> = {
  PLANNING:  '#64748b',
  ACTIVE:    '#16a34a',
  ON_HOLD:   '#d97706',
  COMPLETED: '#2563eb',
  CANCELLED: '#9ca3af',
}

function createPillIcon(project: MapProject, isSelected: boolean, isDimmed: boolean) {
  const color = STATUS_COLORS[project.status] ?? '#64748b'
  const teams = project.teams ?? []
  const name = project.name.length > 22 ? project.name.slice(0, 20) + '…' : project.name

  const teamPills = teams.length > 0
    ? `<div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:3px;">
        ${teams.map(t => `<span style="
          display:inline-block;padding:1px 6px;border-radius:10px;
          background:#dbeafe;color:#2563eb;font-size:10px;font-weight:500;
          font-family:Inter,system-ui,sans-serif;
        ">${t}</span>`).join('')}
      </div>`
    : ''

  const html = `<div style="opacity:${isDimmed ? '0.35' : '1'};transition:opacity 0.2s;">
    <div style="
      display:flex;align-items:center;gap:5px;
      background:${isSelected ? '#f8fafc' : 'white'};
      border:1px solid ${isSelected ? color : '#e2e8f0'};
      border-left:3px solid ${color};
      border-radius:8px;
      padding:3px 8px 3px 6px;
      font-family:Inter,system-ui,sans-serif;
      font-size:11px;font-weight:600;color:#1e293b;
      white-space:nowrap;
      box-shadow:${isSelected ? '0 2px 8px rgba(0,0,0,0.18)' : '0 1px 3px rgba(0,0,0,0.12)'};
      cursor:pointer;
    ">
      <span style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0;"></span>
      <span style="overflow:hidden;text-overflow:ellipsis;">${name}</span>
    </div>
    ${teamPills}
  </div>`

  return L.divIcon({
    className: 'map-pill-marker',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 14],
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
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
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
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '12px', maxWidth: '220px' }}>
                <strong>{p.name}</strong>
                {p.address && <div style={{ color: '#6b7280', marginTop: '2px', fontSize: '11px' }}>{p.address}</div>}
                {p.teams && p.teams.length > 0 && (
                  <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {p.teams.map(t => (
                      <span key={t} style={{
                        display: 'inline-block', padding: '1px 6px', borderRadius: '10px',
                        background: '#dbeafe', color: '#2563eb', fontSize: '10px', fontWeight: 500,
                      }}>{t}</span>
                    ))}
                  </div>
                )}
                {p.skills && p.skills.length > 0 && (
                  <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {p.skills.slice(0, 5).map(s => (
                      <span key={s} style={{
                        display: 'inline-block', padding: '1px 6px', borderRadius: '10px',
                        background: '#f3f4f6', color: '#6b7280', fontSize: '10px',
                      }}>{s}</span>
                    ))}
                    {p.skills.length > 5 && (
                      <span style={{ fontSize: '10px', color: '#9ca3af' }}>+{p.skills.length - 5}</span>
                    )}
                  </div>
                )}
                {p.assetNames && p.assetNames.length > 0 && (
                  <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {p.assetNames.map(n => (
                      <span key={n} style={{
                        display: 'inline-block', padding: '1px 6px', borderRadius: '10px',
                        background: '#fef3c7', color: '#92400e', fontSize: '10px',
                      }}>{n}</span>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
