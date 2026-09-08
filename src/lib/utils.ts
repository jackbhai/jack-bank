import type { Settings, Transaction, Loan, User } from './types'

export const trimZeros = (v: number, maxDec = 2): string => v.toFixed(maxDec).replace(/\.?0+$/, '')

const signOf = (n: number): string => (n < 0 ? '-' : '')
const absOf = (n: number): number => Math.abs(n)

/**
 * Main money formatter.
 * ₹1,234 below 1L · ₹1.5L below 1Cr · ₹1.25cr above 1Cr (zeros removed).
 */
export const inr = (n: number): string => {
  const abs = absOf(n)
  if (abs >= 10000000) return `${signOf(n)}₹${trimZeros(abs / 10000000)}cr`
  if (abs >= 100000) return `${signOf(n)}₹${trimZeros(abs / 100000)}L`
  return (
    signOf(n) +
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(abs)
  )
}

/** Exact 2-decimal formatter for payment contexts; compact above 1L to avoid overflow. */
export const inrFull = (n: number): string => {
  const abs = absOf(n)
  if (abs >= 10000000) return `${signOf(n)}₹${trimZeros(abs / 10000000)}cr`
  if (abs >= 100000) return `${signOf(n)}₹${trimZeros(abs / 100000)}L`
  return (
    signOf(n) +
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs)
  )
}

/** Stock/crypto/Nav price — ₹ with 2 decimals & Indian grouping; compact above 1L. */
export const inrPrice = (n: number): string => {
  const abs = absOf(n)
  if (abs >= 10000000) return `${signOf(n)}₹${trimZeros(abs / 10000000)}cr`
  if (abs >= 100000) return `${signOf(n)}₹${trimZeros(abs / 100000)}L`
  return (
    signOf(n) +
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs)
  )
}

/** Always-compact for tight stat cards: k / L / cr. */
export const inrCompact = (n: number): string => {
  const abs = absOf(n)
  if (abs >= 10000000) return `${signOf(n)}₹${trimZeros(abs / 10000000)}cr`
  if (abs >= 100000) return `${signOf(n)}₹${trimZeros(abs / 100000)}L`
  if (abs >= 1000) return `${signOf(n)}₹${trimZeros(abs / 1000)}k`
  return `${signOf(n)}₹${Math.round(abs)}`
}

export const fmtDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export const fmtTime = (ts: number): string =>
  new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

export const fmtDateTime = (ts: number): string => `${fmtDate(ts)}, ${fmtTime(ts)}`

export const fmtDay = (ts: number): string => {
  const d = new Date(ts)
  const today = new Date()
  const yest = new Date(Date.now() - 86400000)
  const same = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  if (same(d, today)) return 'Today'
  if (same(d, yest)) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export const uid = (): string =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3)

export const genRefNo = (): string => 'JK' + Date.now().toString().slice(-9) + Math.floor(Math.random() * 9)

export const maskCard = (num: string): string => {
  const clean = num.replace(/\s/g, '')
  return `•••• •••• •••• ${clean.slice(-4)}`
}

export const maskAcc = (acc: string): string => '••••••' + acc.slice(-4)

export const initials = (name: string): string =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export const emiMonthly = (P: number, annualRate: number, months: number): number => {
  if (months <= 0) return P
  const r = annualRate / 12 / 100
  if (r === 0) return P / months
  const f = Math.pow(1 + r, months)
  return (P * r * f) / (f - 1)
}

export const calcFee = (amount: number, s: Settings): number => {
  if (amount <= 0) return 0
  let fee = (amount * s.txnFeePct) / 100
  if (fee < s.txnFeeMin) fee = s.txnFeeMin
  if (fee > s.txnFeeCap) fee = s.txnFeeCap
  return Math.round(fee * 100) / 100
}

export const creditScoreFor = (
  userId: string,
  transactions: Transaction[],
  loans: Loan[],
  users: User[],
): number => {
  const u = users.find((x) => x.id === userId)
  const mine = transactions.filter((t) => t.fromUserId === userId || t.toUserId === userId)
  let score = 600 + Math.min(150, mine.length * 3)
  const active = loans.filter((l) => l.userId === userId)
  score += Math.min(60, active.reduce((a, l) => a + l.emisPaid, 0) * 3)
  if (u) score += Math.min(60, Math.floor(u.balance / 5000) * 5)
  const onTime = active.some((l) => l.emisPaid > 0)
  if (onTime) score += 20
  return Math.max(300, Math.min(900, Math.round(score)))
}

export const loanEligibility = (userId: string, users: User[], transactions: Transaction[], loans: Loan[], s: Settings): number => {
  const score = creditScoreFor(userId, transactions, loans, users)
  const u = users.find((x) => x.id === userId)
  const base = u ? Math.round(u.balance * 3) : 0
  const cap = s.maxLoanAmount
  let eligible = 10000 + base
  if (score < 500) eligible = 5000
  if (score > 750) eligible *= 1.5
  return Math.min(cap, Math.round(eligible / 1000) * 1000)
}

export const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
