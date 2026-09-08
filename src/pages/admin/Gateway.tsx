import { useMemo, useState } from 'react'
import {
  Store, Copy, Check, Plus, Globe, KeyRound, Wallet, ArrowDownToLine, Terminal, X, PlayCircle,
  ReceiptText, TrendingUp, ChevronRight, RotateCcw, Link2, Clock, CheckCircle2, RefreshCw,
  Ban, Unlock, Download, ShieldCheck, Search, IndianRupee, BadgePercent, Undo2, Activity, CircleDollarSign,
} from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inr, inrFull, fmtDateTime, fmtTime } from '../../lib/utils'
import type { Merchant, GatewayOrder, GatewayEvent } from '../../lib/types'
import { Button, Field, Sheet, TopBar, inputCls } from '../../components/ui'

type Tab = 'all' | 'pending' | 'paid' | 'refunded' | 'failed'

const EVENT_LABEL: Record<string, string> = {
  created: 'Order created',
  otp_sent: 'OTP sent',
  paid: 'Payment received',
  settled: 'Settled to merchant',
  refunded: 'Refunded',
  blocked: 'Merchant blocked',
  activated: 'Merchant activated',
  keys_rotated: 'API keys rotated',
}

function methodLabel(m?: string | null): string {
  if (!m) return '—'
  if (m === 'balance' || m === 'upi') return 'UPI / Balance'
  if (m === 'debit') return 'Debit card'
  if (m === 'card') return 'Card'
  return m
}

function isToday(ts: number | null): boolean {
  if (!ts) return false
  const d = new Date(ts)
  const n = new Date()
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
}

