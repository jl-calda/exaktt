// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format a number with commas e.g. 1234567 → "1,234,567"
export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n)
}

// Truncate a string to maxLen, adding ellipsis
export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str
}

// Generate a short readable key from a name e.g. "Wall Brackets" → "wall_brackets_xyz"
export function makeKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_')
    + '_' + Math.random().toString(36).slice(2, 5)
}

// Compress an image file to a base64 JPEG thumbnail
export function compressToThumb(file: File, maxPx = 120, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1)
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Parse a JSON field that may be a string or already parsed
export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return fallback }
  }
  return value as T
}

// Deep-clone using structuredClone with JSON fallback
export function deepClone<T>(obj: T): T {
  if (typeof structuredClone === 'function') return structuredClone(obj)
  return JSON.parse(JSON.stringify(obj))
}

// Debounce a function
export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timer: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}
