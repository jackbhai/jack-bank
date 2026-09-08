import { useNavigate } from 'react-router-dom'
import { ChevronLeft, LineChart, PieChart, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inrCompact } from '../../lib/utils'
import { pct, upDown, spark } from '../../lib/market'
import { TopBar } from '../../components/ui'

export default function Markets() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const stocks = useBank((s) => s.stocks)
  const funds = useBank((s) => s.mfFunds)
  const marketTick = useBank((s) => s.marketTick)
  const mfNavTick = useBank((s) => s.mfNavTick)

  const gainers = [...stocks].sort((a, b) => pct(b.price, b.prevClose) - pct(a.price, a.prevClose)).slice(0, 3)
  const losers = [...stocks].sort((a, b) => pct(a.price, b.prevClose) - pct(b.price, b.prevClose)).slice(0, 3)

  return (
    <div className="pt-3">
      <TopBar title="Markets Control" left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} />

      <div className="mt-2 grid grid-cols-2 gap-2.5">
        <button
          onClick={async () => { const r = await marketTick(); toast(r.ok ? 'Stock prices moved' : r.error || 'Failed', r.ok ? 'success' : 'error') }}
          className="card p-4 text-left active:scale-[0.98] transition-all"
        >
          <span className="w-10 h-10 rounded-xl bg-accent/12 text-accent flex items-center justify-center"><LineChart size={19} /></span>
          <p className="text-[13px] font-bold text-text mt-2.5">Advance market</p>
          <p className="text-[11.5px] text-muted">Move all {stocks.length} stock prices</p>
        </button>
        <button
          onClick={async () => { const r = await mfNavTick(); toast(r.ok ? 'Fund NAVs moved' : r.error || 'Failed', r.ok ? 'success' : 'error') }}
          className="card p-4 text-left active:scale-[0.98] transition-all"
        >
          <span className="w-10 h-10 rounded-xl bg-primary/12 text-primary flex items-center justify-center"><PieChart size={19} /></span>
          <p className="text-[13px] font-bold text-text mt-2.5">Advance NAVs</p>
          <p className="text-[11.5px] text-muted">Refresh {funds.length} mutual fund NAVs</p>
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-[13px] font-bold text-text flex items-center gap-2"><TrendingUp size={15} className="text-success" /> Top gainers</p>
        <p className="text-[11px] text-muted">this session</p>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {gainers.map((s) => {
          const d = pct(s.price, s.prevClose)
          return <Row key={s.id} symbol={s.symbol} name={s.name} price={s.price} change={d} />
        })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-[13px] font-bold text-text flex items-center gap-2"><TrendingDown size={15} className="text-danger" /> Top losers</p>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {losers.map((s) => {
          const d = pct(s.price, s.prevClose)
          return <Row key={s.id} symbol={s.symbol} name={s.name} price={s.price} change={d} />
        })}
      </div>

      <div className="mt-5">
        <p className="text-[13px] font-bold text-text mb-2">Fund NAVs</p>
        <div className="card divide-y divide-line overflow-hidden">
          {funds.map((f) => {
            const d = pct(f.nav, f.prevNav)
            const ud = upDown(d)
            return (
              <div key={f.id} className="flex items-center justify-between p-3.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text truncate">{f.name}</p>
                  <p className="text-[11px] text-muted">{f.category} · AUM {inrCompact(f.aum * 10000000)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold text-text">₹{f.nav.toFixed(2)}</p>
                  <p className={`text-[11px] font-semibold ${ud.cls}`}>{ud.sign}{d.toFixed(2)}%</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-5 card p-4 flex items-center gap-2 text-[12px] text-muted">
        <RefreshCw size={14} className="text-primary shrink-0" />
        Prices update live for all users via realtime. Advance the market to simulate a new trading session.
      </div>
    </div>
  )
}

function Row({ symbol, name, price, change }: { symbol: string; name: string; price: number; change: number }) {
  const ud = upDown(change)
  return (
    <div className="card p-3.5 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-[13.5px] font-bold text-text">{symbol}</p>
        <p className="text-[11px] text-muted truncate">{name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[13.5px] font-bold text-text">₹{price.toFixed(2)}</p>
        <p className={`text-[11.5px] font-semibold ${ud.cls}`}>{ud.sign}{change.toFixed(2)}%</p>
      </div>
    </div>
  )
}
