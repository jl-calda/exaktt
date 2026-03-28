// src/lib/pdf/helpers.ts
// Formatting helpers shared across all PDF document types

export function formatNumber(n: number, dp = 0): string {
  return n.toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatPrice(n: number | null | undefined, currency: string): string {
  if (n == null) return '\u2014'
  return `${currency} ${formatNumber(n, 2)}`
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '\u2014'
  return new Intl.DateTimeFormat('en-SG', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(d))
}

export function formatRef(ref: string | null | undefined, id: string, prefix: string): string {
  if (ref) return ref
  return `${prefix}-${id.slice(0, 6).toUpperCase()}`
}
