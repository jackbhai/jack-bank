import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { X, Delete, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { initials } from '../lib/utils'
import { useToast } from '../store'
import { fxKey } from '../lib/fx'

/* ---------------- Avatar ---------------- */
export function Avatar({ name, hue, size = 44 }: { name: string; hue: number; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold text-white shrink-0 select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 72% 56%), hsl(${(hue + 45) % 360} 72% 44%))`,
      }}
    >
      {initials(name)}
    </div>
  )
}

/* ---------------- Backdrop + Sheet ---------------- */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 anim-fade" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface border-t border-line rounded-t-3xl anim-sheet max-h-[92dvh] overflow-y-auto no-scrollbar">
        <div className="sticky top-0 bg-surface pt-2.5 pb-2 px-5 z-10">
          <div className="mx-auto h-1 w-10 rounded-full bg-line mb-2" />
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[15px]">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-full bg-surface2 hover:bg-elevated transition-colors">
              <X size={17} className="text-muted" />
            </button>
          </div>
        </div>
        <div className="px-5 pb-8 pt-1">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/75 anim-fade" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface border border-line rounded-3xl anim-pop p-5">{children}</div>
    </div>,
    document.body,
  )
}

/* ---------------- TopBar ---------------- */
export function TopBar({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 -mx-5 px-5 py-3 flex items-center justify-between bg-bg/85 backdrop-blur-lg">
      <div className="w-10 flex items-start">{left}</div>
      <h1 className="font-semibold text-[15px] tracking-tight">{title}</h1>
      <div className="w-10 flex items-center justify-end">{right}</div>
    </header>
  )
}

/* ---------------- Bottom Nav ---------------- */
export function BottomNav({ items }: { items: { to: string; icon: LucideIcon; label: string }[] }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex justify-center">
      <div className="w-full max-w-md bg-surface/95 backdrop-blur-lg border-t border-line px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+6px)] flex">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl transition-colors ${
                isActive ? 'text-primary' : 'text-faint'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <it.icon size={21} strokeWidth={isActive ? 2.4 : 2} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-faint'}`}>{it.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

/* ---------------- Segmented ---------------- */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex bg-surface2 border border-line rounded-xl p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${
            value === o.id ? 'bg-surface text-text shadow-sm border border-line' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Switch ---------------- */
export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${on ? 'bg-primary' : 'bg-line'}`}
    >
      <span
        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`}
      />
    </button>
  )
}

/* ---------------- Field ---------------- */
export function Field({
  label,
  children,
  hint,
}: {
  label?: string
  children: ReactNode
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-[12px] font-semibold text-muted uppercase tracking-wide">{label}</span>}
      {children}
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </div>
  )
}

export const inputCls =
  'w-full bg-surface2 border border-line rounded-xl px-3.5 py-3 text-[15px] text-text placeholder:text-faint outline-none focus:border-primary transition-colors'

/* ---------------- Button ---------------- */
export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  full,
  type = 'button',
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  disabled?: boolean
  full?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  const base = `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none ${full ? 'w-full' : ''}`
  const styles = {
    primary: 'bg-primary text-white shadow-lg shadow-primary/25 hover:brightness-110',
    ghost: 'bg-surface2 text-text hover:bg-elevated border border-line',
    outline: 'bg-transparent border border-primary text-primary hover:bg-primary/10',
    danger: 'bg-danger text-white',
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  )
}

/* ---------------- Toasts ---------------- */
export function Toasts() {
  const { toasts, dismiss } = useToast()
  return createPortal(
    <div className="fixed top-3 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto w-full max-w-sm flex items-center gap-2.5 bg-elevated border border-line rounded-xl px-4 py-3 text-left shadow-2xl anim-pop"
        >
          {t.type === 'success' ? (
            <CheckCircle2 size={18} className="text-success shrink-0" />
          ) : t.type === 'error' ? (
            <AlertTriangle size={18} className="text-danger shrink-0" />
          ) : (
            <Info size={18} className="text-accent shrink-0" />
          )}
          <span className="text-[13px] font-medium text-text">{t.msg}</span>
        </button>
      ))}
    </div>,
    document.body,
  )
}

/* ---------------- PinPad ---------------- */
export function PinPad({
  length = 4,
  onComplete,
  title = 'Enter PIN',
}: {
  length?: number
  onComplete: (pin: string) => void
  title?: string
}) {
  const [pin, setPin] = useState('')
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']
  useEffect(() => {
    if (pin.length === length) {
      const p = pin
      const t = setTimeout(() => {
        onComplete(p)
        setPin('')
      }, 250)
      return () => clearTimeout(t)
    }
  }, [pin, length, onComplete])
  return (
    <div className="flex flex-col items-center gap-5">
      <span className="text-[12px] font-semibold text-muted uppercase tracking-widest">{title}</span>
      <div className="flex gap-3">
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={`w-3.5 h-3.5 rounded-full border transition-all ${
              i < pin.length ? 'bg-primary border-primary scale-110' : 'border-faint'
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              data-fx-none
              onClick={() => {
                fxKey()
                if (k === 'del') setPin((p) => p.slice(0, -1))
                else setPin((p) => (p.length < length ? p + k : p))
              }}
              className="w-[70px] h-[58px] rounded-2xl bg-surface2 border border-line text-[20px] font-semibold text-text active:scale-95 transition-all flex items-center justify-center"
            >
              {k === 'del' ? <Delete size={22} className="text-muted" /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

/* ---------------- Empty state ---------------- */
export function Empty({ icon: Icon, title, sub }: { icon: LucideIcon; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface2 border border-line flex items-center justify-center">
        <Icon size={24} className="text-faint" />
      </div>
      <div>
        <p className="font-semibold text-text">{title}</p>
        {sub && <p className="text-[13px] text-muted mt-1">{sub}</p>}
      </div>
    </div>
  )
}
