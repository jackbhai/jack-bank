import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, TrendingUp, TrendingDown, RefreshCw, LineChart, Clock, XCircle, CheckCircle2, Bitcoin } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inr, fmtTime } from '../../lib/utils'
import { pct, upDown, spark, fmtVol, fmtCr, chartSeries, type ChartRange } from '../../lib/market'
import type { Stock, StockHolding } from '../../lib/types'
import { Button, Field, Segmented, Sheet, TopBar, inputCls } from '../../components/ui'

export default function Stocks() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const stocks = useBank((s) => s.stocks)
  const holdings = useBank((s) => s.stockHoldings)
  const orders = useBank((s) => s.stockOrders)
  const stockPlaceOrder = useBank((s) => s.stockPlaceOrder)
  const stockCancelOrder = useBank((s) => s.stockCancelOrder)
  const marketTick = useBank((s) => s.marketTick)

  const me = users.find((u) => u.id === session?.userId)!
  const myHoldings = holdings.filter((h) => h.userId === me.id && h.qty > 0)
  const myOrders = orders.filter((o) => o.userId === me.id).sort((a, b) => b.createdAt - a.createdAt)

  const [tab, setTab] = useState<'market' | 'holdings' | 'orders'>('market')
  const [kind, setKind] = useState<'equity' | 'crypto'>('equity')
  const [range, setRange] = useState<ChartRange>('Live')
  const [selected, setSelected] = useState<Stock | null>(null)
  const [tradeOpen, setTradeOpen] = useState(false)
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [qty, setQty] = useState('')
  const [limitPrice, setLimitPrice] = useState('')

  const listStocks = useMemo(() => stocks.filter((s) => s.kind === kind), [stocks, kind])

  const invested = myHoldings.reduce((a, h) => {
    const s = stocks.find((x) => x.id === h.stockId)
    return a + h.qty * h.avgPrice
  }, 0)
  const current = myHoldings.reduce((a, h) => {
    const s = stocks.find((x) => x.id === h.stockId)
    return a + (s ? h.qty * s.price : 0)
  }, 0)
  const pnl = current - invested

  const holdFor = (stockId: string): StockHolding | undefined => myHoldings.find((h) => h.stockId === stockId)

  const estAmount = useMemo(() => {
    if (!selected || !qty) return 0
    const p = orderType === 'market' ? selected.price : Number(limitPrice) || 0
    return Number(qty) * p
  }, [selected, qty, orderType, limitPrice])

  const openTrade = (s: Stock, sd: 'buy' | 'sell') => {
    setSelected(s)
    setSide(sd)
    setOrderType('market')
    setQty('')
    setLimitPrice('')
    setTradeOpen(true)
  }

  const doOrder = async () => {
    if (!selected) return
    const res = await stockPlaceOrder(
      me.id, selected.id, side, orderType, Number(qty), orderType === 'limit' ? Number(limitPrice) : undefined,
    )
    toast(res.ok ? 'Order executed' : res.error || 'Failed', res.ok ? 'success' : 'error')
    if (res.ok) setTradeOpen(false)
  }

  const detail = selected

  return (
    <div className="pt-3">
      <TopBar
        title="Stock Market"
        left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>}
        right={
          <button onClick={() => { marketTick().then((r) => r.ok && toast('Market moved', 'success')) }} className="p-1.5 text-muted">
            <RefreshCw size={19} />
          </button>
        }
      />

      <div className="mt-2 card p-5 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-accent/15" />
        <div className="relative">
          <p className="flex items-center gap-2 text-[12px] font-bold text-muted uppercase tracking-wide">
            <LineChart size={14} /> Portfolio
          </p>
          <p className="text-[26px] font-bold text-text mt-1.5">{inr(current)}</p>
          <div className="flex items-center gap-3 mt-1 text-[12.5px]">
            <span className="text-muted">Invested {inr(invested)}</span>
            <span className={`font-semibold ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
              {pnl >= 0 ? '+' : ''}{inr(pnl)}
            </span>
            <span className="text-faint">· Buying power {inr(me.balance)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => setKind('equity')} className={`flex-1 py-2 rounded-xl text-[12.5px] font-bold border transition-all ${kind === 'equity' ? 'bg-primary/12 border-primary text-primary' : 'border-line text-muted'}`}>
          Equities · {stocks.filter((s) => s.kind === 'equity').length}
        </button>
        <button onClick={() => setKind('crypto')} className={`flex-1 py-2 rounded-xl text-[12.5px] font-bold border transition-all flex items-center justify-center gap-1.5 ${kind === 'crypto' ? 'bg-warning/12 border-warning text-warning' : 'border-line text-muted'}`}>
          <Bitcoin size={15} /> Crypto · {stocks.filter((s) => s.kind === 'crypto').length}
        </button>
      </div>

      <div className="mt-3">
        <Segmented
          options={[
            { id: 'market', label: 'Market' },
            { id: 'holdings', label: 'Holdings' },
            { id: 'orders', label: 'Orders' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'market' && (
        <div className="mt-3 flex flex-col gap-2.5 pb-2">
          {listStocks.map((s) => {
            const d = pct(s.price, s.prevClose)
            const ud = upDown(d)
            const sp = spark(s.history, 90, 32)
            return (
              <button key={s.id} onClick={() => setSelected(s)} className="card p-4 text-left active:scale-[0.99] transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[14px] text-text flex items-center gap-2">
                      {s.symbol}
                      <span className="text-[10px] font-semibold text-muted bg-surface2 px-1.5 py-0.5 rounded">{s.sector}</span>
                    </p>
                    <p className="text-[11.5px] text-muted">{s.name}</p>
                  </div>
                  <svg width="90" height="32" className="shrink-0">
                    {sp.line && (
                      <>
                        <path d={sp.area} fill={d >= 0 ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)'} />
                        <path d={sp.line} fill="none" stroke={d >= 0 ? 'var(--success)' : 'var(--danger)'} strokeWidth="1.6" />
                      </>
                    )}
                  </svg>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-text">₹{s.price.toFixed(2)}</span>
                    <span className={`text-[11.5px] font-semibold flex items-center gap-0.5 ${ud.cls}`}>
                      {d >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{ud.sign}{d.toFixed(2)}%
                    </span>
                  </div>
                  {holdFor(s.id) && <span className="text-[11px] text-muted">{holdFor(s.id)!.qty} held</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {tab === 'holdings' && (
        <div className="mt-3 flex flex-col gap-2.5 pb-2">
          {myHoldings.filter((h) => stocks.find((x) => x.id === h.stockId)?.kind === kind).length === 0 && (
            <p className="text-center text-[13px] text-muted py-10">{kind === 'crypto' ? 'No crypto holdings yet.' : 'No holdings yet. Buy your first stock!'}</p>
          )}
          {myHoldings.filter((h) => stocks.find((x) => x.id === h.stockId)?.kind === kind).map((h) => {
            const s = stocks.find((x) => x.id === h.stockId)
            if (!s) return null
            const val = h.qty * s.price
            const cost = h.qty * h.avgPrice
            const pl = val - cost
            return (
              <div key={h.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[14px] text-text">{s.symbol}</p>
                    <p className="text-[11.5px] text-muted">{h.qty} × avg ₹{h.avgPrice.toFixed(2)}</p>
                  </div>
                  <button onClick={() => openTrade(s, 'sell')} className="text-[12px] font-bold text-danger bg-danger/10 px-3 py-2 rounded-lg">
                    Sell
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-[15px] font-bold text-text">{inr(val)}</span>
                  <span className={`text-[12.5px] font-semibold ${pl >= 0 ? 'text-success' : 'text-danger'}`}>
                    {pl >= 0 ? '+' : ''}{inr(pl)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'orders' && (
        <div className="mt-3 flex flex-col gap-2.5 pb-2">
          {myOrders.filter((o) => stocks.find((x) => x.id === o.stockId)?.kind === kind).length === 0 && (
            <p className="text-center text-[13px] text-muted py-10">No orders yet</p>
          )}
          {myOrders.filter((o) => stocks.find((x) => x.id === o.stockId)?.kind === kind).map((o) => {
            const s = stocks.find((x) => x.id === o.stockId)
            return (
              <div key={o.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${o.side === 'buy' ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger'}`}>
                      {o.side}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase bg-surface2 text-muted">{o.type}</span>
                    <span className="font-bold text-[13.5px] text-text">{s?.symbol}</span>
                  </div>
                  {o.status === 'open' && (
                    <button
                      onClick={async () => {
                        const res = await stockCancelOrder(me.id, o.id)
                        toast(res.ok ? 'Order cancelled' : res.error || 'Failed', res.ok ? 'success' : 'error')
                      }}
                      className="text-[11.5px] font-bold text-muted"
                    >
                      Cancel
                    </button>
                  )}
                  {o.status === 'filled' && <CheckCircle2 size={16} className="text-success" />}
                  {o.status === 'cancelled' && <XCircle size={16} className="text-faint" />}
                </div>
                <div className="flex justify-between text-[12px] text-muted mt-2">
                  <span>{o.filledQty || o.qty} qty {o.limitPrice ? `@ ₹${o.limitPrice}` : ''}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {fmtTime(o.createdAt)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ---- stock detail ---- */}
      <Sheet open={!!detail && !tradeOpen} onClose={() => setSelected(null)} title="Company">
        {detail && (() => {
          const d = pct(detail.price, detail.prevClose)
          const ud = upDown(d)
          const series = chartSeries(detail.symbol, range, detail.price, detail.history)
          const sp = spark(series, 300, 90)
          return (
            <div className="pt-1 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[20px] font-bold text-text">{detail.symbol}</p>
                  <p className="text-[12.5px] text-muted">{detail.name} · {detail.sector}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${catTint(detail.sector)}`}>{detail.sector}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[30px] font-bold text-text">₹{detail.price.toFixed(2)}</span>
                <span className={`text-[13px] font-bold flex items-center gap-0.5 ${ud.cls}`}>
                  {d >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{ud.sign}{d.toFixed(2)}%
                </span>
              </div>

              <div className="flex gap-1">
                {(['Live', '1D', '1W', '1M', '1Y'] as ChartRange[]).map((r) => (
                  <button key={r} onClick={() => setRange(r)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${range === r ? 'bg-primary/12 text-primary' : 'text-muted'}`}>
                    {r}
                  </button>
                ))}
              </div>

              <svg viewBox="0 0 300 90" className="w-full h-28 rounded-xl bg-surface2">
                {sp.line && (
                  <>
                    <path d={sp.area} fill={d >= 0 ? 'rgba(52,211,153,0.14)' : 'rgba(251,113,133,0.14)'} />
                    <path d={sp.line} fill="none" stroke={d >= 0 ? 'var(--success)' : 'var(--danger)'} strokeWidth="1.8" />
                  </>
                )}
              </svg>
              <div className="flex justify-between text-[10px] text-faint -mt-1">
                <span>open</span>
                <span>{range} price action</span>
                <span>now</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Stat label="Open" value={`₹${detail.dayOpen ? detail.dayOpen.toFixed(2) : '—'}`} />
                <Stat label="Day high" value={`₹${detail.dayHigh ? detail.dayHigh.toFixed(2) : '—'}`} />
                <Stat label="Day low" value={`₹${detail.dayLow ? detail.dayLow.toFixed(2) : '—'}`} />
                <Stat label="Volume" value={fmtVol(detail.volume)} />
                <Stat label="Market cap" value={fmtCr(detail.marketCap)} />
                <Stat label="P/E" value={detail.pe ? detail.pe.toFixed(1) : '—'} />
              </div>

              <div className="flex justify-between text-[12px] text-muted">
                <span>52w low ₹{detail.low52w.toFixed(2)}</span>
                <span>52w high ₹{detail.high52w.toFixed(2)}</span>
              </div>

              {holdFor(detail.id) && (
                <p className="text-[12.5px] text-muted">
                  You hold <span className="font-semibold text-text">{holdFor(detail.id)!.qty}</span> shares at avg ₹{holdFor(detail.id)!.avgPrice.toFixed(2)}
                </p>
              )}

              <div className="flex gap-2">
                <Button full onClick={() => openTrade(detail, 'buy')}>Buy</Button>
                <Button variant="danger" full disabled={!holdFor(detail.id)} onClick={() => openTrade(detail, 'sell')}>Sell</Button>
              </div>
            </div>
          )
        })()}
      </Sheet>

      {/* ---- trade ---- */}
      <Sheet open={tradeOpen} onClose={() => setTradeOpen(false)} title={side === 'buy' ? 'Buy shares' : 'Sell shares'}>
        {selected && (
          <div className="pt-1 flex flex-col gap-3">
            <p className="text-[13px] text-muted">
              {selected.symbol} · <span className="text-text font-semibold">₹{selected.price.toFixed(2)}</span>
            </p>
            <Segmented options={[{ id: 'buy', label: 'Buy' }, { id: 'sell', label: 'Sell' }]} value={side} onChange={setSide} />
            <Segmented options={[{ id: 'market', label: 'Market' }, { id: 'limit', label: 'Limit' }]} value={orderType} onChange={setOrderType} />
            <Field label="Quantity">
              <input type="number" inputMode="numeric" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
            {orderType === 'limit' && (
              <Field label="Limit price">
                <input type="number" inputMode="decimal" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder="₹ per share" className={inputCls} />
              </Field>
            )}
            {estAmount > 0 && (
              <div className="card p-3.5 text-[13px]">
                {orderType === 'market' ? 'Estimated' : 'Blocked'} amount: <span className="font-bold text-text">{inr(estAmount)}</span>
                <p className="text-[11.5px] text-muted mt-1">
                  {orderType === 'limit' && side === 'buy' ? 'Funds are blocked until the order fills or is cancelled.' : orderType === 'limit' && side === 'sell' ? 'Shares are blocked until the order fills or is cancelled.' : 'Market orders execute instantly at the current price.'}
                </p>
              </div>
            )}
            <Button full disabled={!qty || Number(qty) <= 0 || (orderType === 'limit' && !limitPrice)} onClick={doOrder}>
              {side === 'buy' ? 'Buy' : 'Sell'} {qty} {selected.symbol}
            </Button>
          </div>
        )}
      </Sheet>

    </div>
  )
}

const catTint = (sector: string): string => {
  if (/tech|IT|soft/i.test(sector)) return 'bg-primary/12 text-primary'
  if (/bank|fin/i.test(sector)) return 'bg-accent/12 text-accent'
  if (/energy|power/i.test(sector)) return 'bg-warning/12 text-warning'
  if (/pharma|health/i.test(sector)) return 'bg-success/12 text-success'
  if (/auto|metal|mining/i.test(sector)) return 'bg-danger/12 text-danger'
  return 'bg-surface2 text-muted'
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface2 rounded-xl p-2.5">
      <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
      <p className="text-[13px] font-bold text-text mt-0.5">{value}</p>
    </div>
  )
}
