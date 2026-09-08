import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { Card } from '../lib/types'
import { maskCard } from '../lib/utils'

/* ---------------- Bank logo (SVG mark) ---------------- */
export function BankLogo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="jb" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#jb)" />
      <path
        d="M13 16h22l-4.5 16h-13L13 16z"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M19 22h10" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="35" cy="13" r="3" fill="#fff" />
    </svg>
  )
}

/* ---------------- Card network chip ---------------- */
function Chip() {
  return (
    <svg width="42" height="32" viewBox="0 0 42 32" fill="none">
      <rect x="0.5" y="0.5" width="41" height="31" rx="6" fill="#E8C46B" stroke="#B8933F" />
      <path d="M0 16h42M0 24h42M21 0v16M28 16v16M14 16v16M7 0v32M35 0v32" stroke="#B8933F" strokeWidth="0.8" />
    </svg>
  )
}

function NetworkMark({ network }: { network: Card['network'] }) {
  return (
    <span className="text-white/90 font-black italic tracking-tight text-lg drop-shadow">
      {network === 'Mastercard' ? (
        <span className="flex items-center -space-x-2.5">
          <span className="w-6 h-6 rounded-full bg-[#eb001b] opacity-90" />
          <span className="w-6 h-6 rounded-full bg-[#f79e1b] opacity-90" />
        </span>
      ) : network === 'RuPay' ? (
        <span className="font-black not-italic text-[15px]">RuPay</span>
      ) : (
        <span>VISA</span>
      )}
    </span>
  )
}

/* ---------------- Debit card ---------------- */
export function DebitCard({ card, name }: { card: Card; name: string }) {
  return (
    <div className="relative aspect-[1.58] w-full rounded-2xl p-4 brand-gradient-2 text-white overflow-hidden shadow-xl">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-sm" />
      <div className="absolute -bottom-20 -left-10 w-52 h-52 rounded-full bg-black/15" />
      <div className="relative h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BankLogo size={22} />
            <span className="text-[12px] font-semibold opacity-90">Jack Bank</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 rounded-md px-2 py-0.5">
            {card.type}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Chip />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="opacity-90">
            <path d="M6 8h12M6 12h12M6 16h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>
        <p className="font-mono tracking-[0.12em] text-[17px]">{card.number}</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-widest opacity-70">Card Holder</p>
            <p className="text-[13px] font-semibold">{card.holderName}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest opacity-70">Expires</p>
            <p className="text-[13px] font-semibold">{card.expiry}</p>
          </div>
          <NetworkMark network={card.network} />
        </div>
      </div>
    </div>
  )
}

/* ---------------- Credit card (flip) ---------------- */
export function CreditCard({ card }: { card: Card }) {
  const [flipped, setFlipped] = useState(false)
  const limit = card.creditLimit || 0
  const due = card.dueAmount || 0
  const usedPct = limit ? Math.min(100, Math.round((due / limit) * 100)) : 0

  return (
    <div className="flip-scene aspect-[1.58] w-full" onClick={() => setFlipped((f) => !f)}>
      <div className={`flip-inner ${flipped ? 'flipped' : ''}`}>
        {/* front */}
        <div className="flip-face rounded-2xl p-4 text-white overflow-hidden shadow-xl relative" style={{ background: 'linear-gradient(135deg,#101018 0%,#2a2438 60%,#3a2f4d 100%)' }}>
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-sm" />
          <div className="relative h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <BankLogo size={22} />
                <span className="text-[12px] font-semibold opacity-90">Jack Bank Credit</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-white/15 rounded-md px-2 py-0.5">Credit</span>
            </div>
            <div className="flex items-center gap-4">
              <Chip />
            </div>
            <p className="font-mono tracking-[0.12em] text-[17px]">{card.number}</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-widest opacity-70">Card Holder</p>
                <p className="text-[13px] font-semibold">{card.holderName}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest opacity-70">Expires</p>
                <p className="text-[13px] font-semibold">{card.expiry}</p>
              </div>
              <NetworkMark network={card.network} />
            </div>
            <div className="mt-1">
              <div className="h-1 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${usedPct}%` }} />
              </div>
              <p className="text-[9px] opacity-70 mt-1">Limit used {usedPct}%</p>
            </div>
          </div>
        </div>
        {/* back */}
        <div className="flip-face flip-back rounded-2xl text-white overflow-hidden shadow-xl relative" style={{ background: 'linear-gradient(135deg,#1a1a24 0%,#14141c 100%)' }}>
          <div className="absolute top-5 inset-x-0 h-10 bg-black" />
          <div className="relative h-full flex flex-col justify-between p-4 pt-16">
            <div className="flex justify-end">
              <div className="bg-white text-black font-mono text-[13px] px-3 py-1.5 rounded-md">{card.cvv}</div>
            </div>
            <p className="text-[9px] opacity-60 text-center">Tap card to flip · CVV {card.cvv}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- QR code ---------------- */
export function QR({ value, size = 190, withLogo = true }: { value: string; size?: number; withLogo?: boolean }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setUrl)
  }, [value, size])
  if (!url) return <div className="rounded-2xl bg-white/10 shimmer" style={{ width: size, height: size }} />
  return (
    <div className="relative rounded-2xl bg-white p-3 inline-block" style={{ width: size + 24, height: size + 24 }}>
      <img src={url} width={size} height={size} alt="QR" className="rounded-md" />
      {withLogo && (
        <span className="absolute inset-0 m-auto w-11 h-11 rounded-xl bg-white border border-black/5 flex items-center justify-center overflow-hidden">
          <BankLogo size={30} />
        </span>
      )}
    </div>
  )
}

export function MiniCardRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-line last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[13px] font-semibold text-text">{value}</span>
    </div>
  )
}

export function MaskedRow({ label, value }: { label: string; value: string }) {
  return <MiniCardRow label={label} value={maskCard(value)} />
}
