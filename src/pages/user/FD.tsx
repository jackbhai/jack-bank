import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, PiggyBank, TrendingUp, Unlock, CalendarClock } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { fmtDate, inr } from '../../lib/utils'
import { DEFAULT_SETTINGS } from '../../lib/seed'
import { Button, Field, Modal, Sheet, TopBar, inputCls, RefreshButton } from '../../components/ui'

export default function FD() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const settings = useBank((s) => s.settings) || DEFAULT_SETTINGS
  const openFD = useBank((s) => s.openFD)
  const breakFD = useBank((s) => s.breakFD)
  const refreshFds = useBank((s) => s.refreshFds)
  const refreshUsers = useBank((s) => s.refreshUsers)

  const me = users.find((u) => u.id === session?.userId)!
  const fds = me.fds.filter((f) => f.status !== 'broken').sort((a, b) => b.createdAt - a.createdAt)

  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [months, setMonths] = useState(12)
  const [breakId, setBreakId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const doRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refreshFds(), refreshUsers()])
    setRefreshing(false)
  }

  const maturity = (amt: number, m: number) => amt * (1 + (settings.fdInterestRate / 100) * (m / 12))

  return (
    <div className="pt-3">
      <TopBar
        title="Fixed Deposit"
        left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>}
        right={<RefreshButton onClick={doRefresh} refreshing={refreshing} />}
      />

      <div className="mt-2 card p-5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-warning/15" />
        <div className="relative">
          <p className="flex items-center gap-2 text-[12px] font-bold text-warning uppercase tracking-wide">
            <TrendingUp size={14} /> Fixed deposit rate
          </p>
          <p className="text-[26px] font-bold text-text mt-1.5">{settings.fdInterestRate}% p.a.</p>
          <p className="text-[12.5px] text-muted mt-0.5">Lock money and earn guaranteed interest</p>
          <Button className="mt-3" onClick={() => setOpen(true)}>
            <PiggyBank size={16} /> Book an FD
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[13px] font-bold text-text mb-2">Your deposits</p>
        {fds.length === 0 && <p className="text-center text-[13px] text-muted py-8">No active FDs yet</p>}
        <div className="flex flex-col gap-2.5">
          {fds.map((f) => (
            <div key={f.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-[16px] text-text">{inr(f.amount)}</p>
                  <p className="text-[11.5px] text-muted">at {f.rate}% p.a. · {f.months} months</p>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-md uppercase">
                  <CalendarClock size={10} /> Active
                </span>
              </div>
              <div className="flex justify-between text-[12.5px] mt-3 pt-3 border-t border-line">
                <div>
                  <p className="text-faint text-[11px]">Matures {fmtDate(f.maturityAt)}</p>
                  <p className="font-semibold text-success">{inr(f.maturityValue)}</p>
                </div>
                <button
                  onClick={() => setBreakId(f.id)}
                  className="flex items-center gap-1.5 text-[12px] font-bold text-danger bg-danger/10 px-3 py-2 rounded-lg"
                >
                  <Unlock size={13} /> Break FD
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Book Fixed Deposit">
        <div className="pt-2 flex flex-col gap-3">
          <Field label="Amount">
            <input
              type="number"
              inputMode="numeric"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount to lock"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            {[10000, 50000, 100000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className="py-2 rounded-xl bg-surface2 border border-line text-[12px] font-bold text-text"
              >
                {inr(v)}
              </button>
            ))}
          </div>
          <Field label={`Tenure · ${months} months`}>
            <input type="range" min={3} max={36} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
            <div className="flex justify-between text-[11px] text-faint">
              <span>3 mo</span>
              <span>36 mo</span>
            </div>
          </Field>
          {amount && Number(amount) > 0 && (
            <div className="card p-3.5 text-[13px]">
              Maturity value: <span className="font-bold text-success">{inr(maturity(Number(amount), months))}</span> after {months} months
            </div>
          )}
          <Button
            full
            disabled={!amount || Number(amount) <= 0 || Number(amount) > me.balance}
            onClick={async () => {
              const res = await openFD(me.id, Number(amount), months)
              toast(res.ok ? 'FD booked successfully' : res.error || 'Failed', res.ok ? 'success' : 'error')
              if (res.ok) {
                setOpen(false)
                setAmount('')
              }
            }}
          >
            Lock {amount && Number(amount) > 0 ? inr(Number(amount)) : ''}
          </Button>
        </div>
      </Sheet>

      <Modal open={!!breakId} onClose={() => setBreakId(null)}>
        <div className="flex flex-col gap-4 text-center">
          <Unlock size={36} className="text-danger mx-auto" />
          <div>
            <p className="font-bold text-text text-[16px]">Break this FD?</p>
            <p className="text-[13px] text-muted mt-1">You'll get back your principal now. Interest is only credited on maturity.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" full onClick={() => setBreakId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              full
              onClick={async () => {
                if (breakId) {
                  const res = await breakFD(me.id, breakId)
                  toast(res.ok ? 'FD broken, principal credited' : res.error || 'Failed', res.ok ? 'success' : 'error')
                }
                setBreakId(null)
              }}
            >
              Break FD
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
