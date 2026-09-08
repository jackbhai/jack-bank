import { useEffect, useState, type ReactNode } from 'react'
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

/* ---------------- Contactless + hologram bits ---------------- */
function Contactless() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M6.5 9.5a8 8 0 0 1 11 0M8.8 12.2a4.5 4.5 0 0 1 6.4 0M11 15a1.4 1.4 0 0 1 2 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
    </svg>
  )
}

function Hologram() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34">
      <defs>
        <linearGradient id="holo" x1="0" y1="0" x2="34" y2="34">
          <stop offset="0" stopColor="#c9d4ff" />
          <stop offset="0.5" stopColor="#8be9fd" />
          <stop offset="1" stopColor="#f5c2ff" />
        </linearGradient>
      </defs>
      <circle cx="17" cy="17" r="15" fill="url(#holo)" opacity="0.9" />
      <circle cx="17" cy="17" r="9" fill="none" stroke="#ffffff" strokeOpacity="0.5" />
      <path d="M17 2v30M2 17h30" stroke="#ffffff" strokeOpacity="0.35" />
      <circle cx="17" cy="17" r="3" fill="#ffffff" opacity="0.8" />
    </svg>
  )
}

function CardBack({ card, name }: { card: Card; name: string }) {
  return (
    <div className="flip-face flip-back rounded-2xl text-white overflow-hidden shadow-xl relative" style={{ background: 'linear-gradient(135deg,#15151f 0%,#1e1a2b 55%,#17171f 100%)' }}>
      <div className="absolute top-5 inset-x-0 h-11 bg-black/90" />
      <div className="relative h-full flex flex-col justify-between p-4 pt-[4.4rem]">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-7 bg-white/85 rounded-sm flex items-center justify-end pr-2">
              <span className="font-mono text-[11px] text-black italic tracking-widest">{card.cvv}</span>
            </div>
            <p className="text-[8px] uppercase tracking-widest opacity-50 mt-1">Authorised signature — not valid unless signed</p>
          </div>
          <Hologram />
        </div>
        <div>
          <p className="text-[9px] leading-snug opacity-70">
            This card is the property of Jack Bank. Use of this card is subject to the Jack Bank simulation agreement.
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] font-bold tracking-widest opacity-80">JACK BANK</span>
            <NetworkMark network={card.network} />
          </div>
          <p className="text-[8px] opacity-40 text-center mt-1.5">Tap to flip · {name}</p>
        </div>
      </div>
    </div>
  )
}

function CardFront({
  card,
  name,
  typeLabel,
  gradient,
  extra,
}: {
  card: Card
  name: string
  typeLabel: string
  gradient: string
  extra?: ReactNode
}) {
  return (
    <div className="flip-face rounded-2xl p-4 text-white overflow-hidden shadow-xl relative" style={{ background: gradient }}>
      {/* decorative pattern + glow */}
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/15 blur-sm" />
      <div className="absolute -bottom-24 -left-12 w-56 h-56 rounded-full bg-black/20" />
      <div className="absolute -top-24 left-1/3 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute inset-0 shine" />
      <div className="relative h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BankLogo size={22} />
            <span className="text-[12px] font-semibold opacity-90 tracking-wide">Jack Bank</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] bg-white/15 backdrop-blur rounded-md px-2 py-0.5 border border-white/10">
            {typeLabel}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Chip />
          <Contactless />
        </div>
        <p className="font-mono tracking-[0.14em] text-[18px] drop-shadow-sm">{card.number}</p>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[8px] uppercase tracking-[0.2em] opacity-60">Card holder</p>
            <p className="text-[12.5px] font-semibold truncate">{card.holderName}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-[0.2em] opacity-60">Valid thru</p>
            <p className="text-[12.5px] font-semibold">{card.expiry}</p>
          </div>
          <NetworkMark network={card.network} />
        </div>
        {extra}
      </div>
    </div>
  )
}

/* ---------------- Debit card (flip) ---------------- */
export function DebitCard({ card, name }: { card: Card; name: string }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <div className="flip-scene aspect-[1.58] w-full" onClick={() => setFlipped((f) => !f)}>
      <div className={`flip-inner ${flipped ? 'flipped' : ''}`}>
        <CardFront
          card={card}
          name={name}
          typeLabel="Debit"
          gradient="linear-gradient(130deg,#15204a 0%,#24346e 42%,#3b2f86 78%,#1d1b52 100%)"
        />
        <CardBack card={card} name={name} />
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
        <CardFront
          card={card}
          name={card.holderName}
          typeLabel="Credit"
          gradient="linear-gradient(130deg,#160f22 0%,#2c1f42 45%,#452a52 80%,#1a1226 100%)"
          extra={
            <div className="mt-1.5">
              <div className="h-1 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${usedPct}%` }} />
              </div>
              <p className="text-[8px] opacity-60 mt-1">Limit used {usedPct}%</p>
            </div>
          }
        />
        <CardBack card={card} name={card.holderName} />
      </div>
    </div>
  )
}

/* ---------------- QR code ---------------- */
export function QR({ value, size = 190, withLogo = true, skin }: { value: string; size?: number; withLogo?: boolean; skin?: { bg?: string[]; fg?: string } | null }) {
  const [url, setUrl] = useState('')
  const fg = skin?.fg || '#000000'
  useEffect(() => {
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: fg, light: '#ffffff' },
    }).then(setUrl)
  }, [value, size, fg])
  const bg = skin?.bg?.length ? `linear-gradient(135deg, ${skin.bg[0]}, ${skin.bg[1]})` : '#ffffff'
  if (!url) return <div className="rounded-2xl bg-white/10 shimmer" style={{ width: size, height: size }} />
  return (
    <div className="relative rounded-2xl p-3 inline-block" style={{ width: size + 24, height: size + 24, background: bg }}>
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
