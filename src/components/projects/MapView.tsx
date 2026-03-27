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

function createMarkerIcon(color: string, isSelected: boolean) {
  const size = isSelected ? 14 : 10
  const border = isSelected ? 3 : 2
  return L.divIcon({
    className: '',
    iconSize: [size + border * 2, size + border * 2],
    iconAnchor: [(size + border * 2) / 2, (size + border * 2) / 2],
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      border: ${border}px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      ${isSelected ? 'transform: scale(1.2);' : ''}
    "></div>`,
  })
}

type Project = {
  id: string
  name: string
  status: string
  latitude?: number | null
  longitude?: number | null
  address?: string | null
}

interface Props {
  projects: Project[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

/* Auto-fit bounds when projects change */
function FitBounds({ projects }: { projects: Project[] }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (projects.length === 0 || fitted.current) return
    const bounds = L.latLngBounds(
      projects.map(p => [p.latitude!, p.longitude!] as [number, number]),
    )
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    fitted.current = true
  }, [projects, map])

  return null
}

export default function MapView({ projects, selectedId, onSelect }: Props) {
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds projects={projects} />

      {projects.map(p => {
        if (p.latitude == null || p.longitude == null) return null
        const color = STATUS_COLORS[p.status] ?? '#64748b'
        const isSelected = p.id === selectedId

        return (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={createMarkerIcon(color, isSelected)}
            eventHandlers={{
              click: () => onSelect(p.id),
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
                <strong>{p.name}</strong>
                {p.address && <div style={{ color: '#6b7280', marginTop: '2px' }}>{p.address}</div>}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
