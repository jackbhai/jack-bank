/* Shared helpers for markets (mutual funds & stocks) */

export const pct = (cur: number, prev: number): number => (prev ? ((cur - prev) / prev) * 100 : 0)

export const fmtVol = (n: number): string => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

export const fmtCr = (n: number): string => {
  if (n >= 1_000_000) return '₹' + (n / 1_000_000).toFixed(1) + 'T' // trillion
  if (n >= 100_000) return '₹' + (n / 100_000).toFixed(1) + 'L Cr'
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'k Cr'
  return '₹' + Math.round(n) + ' Cr'
}

/** Build an SVG sparkline from a price history. Returns path strings. */
export const spark = (history: { t: number; p: number }[], w = 300, h = 80): { line: string; area: string } => {
  if (!history.length) return { line: '', area: '' }
  const pts = history.slice(-120)
  const min = Math.min(...pts.map((p) => p.p))
  const max = Math.max(...pts.map((p) => p.p))
  const range = max - min || 1
  const step = w / Math.max(1, pts.length - 1)
  const coords = pts.map((p, i) => {
    const x = i * step
    const y = h - ((p.p - min) / range) * (h - 8) - 4
    return [x, y] as const
  })
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  return { line, area }
}

export const upDown = (n: number): { cls: string; sign: string } =>
  n >= 0 ? { cls: 'text-success', sign: '+' } : { cls: 'text-danger', sign: '' }
