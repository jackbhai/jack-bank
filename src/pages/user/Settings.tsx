import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Moon, Sun, SunMoon, KeyRound, Info } from 'lucide-react'
import { useBank, useToast, useTheme } from '../../store'
import { Button, Sheet, PinPad, TopBar } from '../../components/ui'
import type { Theme } from '../../lib/types'

export default function Settings() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const theme = useTheme((s) => s.theme)
  const setTheme = useTheme((s) => s.setTheme)
  const changePin = useBank((s) => s.changePin)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const me = users.find((u) => u.id === session?.userId)!

  const [pinOpen, setPinOpen] = useState(false)

  const themes: { id: Theme; label: string; Icon: typeof Sun; bg: string; fg: string }[] = [
    { id: 'amoled', label: 'AMOLED', Icon: Moon, bg: '#000000', fg: '#8b5cf6' },
    { id: 'dark', label: 'Dark', Icon: SunMoon, bg: '#0b0b10', fg: '#8b5cf6' },
    { id: 'light', label: 'Light', Icon: Sun, bg: '#f2f3f7', fg: '#0c0d13' },
  ]

  return (
    <div className="pt-3">
      <TopBar title="Settings" left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} />

      <div className="mt-2">
        <p className="text-[12px] font-bold text-muted uppercase tracking-wide mb-2">Theme</p>
        <div className="grid grid-cols-3 gap-2.5">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id)
                toast(`${t.label} theme applied`, 'success')
              }}
              className={`rounded-2xl border-2 p-3 flex flex-col items-center gap-2 transition-all ${
                theme === t.id ? 'border-primary' : 'border-line'
              }`}
              style={{ background: t.bg }}
            >
              <span className="w-full h-12 rounded-lg flex items-center justify-center" style={{ background: t.id === 'light' ? '#ffffff' : '#12121a', color: t.fg }}>
                <t.Icon size={20} />
              </span>
              <span className="text-[12px] font-bold" style={{ color: t.id === 'light' ? '#0c0d13' : '#f4f4f7' }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[12px] font-bold text-muted uppercase tracking-wide mb-2">Security</p>
        <button onClick={() => setPinOpen(true)} className="card p-4 w-full flex items-center gap-3 text-left active:scale-[0.98]">
          <span className="w-10 h-10 rounded-xl bg-primary/12 text-primary flex items-center justify-center">
            <KeyRound size={19} />
          </span>
          <span className="text-[14px] font-semibold text-text">Change PIN</span>
        </button>
      </div>

      <div className="mt-6">
        <p className="text-[12px] font-bold text-muted uppercase tracking-wide mb-2">About</p>
        <div className="card p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-surface2 text-muted flex items-center justify-center">
            <Info size={19} />
          </span>
          <div className="text-[12.5px] text-muted leading-relaxed">
            <span className="font-semibold text-text">Jack Bank v1.0</span> — a friends-only virtual banking simulation. All money is virtual; no real funds are involved.
          </div>
        </div>
      </div>

      <Sheet open={pinOpen} onClose={() => setPinOpen(false)} title="Change PIN">
        <div className="pt-3">
          <p className="text-center text-[12.5px] text-muted mb-4">Enter a new 4-digit PIN</p>
          <PinPad
            onComplete={async (pin) => {
              const res = await changePin(me.id, pin)
              toast(res.ok ? 'PIN changed' : res.error || 'Failed', res.ok ? 'success' : 'error')
              setPinOpen(false)
            }}
          />
        </div>
      </Sheet>
    </div>
  )
}