export default function Gateway() {
  const toast = useToast((s) => s.toast)
  const merchants = useBank((s) => s.merchants)
  const orders = useBank((s) => s.gatewayOrders)
  const events = useBank((s) => s.gatewayEvents)
  const settlements = useBank((s) => s.gatewaySettlements)
  const users = useBank((s) => s.users)
  const refreshGateway = useBank((s) => s.refreshGateway)
  const registerMerchant = useBank((s) => s.registerMerchant)
  const gatewaySettle = useBank((s) => s.gatewaySettle)
  const gatewayRefund = useBank((s) => s.gatewayRefund)
  const gatewayCreateOrder = useBank((s) => s.gatewayCreateOrder)
  const merchantSetStatus = useBank((s) => s.merchantSetStatus)
  const merchantRotateKeys = useBank((s) => s.merchantRotateKeys)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [app, setApp] = useState('')
  const [callback, setCallback] = useState('')
  const [created, setCreated] = useState<Merchant | null>(null)
  const [copied, setCopied] = useState('')
  const [docs, setDocs] = useState(false)
  const [testOpen, setTestOpen] = useState<Merchant | null>(null)
  const [testAmt, setTestAmt] = useState('100')
  const [testRef, setTestRef] = useState('TEST-' + Date.now().toString().slice(-6))
  const [testNote, setTestNote] = useState('Test purchase')
  const [orderDetail, setOrderDetail] = useState<GatewayOrder | null>(null)
  const [merchantDetail, setMerchantDetail] = useState<Merchant | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')

  const copy = async (v: string, label: string) => {
    try {
      await navigator.clipboard.writeText(v)
      setCopied(label)
      setTimeout(() => setCopied(''), 1500)
      toast('Copied', 'success')
    } catch {
      toast('Could not copy', 'error')
    }
  }

  const paid = orders.filter((o) => o.status === 'paid')
  const refunded = orders.filter((o) => o.status === 'refunded')
  const pending = orders.filter((o) => o.status === 'pending')
  const failed = orders.filter((o) => o.status === 'failed' || o.status === 'expired')
  const completed = [...paid, ...refunded]
  const gmv = completed.reduce((a, o) => a + o.amount, 0)
  const fees = completed.reduce((a, o) => a + o.fee, 0)
  const settledOut = settlements.reduce((a, s) => a + s.amount, 0)
  const todayRevenue = paid.filter((o) => isToday(o.paidAt)).reduce((a, o) => a + o.amount, 0)
  const attempted = orders.filter((o) => o.status !== 'pending').length
  const successRate = attempted ? Math.round(((paid.length + refunded.length) / attempted) * 100) : 0

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders
      .filter((o) => (tab === 'all' ? true : tab === 'failed' ? o.status === 'failed' || o.status === 'expired' : o.status === tab))
      .filter((o) => {
        if (!q) return true
        const m = merchants.find((x) => x.id === o.merchantId)
        const payer = users.find((u) => u.id === o.payerId)
        return (
          o.orderRef.toLowerCase().includes(q) ||
          (m?.name || '').toLowerCase().includes(q) ||
          (m?.appName || '').toLowerCase().includes(q) ||
          (payer?.name || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [orders, merchants, users, search, tab])

  const exportCsv = () => {
    const head = ['Date', 'Merchant', 'Order ref', 'Amount', 'Fee', 'Net', 'Status', 'Method', 'Payer', 'Pay link']
    const rows = filtered.map((o) => {
      const m = merchants.find((x) => x.id === o.merchantId)
      const payer = users.find((u) => u.id === o.payerId)
      const payUrl = `https://jackbhai.github.io/jack-bank/#/gateway/${o.payToken}`
      return [
        new Date(o.createdAt).toISOString(),
        m?.name || '',
        o.orderRef,
        o.amount,
        o.fee,
        o.amount - o.fee,
        o.status,
        o.payMethod || '',
        payer?.name || '',
        payUrl,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const blob = new Blob([[head.join(','), ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `gateway-orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('CSV exported', 'success')
  }

  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: 'all', label: 'All', n: orders.length },
    { id: 'pending', label: 'Pending', n: pending.length },
    { id: 'paid', label: 'Paid', n: paid.length },
    { id: 'refunded', label: 'Refunded', n: refunded.length },
    { id: 'failed', label: 'Failed', n: failed.length },
  ]

  return (
    <div className="pt-3">
      <TopBar
        title="Payment Gateway"
        right={
          <div className="flex items-center gap-1">
            <button onClick={() => refreshGateway()} className="p-1.5 text-muted"><RefreshCw size={18} /></button>
            <button onClick={() => setDocs(true)} className="p-1.5 text-muted"><Terminal size={19} /></button>
          </div>
        }
      />

      {/* hero */}
      <div className="mt-2 card p-5 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-accent/15" />
        <div className="absolute -bottom-16 -left-10 w-40 h-40 rounded-full bg-primary/10" />
        <div className="relative">
          <p className="flex items-center gap-2 text-[12px] font-bold text-muted uppercase tracking-wide">
            <Wallet size={14} /> Gateway
          </p>
          <div className="flex items-end justify-between mt-1.5">
            <p className="text-[26px] font-bold text-text">{inr(gmv)} <span className="text-[12px] font-semibold text-muted">GMV</span></p>
            <p className="text-[12.5px] text-muted text-right">Unsettled {inr(merchants.reduce((a, m) => a + m.settlement, 0))}</p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[12.5px] text-muted">{merchants.length} merchant apps · {orders.length} orders</p>
          </div>
          <Button className="mt-3" onClick={() => { setOpen(true); setCreated(null); setName(''); setApp(''); setCallback('') }}>
            <Plus size={16} /> Register merchant app
          </Button>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="card p-3">
          <p className="text-[10px] text-muted uppercase tracking-wide flex items-center gap-1"><IndianRupee size={11} /> Fees earned</p>
          <p className="text-[16px] font-bold text-success mt-0.5">{inr(fees)}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-muted uppercase tracking-wide flex items-center gap-1"><BadgePercent size={11} /> Success rate</p>
          <p className="text-[16px] font-bold text-text mt-0.5">{attempted ? `${successRate}%` : '—'}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-muted uppercase tracking-wide flex items-center gap-1"><TrendingUp size={11} /> Today</p>
          <p className="text-[16px] font-bold text-text mt-0.5">{inr(todayRevenue)}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-muted uppercase tracking-wide flex items-center gap-1"><Undo2 size={11} /> Refunds</p>
          <p className="text-[16px] font-bold text-danger mt-0.5">{refunded.length} · {inr(refunded.reduce((a, o) => a + o.amount, 0))}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-muted uppercase tracking-wide flex items-center gap-1"><CircleDollarSign size={11} /> Settled out</p>
          <p className="text-[16px] font-bold text-text mt-0.5">{inr(settledOut)}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-muted uppercase tracking-wide flex items-center gap-1"><Activity size={11} /> Paid / pending</p>
          <p className="text-[16px] font-bold text-text mt-0.5">{paid.length} / {pending.length}</p>
        </div>
      </div>

      {/* merchants */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-bold text-text">Merchant apps</p>
          <span className="text-[11px] text-muted">{merchants.filter((m) => m.status === 'active').length} active</span>
        </div>
        {merchants.length === 0 && <p className="text-center text-[13px] text-muted py-8">No merchant apps yet. Register one to accept payments.</p>}
        <div className="flex flex-col gap-2.5">
          {merchants.map((m) => {
            const mOrders = orders.filter((o) => o.merchantId === m.id)
            const mRevenue = mOrders.filter((o) => o.status === 'paid' || o.status === 'refunded').reduce((a, o) => a + o.amount, 0)
            return (
              <div key={m.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => setMerchantDetail(m)} className="flex items-center gap-3 min-w-0 text-left flex-1">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.status === 'active' ? 'bg-accent/12 text-accent' : 'bg-danger/12 text-danger'}`}>
                      <Store size={19} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-[14px] text-text truncate">{m.name}</span>
                      <span className="block text-[11.5px] text-muted truncate">{m.appName} · {mOrders.length} orders · revenue {inr(mRevenue)}</span>
                    </span>
                  </button>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ml-2 ${m.status === 'active' ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger'}`}>{m.status}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                  <button onClick={() => copy(m.apiKey, 'key' + m.id)} className="flex items-center gap-1.5 text-[11.5px] font-mono text-muted max-w-[46%] truncate">
                    <KeyRound size={12} /> {m.apiKey.slice(0, 12)}…
                  </button>
                  <button onClick={() => { setTestAmt('100'); setTestRef('TEST-' + Date.now().toString().slice(-6)); setTestNote('Test purchase'); setTestOpen(m) }} className="flex items-center gap-1 text-[11.5px] font-bold text-accent bg-accent/12 px-2.5 py-1.5 rounded-lg">
                    <PlayCircle size={13} /> Test pay
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[12px] text-muted flex items-center gap-1">
                    <ReceiptText size={12} /> Unsettled <span className="font-bold text-text">{inr(m.settlement)}</span>
                  </span>
                  <button
                    onClick={async () => {
                      const res = await gatewaySettle(m.id)
                      toast(res.ok ? `Settled ${inr(res.amount!)} (${res.ordersSetled ?? 0} orders)` : res.error || 'Failed', res.ok ? 'success' : 'error')
                    }}
                    disabled={m.settlement <= 0}
                    className="flex items-center gap-1 text-[11.5px] font-bold text-primary bg-primary/12 px-2.5 py-1.5 rounded-lg disabled:opacity-40"
                  >
                    <ArrowDownToLine size={13} /> Settle
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* orders */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-bold text-text">Orders</p>
          <button onClick={exportCsv} className="flex items-center gap-1 text-[11.5px] font-bold text-primary bg-primary/12 px-2.5 py-1.5 rounded-lg">
            <Download size={13} /> CSV
          </button>
        </div>
        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant, order ref, payer…"
            className={inputCls + ' !pl-9'}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-colors ${tab === t.id ? 'bg-primary text-white' : 'bg-surface2 text-muted'}`}
            >
              {t.label} {t.n}
            </button>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-center text-[13px] text-muted py-6">No orders match</p>}
        <div className="flex flex-col gap-2">
          {filtered.slice(0, 60).map((o) => {
            const m = merchants.find((x) => x.id === o.merchantId)
            const payer = users.find((u) => u.id === o.payerId)
            return (
              <button
                key={o.id}
                onClick={() => setOrderDetail(o)}
                className="card p-3.5 flex items-center justify-between text-left active:bg-surface2 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text truncate">{m?.name || '—'} · <span className="text-muted font-normal">{o.orderRef}</span></p>
                  <p className="text-[11px] text-muted">
                    {payer ? `Paid by ${payer.name}` : 'Awaiting payment'} · {fmtDateTime(o.createdAt)}
                    {o.fee > 0 && <span className="text-faint"> · fee {inr(o.fee)}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[13px] font-bold text-text">{inr(o.amount)}</span>
                  <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase ${o.status === 'paid' ? 'bg-success/12 text-success' : o.status === 'pending' ? 'bg-warning/12 text-warning' : o.status === 'refunded' ? 'bg-danger/12 text-danger' : 'bg-surface2 text-muted'}`}>
                    {o.status}
                  </span>
                  <ChevronRight size={15} className="text-faint" />
                </div>
              </button>
            )
          })}
          {filtered.length > 60 && <p className="text-center text-[11.5px] text-muted py-2">Showing first 60 of {filtered.length} — refine the search or filter</p>}
        </div>
      </div>

      {/* register */}
      <Sheet open={open} onClose={() => setOpen(false)} title="Register merchant app">
        {!created ? (
          <div className="pt-1 flex flex-col gap-3">
            <Field label="Business name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Abibas Games" className={inputCls} />
            </Field>
            <Field label="App / game name">
              <input value={app} onChange={(e) => setApp(e.target.value)} placeholder="e.g. Racer X" className={inputCls} />
            </Field>
            <Field label="Webhook callback URL (optional)">
              <input value={callback} onChange={(e) => setCallback(e.target.value)} placeholder="https://yourgame.com/pay/webhook" className={inputCls} />
            </Field>
            <Button full disabled={!name.trim() || !app.trim()} onClick={async () => {
              const res = await registerMerchant(name.trim(), app.trim(), callback.trim())
              if (res.ok && res.merchant) setCreated(res.merchant)
              else toast(res.error || 'Failed', 'error')
            }}>
              <Globe size={16} /> Create app & generate keys
            </Button>
          </div>
        ) : (
          <div className="pt-1 flex flex-col gap-3">
            <p className="text-[13px] text-success font-semibold">App registered. Copy the keys now — the secret is shown only once.</p>
            <div className="card p-3.5 space-y-2">
              <button onClick={() => copy(created.apiKey, 'k')} className="w-full flex items-center justify-between gap-2 text-left">
                <span className="text-[11px] text-muted uppercase">API Key</span>
                <span className="font-mono text-[12px] text-text truncate flex items-center gap-1">
                  {copied === 'k' ? <Check size={14} className="text-success" /> : <Copy size={13} />} {created.apiKey}
                </span>
              </button>
              <button onClick={() => copy(created.apiSecret, 's')} className="w-full flex items-center justify-between gap-2 text-left border-t border-line pt-2">
                <span className="text-[11px] text-muted uppercase">API Secret</span>
                <span className="font-mono text-[12px] text-text truncate flex items-center gap-1">
                  {copied === 's' ? <Check size={14} className="text-success" /> : <Copy size={13} />} {created.apiSecret}
                </span>
              </button>
            </div>
            <Button full onClick={() => { setOpen(false); setCreated(null) }}>Done</Button>
          </div>
        )}
      </Sheet>

      {/* test payment */}
      <Sheet open={!!testOpen} onClose={() => setTestOpen(null)} title="Test payment">
        {testOpen && (
          <div className="pt-1 flex flex-col gap-3">
            <p className="text-[12.5px] text-muted">Simulate a purchase from <span className="font-semibold text-text">{testOpen.name}</span>. This creates a real gateway order and opens the pay page.</p>
            <Field label="Amount">
              <input type="number" inputMode="decimal" value={testAmt} onChange={(e) => setTestAmt(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Order reference">
              <input value={testRef} onChange={(e) => setTestRef(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Note">
              <input value={testNote} onChange={(e) => setTestNote(e.target.value)} className={inputCls} />
            </Field>
            <Button full disabled={!testAmt || Number(testAmt) <= 0} onClick={async () => {
              const res = await gatewayCreateOrder(testOpen.apiKey, testOpen.apiSecret, testRef, Number(testAmt), testNote)
              if (res.ok && res.order) {
                toast('Order created — opening pay page', 'success')
                setTestOpen(null)
                window.location.hash = '#/gateway/' + res.order.pay_token
              } else toast(res.error || 'Failed', 'error')
            }}>
              <PlayCircle size={16} /> Create order & pay
            </Button>
          </div>
        )}
      </Sheet>

      {/* merchant detail */}
      <Sheet open={!!merchantDetail} onClose={() => setMerchantDetail(null)} title="Merchant">
        {merchantDetail && (() => {
          const m = merchantDetail
          const mOrders = orders.filter((o) => o.merchantId === m.id)
          const mRevenue = mOrders.filter((o) => o.status === 'paid' || o.status === 'refunded').reduce((a, o) => a + o.amount, 0)
          const mFees = mOrders.filter((o) => o.status === 'paid' || o.status === 'refunded').reduce((a, o) => a + o.fee, 0)
          const mSettlements = settlements.filter((s) => s.merchantId === m.id).sort((a, b) => b.settledAt - a.settledAt)
          const mEvents = events.filter((e) => e.merchantId === m.id && e.orderId === null).sort((a, b) => a.createdAt - b.createdAt)
          return (
            <div className="pt-2 flex flex-col gap-4 pb-2">
              <div className="flex flex-col items-center text-center gap-1">
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${m.status === 'active' ? 'bg-accent/12 text-accent' : 'bg-danger/12 text-danger'}`}>
                  <Store size={22} />
                </span>
                <p className="text-[16px] font-bold text-text">{m.name}</p>
                <p className="text-[12px] text-muted">{m.appName}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${m.status === 'active' ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger'}`}>{m.status}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="card p-3 text-center"><p className="text-[10px] text-muted uppercase">Orders</p><p className="text-[15px] font-bold text-text">{mOrders.length}</p></div>
                <div className="card p-3 text-center"><p className="text-[10px] text-muted uppercase">Revenue</p><p className="text-[15px] font-bold text-success">{inr(mRevenue)}</p></div>
                <div className="card p-3 text-center"><p className="text-[10px] text-muted uppercase">Fees</p><p className="text-[15px] font-bold text-text">{inr(mFees)}</p></div>
              </div>

              <div className="card p-3.5 space-y-0">
                <DetailRow label="API key" value={m.apiKey} mono />
                <DetailRow label="API secret" value={'•'.repeat(10) + m.apiSecret.slice(-4)} mono />
                <DetailRow label="Callback" value={m.callbackUrl || 'Polling mode'} />
                <DetailRow label="Registered" value={fmtDateTime(m.createdAt)} last />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  full
                  disabled={m.settlement <= 0}
                  onClick={async () => {
                    const res = await gatewaySettle(m.id)
                    toast(res.ok ? `Settled ${inr(res.amount!)}` : res.error || 'Failed', res.ok ? 'success' : 'error')
                  }}
                >
                  <ArrowDownToLine size={15} /> Settle {inr(m.settlement)}
                </Button>
                <Button
                  variant="ghost"
                  full
                  onClick={async () => {
                    const res = await merchantRotateKeys(m.id)
                    if (res.ok) {
                      toast('Keys rotated — copy the new secret', 'success')
                      setCreated({ ...m, apiKey: res.apiKey!, apiSecret: res.apiSecret! })
                      setOpen(true)
                    } else toast(res.error || 'Failed', 'error')
                  }}
                >
                  <KeyRound size={15} /> Rotate keys
                </Button>
              </div>

              <Button
                variant={m.status === 'active' ? 'danger' : 'primary'}
                full
                onClick={async () => {
                  const next = m.status === 'active' ? 'blocked' : 'active'
                  const res = await merchantSetStatus(m.id, next)
                  toast(res.ok ? `Merchant ${next}` : res.error || 'Failed', res.ok ? 'success' : 'error')
                }}
              >
                {m.status === 'active' ? <Ban size={15} /> : <Unlock size={15} />}
                {m.status === 'active' ? 'Block merchant' : 'Activate merchant'}
              </Button>

              {mSettlements.length > 0 && (
                <div>
                  <p className="text-[12px] font-bold text-muted uppercase tracking-wide mb-1.5">Settlement history</p>
                  <div className="flex flex-col gap-1.5">
                    {mSettlements.map((s) => (
                      <div key={s.id} className="card p-3 flex items-center justify-between">
                        <span className="text-[12.5px] text-muted">{fmtDateTime(s.settledAt)} · {s.orders} orders</span>
                        <span className="text-[13px] font-bold text-success">{inr(s.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mEvents.length > 0 && (
                <div>
                  <p className="text-[12px] font-bold text-muted uppercase tracking-wide mb-1.5">Activity</p>
                  <div className="flex flex-col gap-1.5">
                    {mEvents.slice().reverse().slice(0, 8).map((e) => (
                      <div key={e.id} className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="text-muted flex items-center gap-1.5"><Activity size={12} className="text-faint" /> {EVENT_LABEL[e.event] || e.event}</span>
                        <span className="text-faint">{fmtTime(e.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </Sheet>

      {/* order detail */}
      <Sheet open={!!orderDetail} onClose={() => setOrderDetail(null)} title="Order details">
        {orderDetail && (() => {
          const o = orderDetail
          const m = merchants.find((x) => x.id === o.merchantId)
          const payer = users.find((u) => u.id === o.payerId)
          const net = o.amount - o.fee
          const oEvents = events.filter((e) => e.orderId === o.id).sort((a, b) => a.createdAt - b.createdAt)
          const payUrl = `https://jackbhai.github.io/jack-bank/#/gateway/${o.payToken}`
          return (
            <div className="pt-2 flex flex-col gap-4 pb-2">
              <div className="flex flex-col items-center text-center gap-1.5">
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${o.status === 'paid' ? 'bg-success/12 text-success' : o.status === 'pending' ? 'bg-warning/12 text-warning' : o.status === 'refunded' ? 'bg-danger/12 text-danger' : 'bg-surface2 text-muted'}`}>
                  <Store size={22} />
                </span>
                <p className="text-[15px] font-bold text-text">{m?.name || 'Merchant'}</p>
                <p className="text-[26px] font-bold text-text">{inrFull(o.amount)}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${o.status === 'paid' ? 'bg-success/12 text-success' : o.status === 'pending' ? 'bg-warning/12 text-warning' : o.status === 'refunded' ? 'bg-danger/12 text-danger' : 'bg-surface2 text-muted'}`}>
                  {o.status}
                </span>
              </div>

              {/* event timeline */}
              <div className="card p-4">
                <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">Timeline</p>
                {oEvents.length === 0 && (
                  <p className="text-[12.5px] text-muted">No events recorded yet.</p>
                )}
                {oEvents.map((e, i) => (
                  <div key={e.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center ${e.event === 'refunded' ? 'bg-danger text-white' : 'bg-primary text-white'}`}>
                        {e.event === 'created' ? <Clock size={12} /> : e.event === 'otp_sent' ? <KeyRound size={12} /> : e.event === 'settled' ? <CircleDollarSign size={12} /> : e.event === 'refunded' ? <RotateCcw size={12} /> : <CheckCircle2 size={13} />}
                      </span>
                      {i < oEvents.length - 1 && <span className="w-0.5 flex-1 min-h-[16px] bg-line" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-[13px] font-semibold text-text">{EVENT_LABEL[e.event] || e.event}</p>
                      <p className="text-[11px] text-muted">{fmtDateTime(e.createdAt)}</p>
                      {e.meta && Object.keys(e.meta).length > 0 && (
                        <p className="text-[11px] text-faint">
                          {Object.entries(e.meta).map(([k, v]) => `${k} ${v}`).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="card p-3.5 space-y-0">
                <DetailRow label="Order reference" value={o.orderRef} mono />
                <DetailRow label="App" value={m?.appName || '—'} />
                <DetailRow label="Payer" value={payer ? `${payer.name} (${payer.upiId})` : '—'} />
                <DetailRow label="Pay method" value={methodLabel(o.payMethod)} />
                <DetailRow label="Gateway fee" value={o.fee > 0 ? inr(o.fee) : '—'} />
                <DetailRow label="Net settlement" value={o.status === 'pending' ? '—' : inr(net)} />
                {o.note && <DetailRow label="Note" value={o.note} />}
                <DetailRow label="Currency" value={o.currency} last />
              </div>

              <button
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(payUrl)
                    toast('Pay link copied', 'success')
                  } catch {
                    toast('Could not copy', 'error')
                  }
                }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface2 border border-line text-[13px] font-semibold text-text"
              >
                <Link2 size={15} /> Copy pay link
              </button>

              {o.status === 'paid' && (
                <Button
                  variant="danger"
                  full
                  onClick={async () => {
                    const res = await gatewayRefund(o.id)
                    toast(res.ok ? `Refunded ${inrFull(o.amount)}` : res.error || 'Failed', res.ok ? 'success' : 'error')
                    if (res.ok) setOrderDetail(null)
                  }}
                >
                  <RotateCcw size={16} /> Refund payment
                </Button>
              )}
            </div>
          )
        })()}
      </Sheet>

      {/* docs */}
      <Sheet open={docs} onClose={() => setDocs(false)} title="Gateway API">
        <div className="pt-1 flex flex-col gap-3 text-[12.5px] text-muted">
          <p>Integrate Jack Bank payments in any game/app with REST calls (PostgREST RPC). All responses are JSON.</p>
          <pre className="card p-3.5 text-[11.5px] font-mono text-text bg-surface2 overflow-x-auto whitespace-pre-wrap">
{`POST /rest/v1/rpc/jb_gateway_create_order
Headers: apikey: <anon>, Content-Type: application/json
Body: { p_api_key, p_api_secret, p_order_ref,
        p_amount, p_note }
→ returns pay_url — open it for the user`}
          </pre>
          <pre className="card p-3.5 text-[11.5px] font-mono text-text bg-surface2 overflow-x-auto whitespace-pre-wrap">
{`POST /rest/v1/rpc/jb_gateway_verify
Body: { p_api_key, p_api_secret, p_order_ref }
→ returns status: paid / pending / refunded`}
          </pre>
          <pre className="card p-3.5 text-[11.5px] font-mono text-text bg-surface2 overflow-x-auto whitespace-pre-wrap">
{`Admin-only controls (signed in as admin):
jb_gateway_refund        { p_order }     reverse a payment
jb_gateway_settle        { p_merchant }  pay out settlement balance
jb_merchant_set_status   { p_merchant, p_status }
jb_merchant_rotate_keys  { p_merchant }  new api_key + api_secret`}
          </pre>
          <p>Every order logs events (created, OTP sent, paid, settled, refunded) visible in the order timeline. Payments settle instantly into the merchant's Jack Bank settlement balance.</p>
          <div className="flex items-center gap-1.5 text-[11px] text-faint">
            <ShieldCheck size={13} /> Reusable payment gateway for future games.
          </div>
          <Button variant="ghost" full onClick={() => setDocs(false)}><X size={15} /> Close</Button>
        </div>
      </Sheet>
    </div>
  )
}

function DetailRow({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 gap-3 ${last ? '' : 'border-b border-line'}`}>
      <span className="text-[12px] text-muted shrink-0">{label}</span>
      <span className={`text-[12.5px] font-semibold text-text text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
