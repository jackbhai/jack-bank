import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Landmark, Sparkles, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { emiMonthly, inr, loanEligibility } from '../../lib/utils'
import { DEFAULT_SETTINGS } from '../../lib/seed'
import { Button, Field, Sheet, TopBar, inputCls, RefreshButton } from '../../components/ui'

export default function Loans() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const loans = useBank((s) => s.loans)
  const transactions = useBank((s) => s.transactions)
  const settings = useBank((s) => s.settings) || DEFAULT_SETTINGS
  const applyLoan = useBank((s) => s.applyLoan)
  const repayLoan = useBank((s) => s.repayLoan)
  const refreshLoans = useBank((s) => s.refreshLoans)
  const refreshTxns = useBank((s) => s.refreshTxns)
  const refreshUsers = useBank((s) => s.refreshUsers)

  const me = users.find((u) => u.id === session?.userId)!
  const eligible = loanEligibility(me.id, users, transactions, loans, settings)
  const myLoans = loans.filter((l) => l.userId === me.id).sort((a, b) => b.createdAt - a.createdAt)

  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [months, setMonths] = useState(12)
  const [purpose, setPurpose] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const doRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refreshLoans(), refreshTxns(), refreshUsers()])
    setRefreshing(false)
  }

  const estEmi = useMemo(
    () => (amount && Number(amount) > 0 ? emiMonthly(Number(amount), settings.loanInterestRate, months) : 0),
    [amount, months, settings.loanInterestRate],
  )

  const statusBadge = (s: string) =>
    s === 'active' ? (
      <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-md uppercase flex items-center gap-1"><Clock size={10} /> Active</span>
    ) : s === 'closed' ? (
      <span className="text-[10px] font-bold text-muted bg-surface2 px-2 py-0.5 rounded-md uppercase flex items-center gap-1"><CheckCircle2 size={10} /> Closed</span>
    ) : s === 'rejected' ? (
      <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-md uppercase flex items-center gap-1"><XCircle size={10} /> Rejected</span>
    ) : (
      <span className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-md uppercase flex items-center gap-1"><Clock size={10} /> Pending</span>
    )

  return (
    <div className="pt-3">
      <TopBar
        title="Loans"
        left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>}
        right={<RefreshButton onClick={doRefresh} refreshing={refreshing} />}
      />

      <div className="mt-2 card p-5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-primary/15" />
        <div className="relative">
          <p className="flex items-center gap-2 text-[12px] font-bold text-primary uppercase tracking-wide">
            <Sparkles size={14} /> Pre-approved offer
          </p>
          <p className="text-[26px] font-bold text-text mt-1.5">up to {inr(eligible)}</p>
          <p className="text-[12.5px] text-muted mt-0.5">
            At {settings.loanInterestRate}% p.a. · up to {settings.maxLoanTenure} months tenure
          </p>
          <Button className="mt-3" onClick={() => setOpen(true)}>
            <Landmark size={16} /> Apply for a loan
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[13px] font-bold text-text mb-2">My loans</p>
        {myLoans.length === 0 && <p className="text-center text-[13px] text-muted py-8">No loans yet. Apply for one above!</p>}
        <div className="flex flex-col gap-2.5">
          {myLoans.map((l) => {
            const pct = Math.min(100, Math.round((l.emisPaid / l.months) * 100))
            const remaining = l.months - l.emisPaid
            return (
              <div key={l.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[16px] text-text">{inr(l.amount)}</p>
                    <p className="text-[11.5px] text-muted">Total payable {inr(l.totalPayable)}</p>
                  </div>
                  {statusBadge(l.status)}
                </div>
                {l.status === 'active' && (
                  <>
                    <div className="mt-3 h-2 rounded-full bg-surface2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[11.5px] text-muted mt-1.5">
                      <span>{l.emisPaid}/{l.months} EMIs paid</span>
                      <span>{remaining} left · {inr(l.emi)}/mo</span>
                    </div>
                    <Button
                      full
                      className="mt-3"
                      onClick={async () => {
                        const res = await repayLoan(me.id, l.id)
                        toast(res.ok ? 'EMI paid' : res.error || 'Failed', res.ok ? 'success' : 'error')
                      }}
                    >
                      Pay EMI · {inr(l.emi)}
                    </Button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Apply for Loan">
        <div className="pt-2 flex flex-col gap-3">
          <Field label="Loan amount">
            <input
              type="number"
              inputMode="numeric"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Up to ${inr(eligible)}`}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            {[5000, 25000, 50000].map((v) => (
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
            <input type="range" min={3} max={settings.maxLoanTenure} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
            <div className="flex justify-between text-[11px] text-faint">
              <span>3 mo</span>
              <span>{settings.maxLoanTenure} mo</span>
            </div>
          </Field>
          <Field label="Purpose (optional)">
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. New phone" className={inputCls} />
          </Field>
          {estEmi > 0 && (
            <div className="card p-3.5 text-[13px]">
              Estimated EMI: <span className="font-bold text-text">{inr(estEmi)}</span> /month at {settings.loanInterestRate}% p.a.
            </div>
          )}
          <Button
            full
            disabled={!amount || Number(amount) <= 0}
            onClick={async () => {
              const res = await applyLoan(me.id, Number(amount), months, purpose)
              toast(res.ok ? 'Loan application submitted for approval' : res.error || 'Failed', res.ok ? 'success' : 'error')
              if (res.ok) {
                setOpen(false)
                setAmount('')
                setPurpose('')
              }
            }}
          >
            Submit application
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
