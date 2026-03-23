// src/components/calculator/PropertiesForm.tsx
'use client'
import { MATERIAL_PROPERTIES } from '@/lib/engine/constants'
import type { MaterialProperties } from '@/types'

interface Props {
  category:   string
  properties: MaterialProperties
  onChange:   (p: MaterialProperties) => void
}

export default function PropertiesForm({ category, properties, onChange }: Props) {
  const schema = MATERIAL_PROPERTIES[category]
  if (!schema || schema.length === 0) return null

  const p   = properties ?? {}
  const set = (key: string, val: string | number) => onChange({ ...p, [key]: val })

  return (
    <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
      <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3">
        Physical Properties
      </div>
      <div className="flex flex-wrap gap-3">
        {schema.map(field => (
          <div key={field.key} className="flex flex-col gap-1">
            <label className="label">
              {field.label}{field.unit ? ` (${field.unit})` : ''}
            </label>
            {field.type === 'select' ? (
              <select
                value={(p[field.key] as string) ?? ''}
                onChange={e => set(field.key, e.target.value)}
                className="input text-xs py-1.5 min-w-24">
                <option value="">—</option>
                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={field.type}
                value={(p[field.key] as string | number) ?? ''}
                step={field.step ?? 'any'}
                onChange={e => set(field.key, field.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
                className="input text-xs py-1.5 w-24 font-mono"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
