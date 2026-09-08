import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { useBank, useToast } from '../store'
import { BankLogo } from '../components/Cards'
import { Button, inputCls } from '../components/ui'

export default function Login() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const login = useBank((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast('Enter email and password', 'error')
      return
    }
    setBusy(true)
    const res = await login(email.trim(), password)
    setBusy(false)
    if (res.ok) {
      toast('Welcome to Jack Bank!', 'success')
      nav(res.role === 'admin' ? '/admin' : '/')
    } else {
      toast(res.error || 'Login failed', 'error')
    }
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

      <form onSubmit={submit} className="mt-9 flex flex-col gap-3 anim-up" style={{ animationDelay: '0.1s' }}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-muted uppercase tracking-wide">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-muted uppercase tracking-wide">Password</span>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls + ' pr-11'}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-faint"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <Button type="submit" full disabled={busy} className="mt-2">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
          {busy ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <div className="mt-5 card p-4 flex flex-col items-center gap-2 anim-up" style={{ animationDelay: '0.16s' }}>
        <p className="text-[13px] text-muted">New to Jack Bank?</p>
        <Link to="/signup" className="w-full">
          <Button variant="outline" full>
            Create an account
          </Button>
        </Link>
      </div>

      <p className="mt-auto pt-8 text-center text-[11px] text-faint">
        Virtual money only — no real funds. The owner approves deposits, withdrawals and loans.
      </p>
    </div>
  )
}
