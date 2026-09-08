import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2, UserPlus } from 'lucide-react'
import { useBank, useToast } from '../store'
import { BankLogo } from '../components/Cards'
import { Button, inputCls } from '../components/ui'

export default function Signup() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const signup = useBank((s) => s.signup)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) {
      toast('Fill name, email and password', 'error')
      return
    }
    if (password.length < 6) {
      toast('Password must be 6+ characters', 'error')
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      toast('UPI PIN must be 4 digits', 'error')
      return
    }
    setBusy(true)
    const res = await signup(name.trim(), email.trim(), phone.trim(), password, pin)
    setBusy(false)
    if (!res.ok) {
      toast(res.error || 'Signup failed', 'error')
      return
    }
    if (res.authed) {
      toast('Account created — welcome!', 'success')
      nav('/')
    } else {
      toast('Account created — sign in to continue', 'success')
      nav('/login')
    }
  }

  return (
    <div className="min-h-dvh flex flex-col px-6 pt-8 pb-8 max-w-md mx-auto">
      <button onClick={() => nav('/login')} className="flex items-center gap-1 text-muted text-[13px] font-semibold self-start">
        <ChevronLeft size={18} /> Back to sign in
      </button>

      <div className="flex flex-col items-center text-center mt-3 anim-up">
        <div className="rounded-2xl p-1.5 brand-gradient-2 shadow-xl shadow-primary/30">
          <BankLogo size={48} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mt-4">Create your account</h1>
        <p className="text-[13px] text-muted mt-1">
          You'll get a Jack Bank UPI ID, account number, IFSC and debit card instantly.
        </p>
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3 anim-up">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-muted uppercase tracking-wide">Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aarav Sharma" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-muted uppercase tracking-wide">Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-muted uppercase tracking-wide">Phone (optional)</span>
          <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-muted uppercase tracking-wide">Password</span>
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6+ characters" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-muted uppercase tracking-wide">UPI PIN (4 digits)</span>
          <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" className={inputCls + ' tracking-[0.5em]'} />
        </label>

        <Button type="submit" full disabled={busy} className="mt-2">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-auto pt-6 text-center text-[11px] text-faint">
        By joining you agree this is a simulation — all money is virtual.
      </p>
    </div>
  )
}
