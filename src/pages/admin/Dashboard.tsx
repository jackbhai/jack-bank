import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Wallet,
  ClipboardCheck,
  ArrowLeftRight,
  Megaphone,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inrCompact, fmtDate } from '../../lib/utils'
import { BankLogo } from '../../components/Cards'
import { Button } from '../../components/ui'

export default function Dashboard() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const users = useBank((s) => s.users)
  const transactions = useBank((s) => s.transactions)
  const requests = useBank((s) => s.requests)
  const announcements = useBank((s) => s.announcements)
  const addAnnouncement = useBank((s) => s.addAnnouncement)
  const logout = useBank((s) => s.logout)

  const [ann, setAnn] = useState('')

  const pending = requests.filter((r) => r.status === 'pending').length
  const totalDeposits = users.reduce((a, u) => a + u.balance, 0)
  const volume = transactions.reduce((a, t) => a + t.amount, 0)

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (13 - i))
    const start = d.getTime()
    const end = start + 86400000
    const sum = transactions.filter((t) => t.createdAt >= start && t.createdAt < end).reduce((a, t) => a + t.amount, 0)
    return { label: d.toLocaleDateString('en-IN', { day: 'numeric' }), sum }
  })
  const maxSum = Math.max(1, ...days.map((d) => d.sum))

  const stats = [
    { label: 'Total friends', value: String(users.length), Icon: Users, tint: 'text-primary bg-primary/12' },
    { label: 'Total deposits', value: inrCompact(totalDeposits), Icon: Wallet, tint: 'text-success bg-success/12' },
    { label: 'Pending approvals', value: String(pending), Icon: ClipboardCheck, tint: 'text-warning bg-warning/12' },
    { label: 'Total volume', value: inrCompact(volume), Icon: ArrowLeftRight, tint: 'text-accent bg-accent/12' },
  ]

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BankLogo size={34} />
          <div>
            <p className="font-bold text-[16px] leading-tight">Jack Bank</p>
            <p className="text-[11px] text-muted flex items-center gap-1">
              <ShieldCheck size={11} className="text-success" /> Owner Console
            </p>
          </div>
        </div>
        <button
          onClick={async () => {
            await logout()
            nav('/login')
          }}
          className="p-2.5 rounded-xl bg-surface border border-line text-danger"
        >
          <LogOut size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mt-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.tint}`}>
              <s.Icon size={18} />
            </span>
            <p className="text-[20px] font-bold text-text mt-2.5">{s.value}</p>
            <p className="text-[11.5px] text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* volume chart */}
      <div className="mt-4 card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-bold text-text">Volume · last 14 days</p>
          <p className="text-[11px] text-muted">{fmtDate(days[0] ? Date.now() - 13 * 86400000 : Date.now())}</p>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {days.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-primary to-accent transition-all"
                style={{ height: `${Math.max(4, (d.sum / maxSum) * 100)}%`, opacity: 0.9 }}
              />
              <span className="text-[8px] text-faint">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* announcements */}
      <div className="mt-4 card p-4">
        <p className="text-[13px] font-bold text-text flex items-center gap-2 mb-3">
          <Megaphone size={15} className="text-accent" /> Broadcast announcement
        </p>
        <div className="flex gap-2">
          <input
            value={ann}
            onChange={(e) => setAnn(e.target.value)}
            placeholder="Message to all friends…"
            className="flex-1 bg-surface2 border border-line rounded-xl px-3.5 py-3 text-[14px] outline-none focus:border-primary"
          />
          <Button
            disabled={!ann.trim()}
            onClick={async () => {
              const res = await addAnnouncement(ann.trim())
              toast(res.ok ? 'Announcement broadcast to everyone' : res.error || 'Failed', res.ok ? 'success' : 'error')
              if (res.ok) setAnn('')
            }}
          >
            Send
          </Button>
        </div>
        {announcements.slice(0, 3).map((a) => (
          <div key={a.id} className="mt-2.5 text-[12.5px] text-muted border-l-2 border-primary/40 pl-3">
            {a.text}
          </div>
        ))}
      </div>

      {/* quick links */}
      <div className="mt-4 flex flex-col gap-2">
        {[
          { label: 'Review pending approvals', sub: `${pending} waiting`, to: '/admin/approvals' },
          { label: 'Manage friends & balances', sub: `${users.length} accounts`, to: '/admin/users' },
          { label: 'Edit charges & rules', sub: 'fees, limits, interest rates', to: '/admin/rules' },
          { label: 'View bank ledger', sub: 'all transactions', to: '/admin/ledger' },
        ].map((l) => (
          <button key={l.to} onClick={() => nav(l.to)} className="card p-4 flex items-center gap-3 text-left active:scale-[0.98]">
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-text">{l.label}</p>
              <p className="text-[12px] text-muted">{l.sub}</p>
            </div>
            <ChevronRight size={18} className="text-faint" />
          </button>
        ))}
      </div>
    </div>
  )
}
