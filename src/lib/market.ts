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

/* Deterministic pseudo-random generator (mulberry32) */
function hashStr(s: string): number {
  let h = 1779033703 ^ s.length
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic historical price series ending at `endPrice`. */
export function seededSeries(symbol: string, n: number, endPrice: number, vol: number): number[] {
  const rand = mulberry32(hashStr(symbol))
  const out: number[] = []
  let p = endPrice * (1 - (rand() - 0.45) * vol * 6)
  out.push(p)
  const step = (endPrice - p) / n
  for (let i = 1; i <= n; i++) {
    p = p + step + (rand() - 0.5) * vol * endPrice
    if (p <= 0) p = endPrice * 0.01
    out.push(p)
  }
  out[out.length - 1] = endPrice
  return out
}

export type ChartRange = 'Live' | '1D' | '1W' | '1M' | '1Y'

export function chartSeries(symbol: string, range: ChartRange, price: number, live: { t: number; p: number }[]): { t: number; p: number }[] {
  if (range === 'Live') return live.length ? live.slice(-60) : [{ t: Date.now(), p: price }]
  const cfg: Record<string, { n: number; vol: number }> = {
    '1D': { n: 24, vol: 0.012 },
    '1W': { n: 48, vol: 0.02 },
    '1M': { n: 60, vol: 0.035 },
    '1Y': { n: 90, vol: 0.06 },
  }
  const c = cfg[range]
  const pts = seededSeries(symbol, c.n, price, c.vol)
  const now = Date.now()
  const span = range === '1D' ? 86400000 : range === '1W' ? 7 * 86400000 : range === '1M' ? 30 * 86400000 : 365 * 86400000
  const dt = span / c.n
  return pts.map((p, i) => ({ t: now - span + i * dt, p }))
}
