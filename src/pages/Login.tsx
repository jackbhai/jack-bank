import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Users, Loader2 } from 'lucide-react'
import { useBank, useToast } from '../store'
import { BankLogo } from '../components/Cards'
import { Avatar, Segmented, Sheet, PinPad } from '../components/ui'

export default function Login() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const directory = useBank((s) => s.directory)
  const loginUser = useBank((s) => s.loginUser)
  const loginAdmin = useBank((s) => s.loginAdmin)

  const [mode, setMode] = useState<'user' | 'admin'>('user')
  const [selected, setSelected] = useState<string | null>(null)
  const [pinOpen, setPinOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const handlePin = async (pin: string) => {
    setPinOpen(false)
    setBusy(true)
    if (mode === 'user' && selected) {
      const res = await loginUser(selected, pin)
      if (res.ok) {
        toast('Welcome back!', 'success')
        nav('/')
      } else toast(res.error || 'Login failed', 'error')
    } else {
      const res = await loginAdmin(pin)
      if (res.ok) {
        toast('Admin signed in', 'success')
        nav('/admin')
      } else toast(res.error || 'Login failed', 'error')
    }
    setBusy(false)
    setSelected(null)
  }

  return (
    <div className="min-h-dvh flex flex-col px-6 pt-12 pb-8 max-w-md mx-auto">
      <div className="flex flex-col items-center text-center anim-up">
        <div className="rounded-3xl p-2 brand-gradient-2 shadow-2xl shadow-primary/30">
          <BankLogo size={64} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mt-5">Jack Bank</h1>
        <p className="text-[14px] text-muted mt-1.5 max-w-[260px]">
          Friends-only virtual bank. Trade, borrow, and bank — together.
        </p>
      </div>

      <div className="mt-8 anim-up" style={{ animationDelay: '0.08s' }}>
        <Segmented
          options={[
            { id: 'user', label: 'Friends' },
            { id: 'admin', label: 'Admin' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>

      {busy && (
        <div className="mt-8 flex flex-col items-center gap-3 text-muted anim-fade">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-[13px] font-semibold">Signing in…</p>
        </div>
      )}

      {!busy && mode === 'user' && (
        <div className="mt-5 flex flex-col gap-2.5 anim-up" style={{ animationDelay: '0.14s' }}>
          {directory.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                setSelected(u.id)
                setPinOpen(true)
              }}
              className="flex items-center gap-3.5 card p-3.5 text-left active:scale-[0.98] transition-all"
            >
              <Avatar name={u.name} hue={u.avatarHue} size={44} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text text-[15px]">{u.name}</p>
                <p className="text-[12px] text-muted truncate">{u.upiId}</p>
              </div>
              {u.status === 'blocked' && (
                <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-1 rounded-md">Blocked</span>
              )}
            </button>
          ))}
          {directory.length === 0 && (
            <p className="text-center text-[13px] text-muted py-6">
              Loading friends… check your connection and reload.
            </p>
          )}
        </div>
      )}

      {!busy && mode === 'admin' && (
        <div className="mt-5 card p-5 flex flex-col items-center gap-3 anim-up" style={{ animationDelay: '0.14s' }}>
          <ShieldCheck size={30} className="text-primary" />
          <p className="text-[14px] font-semibold text-text">Bank Owner Access</p>
          <p className="text-[12px] text-muted text-center">
            Manage approvals, charges, rules and the entire banking system.
          </p>
          <button
            onClick={() => setPinOpen(true)}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl active:scale-[0.98] transition-all"
          >
            Enter Admin PIN
          </button>
          <p className="text-[11px] text-faint">Demo admin PIN: 2468</p>
        </div>
      )}

      <p className="mt-auto pt-8 text-center text-[11px] text-faint">
        {mode === 'user' ? 'Friend PIN is 1234 · Virtual money only — no real funds' : 'Owner controls every rule of the bank'}
      </p>

      <Sheet open={pinOpen} onClose={() => setPinOpen(false)} title="Enter PIN">
        <div className="pt-4">
          <PinPad
            onComplete={handlePin}
            title={mode === 'user' ? `${directory.find((u) => u.id === selected)?.name || ''} · Enter PIN` : 'Admin PIN'}
          />
        </div>
      </Sheet>
    </div>
  )
}
