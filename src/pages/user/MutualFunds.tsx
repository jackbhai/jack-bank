import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, TrendingUp, TrendingDown, PieChart, CalendarClock, Wallet, RefreshCw, ShieldCheck } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inr, inrCompact, inrPrice } from '../../lib/utils'
import { pct, upDown } from '../../lib/market'
import type { MfFund, MfHolding } from '../../lib/types'
import { Button, Field, Sheet, TopBar, inputCls } from '../../components/ui'
import { PaySourceSelector, type PaySource } from '../../components/Pay'

const catColor: Record<string, string> = {
  equity: 'bg-primary/12 text-primary',
  debt: 'bg-success/12 text-success',
  hybrid: 'bg-warning/12 text-warning',
  index: 'bg-accent/12 text-accent',
  elss: 'bg-danger/12 text-danger',
}

export default function MutualFunds() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const funds = useBank((s) => s.mfFunds)
  const holdings = useBank((s) => s.mfHoldings)
  const mfBuy = useBank((s) => s.mfBuy)
  const mfRedeem = useBank((s) => s.mfRedeem)
  const mfSetupSip = useBank((s) => s.mfSetupSip)
  const mfCancelSip = useBank((s) => s.mfCancelSip)
  const mfNavTick = useBank((s) => s.mfNavTick)

  const me = users.find((u) => u.id === session?.userId)!
  const myHoldings = holdings.filter((h) => h.userId === me.id)

  const [selected, setSelected] = useState<MfFund | null>(null)
  const [buyOpen, setBuyOpen] = useState(false)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [sipOpen, setSipOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [units, setUnits] = useState('')
  const [sipAmt, setSipAmt] = useState('')
  const [sipDay, setSipDay] = useState(5)
  const [source, setSource] = useState<PaySource>('balance')

  const invested = myHoldings.reduce((a, h) => a + h.invested, 0)
  const current = myHoldings.reduce((a, h) => {
    const f = funds.find((x) => x.id === h.fundId)
    return a + (f ? h.units * f.nav : 0)
  }, 0)
  const pnl = current - invested

  const holdFor = (fundId: string): MfHolding | undefined => myHoldings.find((h) => h.fundId === fundId)

  const openBuy = (f: MfFund) => {
    setSelected(f)
    setAmount('')
    setBuyOpen(true)
  }
  const openSip = (f: MfFund) => {
    setSelected(f)
    setSipAmt('')
    setSipDay(5)
    setSipOpen(true)
  }

  const creditCard = me.cards.find((c) => c.type === 'credit' && c.status === 'active')
  const cardAvailable = creditCard ? Math.max(0, (creditCard.creditLimit || 0) - (creditCard.dueAmount || 0)) : 0

  const doBuy = async () => {
    if (!selected) return
    const res = await mfBuy(me.id, selected.id, Number(amount), source)
    toast(res.ok ? 'Units allotted at current NAV' : res.error || 'Failed', res.ok ? 'success' : 'error')
    if (res.ok) setBuyOpen(false)
  }

  const doRedeem = async () => {
    if (!selected) return
    const res = await mfRedeem(me.id, selected.id, Number(units))
    toast(res.ok ? 'Redemption processed' : res.error || 'Failed', res.ok ? 'success' : 'error')
    if (res.ok) setRedeemOpen(false)
  }

  const doSip = async () => {
    if (!selected) return
    const res = await mfSetupSip(me.id, selected.id, Number(sipAmt), sipDay)
    toast(res.ok ? `SIP set for day ${sipDay} of every month` : res.error || 'Failed', res.ok ? 'success' : 'error')
    if (res.ok) setSipOpen(false)
  }

  const estUnits = useMemo(() => (selected && Number(amount) > 0 ? (Number(amount) / selected.nav).toFixed(3) : '0'), [amount, selected])

  return (
    <div className="pt-3">
      <TopBar
        title="Mutual Funds"
        left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>}
        right={
          <button onClick={() => { mfNavTick().then(() => toast('NAVs refreshed', 'success')) }} className="p-1.5 text-muted">
            <RefreshCw size={19} />
          </button>
        }
      />

      <div className="mt-2 card p-5 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/15" />
        <div className="relative">
          <p className="flex items-center gap-2 text-[12px] font-bold text-muted uppercase tracking-wide">
            <PieChart size={14} /> My portfolio
          </p>
          <p className="text-[26px] font-bold text-text mt-1.5">{inr(current)}</p>
          <div className="flex items-center gap-3 mt-1 text-[12.5px]">
            <span className="text-muted">Invested {inr(invested)}</span>
            <span className={`font-semibold ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
              {pnl >= 0 ? '+' : ''}{inr(pnl)} ({invested ? ((pnl / invested) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-[13px] font-bold text-text">Explore funds</p>
        <p className="text-[11.5px] text-muted">{funds.length} funds</p>
      </div>

      <div className="mt-2 flex flex-col gap-2.5 pb-2">
        {funds.map((f) => {
          const d = pct(f.nav, f.prevNav)
          const ud = upDown(d)
          const h = holdFor(f.id)
          return (
            <button key={f.id} onClick={() => setSelected(f)} className="card p-4 text-left active:scale-[0.99] transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14.5px] text-text truncate">{f.name}</p>
                  <p className="text-[11.5px] text-muted">{f.fundHouse} · {f.risk}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 ${catColor[f.category]}`}>{f.category}</span>
              </div>
              <div className="flex items-end justify-between mt-3">
                <div>
                  <p className="text-[16px] font-bold text-text">{inrPrice(f.nav)} <span className="text-[11px] text-faint font-medium">NAV</span></p>
                  <p className={`text-[12px] font-semibold flex items-center gap-1 ${ud.cls}`}>
                    {d >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {ud.sign}{d.toFixed(2)}% today
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-faint">1Y return</p>
                  <p className={`text-[13px] font-bold ${f.ret1y >= 0 ? 'text-success' : 'text-danger'}`}>{f.ret1y >= 0 ? '+' : ''}{f.ret1y}%</p>
                </div>
              </div>
              {h && h.units > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-line flex justify-between text-[11.5px] text-muted">
                  <span>{h.units.toFixed(3)} units</span>
                  <span className="text-text font-semibold">{inr(h.units * f.nav)}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* ---- fund detail ---- */}
      <Sheet open={!!selected && !buyOpen && !redeemOpen && !sipOpen} onClose={() => setSelected(null)} title="Fund details">
        {selected && (() => {
          const d = pct(selected.nav, selected.prevNav)
          const ud = upDown(d)
          const h = holdFor(selected.id)
          return (
            <div className="pt-1 flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${catColor[selected.category]}`}>{selected.category}</span>
                  <span className={`text-[13px] font-bold ${ud.cls}`}>{ud.sign}{d.toFixed(2)}%</span>
                </div>
                <p className="text-[18px] font-bold text-text mt-2">{selected.name}</p>
                <p className="text-[12.5px] text-muted">{selected.fundHouse} · {selected.risk} risk</p>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-[28px] font-bold text-text">{inrPrice(selected.nav)}</span>
                  <span className="text-[12px] text-faint">NAV</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Stat label="1Y return" value={`${selected.ret1y >= 0 ? '+' : ''}${selected.ret1y}%`} />
                <Stat label="3Y return" value={`${selected.ret3y >= 0 ? '+' : ''}${selected.ret3y}%`} />
                <Stat label="Expense" value={`${selected.expenseRatio}%`} />
                <Stat label="AUM" value={inrCompact(selected.aum * 10000000)} />
                <Stat label="Min lumpsum" value={inr(selected.minLumpsum)} />
                <Stat label="Min SIP" value={inr(selected.minSip)} />
              </div>

              <p className="text-[12.5px] text-muted leading-relaxed">{selected.description}</p>

              {h && h.units > 0 && (
                <div className="card p-4">
                  <p className="text-[11px] font-bold text-muted uppercase mb-2">Your holding</p>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted">Units</span>
                    <span className="font-semibold text-text">{h.units.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between text-[13px] mt-1">
                    <span className="text-muted">Invested</span>
                    <span className="font-semibold text-text">{inr(h.invested)}</span>
                  </div>
                  <div className="flex justify-between text-[13px] mt-1">
                    <span className="text-muted">Current value</span>
                    <span className={`font-bold ${h.units * selected.nav >= h.invested ? 'text-success' : 'text-danger'}`}>{inr(h.units * selected.nav)}</span>
                  </div>
                  {h.sipActive && (
                    <p className="mt-2 text-[11.5px] text-warning flex items-center gap-1.5">
                      <CalendarClock size={13} /> Active SIP · {inr(h.sipAmount || 0)}/month on day {h.sipDay}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button full onClick={() => { setBuyOpen(true) }}><Wallet size={16} /> Invest (lumpsum)</Button>
                {h && h.units > 0 ? (
                  <div className="flex gap-2">
                    <Button variant="outline" full onClick={() => { setRedeemOpen(true) }}>Redeem</Button>
                    <Button variant={h.sipActive ? 'ghost' : 'outline'} full onClick={() => { setSipOpen(true) }}>
                      {h.sipActive ? 'Manage SIP' : 'Start SIP'}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" full onClick={() => { setSipOpen(true) }}>Start SIP</Button>
                )}
              </div>
            </div>
          )
        })()}
      </Sheet>

      {/* ---- buy ---- */}
      <Sheet open={buyOpen} onClose={() => setBuyOpen(false)} title="Invest lumpsum">
        {selected && (
          <div className="pt-1 flex flex-col gap-3">
            <p className="text-[13px] text-muted">Investing in <span className="font-semibold text-text">{selected.name}</span></p>
            <Field label="Amount">
              <input type="number" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Min ${inr(selected.minLumpsum)}`} className={inputCls} />
            </Field>
            {Number(amount) > 0 && (
              <div className="card p-3.5 text-[13px]">
                You'll get approx <span className="font-bold text-text">{estUnits}</span> units at NAV {inrPrice(selected.nav)}
              </div>
            )}
            <div className="card p-3.5">
              <p className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-2">Pay using</p>
              <PaySourceSelector
                source={source}
                onChange={setSource}
                balance={me.balance}
                hasCard={!!creditCard}
                cardAvailable={cardAvailable}
                cardLimit={creditCard?.creditLimit}
              />
            </div>
            <Button
              full
              disabled={!amount || Number(amount) < selected.minLumpsum || (source === 'balance' ? Number(amount) > me.balance : Number(amount) > cardAvailable)}
              onClick={doBuy}
            >
              Confirm · {amount ? inr(Number(amount)) : ''}{source === 'card' ? ' · Credit Card' : ''}
            </Button>
          </div>
        )}
      </Sheet>

      {/* ---- redeem ---- */}
      <Sheet open={redeemOpen} onClose={() => setRedeemOpen(false)} title="Redeem units">
        {selected && (() => {
          const h = holdFor(selected.id)
          return (
            <div className="pt-1 flex flex-col gap-3">
              <p className="text-[13px] text-muted">You hold <span className="font-semibold text-text">{h?.units.toFixed(3)}</span> units</p>
              <Field label="Units to redeem">
                <input type="number" inputMode="decimal" autoFocus value={units} onChange={(e) => setUnits(e.target.value)} placeholder="e.g. 10.5" className={inputCls} />
              </Field>
              {Number(units) > 0 && (
                <div className="card p-3.5 text-[13px]">
                  Redemption value: <span className="font-bold text-success">{inr(Number(units) * selected.nav)}</span>
                </div>
              )}
              <Button full disabled={!units || Number(units) <= 0 || Number(units) > (h?.units || 0)} onClick={doRedeem}>
                Redeem now
              </Button>
            </div>
          )
        })()}
      </Sheet>

      {/* ---- sip ---- */}
      <Sheet open={sipOpen} onClose={() => setSipOpen(false)} title="Systematic Investment Plan">
        {selected && (() => {
          const h = holdFor(selected.id)
          return (
            <div className="pt-1 flex flex-col gap-3">
              <p className="text-[13px] text-muted">Auto-invest every month in <span className="font-semibold text-text">{selected.name}</span></p>
              <Field label="Monthly amount">
                <input type="number" inputMode="decimal" autoFocus value={sipAmt} onChange={(e) => setSipAmt(e.target.value)} placeholder={`Min ${inr(selected.minSip)}`} className={inputCls} />
              </Field>
              <Field label={`Deduct on day ${sipDay} of every month`}>
                <input type="range" min={1} max={28} value={sipDay} onChange={(e) => setSipDay(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
                <div className="flex justify-between text-[11px] text-faint"><span>1</span><span>28</span></div>
              </Field>
              <Button full disabled={!sipAmt || Number(sipAmt) < selected.minSip} onClick={doSip}>
                {h?.sipActive ? 'Update SIP' : 'Start SIP'}
              </Button>
              {h?.sipActive && (
                <Button variant="danger" full onClick={async () => {
                  const res = await mfCancelSip(me.id, selected.id)
                  toast(res.ok ? 'SIP cancelled' : res.error || 'Failed', res.ok ? 'success' : 'error')
                  if (res.ok) setSipOpen(false)
                }}>
                  Cancel SIP
                </Button>
              )}
            </div>
          )
        })()}
      </Sheet>

    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface2 rounded-xl p-2.5">
      <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
      <p className="text-[13px] font-bold text-text mt-0.5">{value}</p>
    </div>
  )
}
