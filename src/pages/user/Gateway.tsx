import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Globe, Store, Clock, CheckCircle2, XCircle, ShieldCheck, Copy, Check,
  KeyRound, Lock, Loader2, ReceiptText, Ban, RefreshCw, Wallet,
} from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inr, fmtDateTime, copyText } from '../../lib/utils'
import { ANON_KEY } from '../../lib/supabase'
import { Button, Field, Sheet, TopBar, inputCls } from '../../components/ui'
import type { Merchant } from '../../lib/types'

export default function Gateway() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const myMerchant = useBank((s) => s.myMerchant)
  const merchantGetMine = useBank((s) => s.merchantGetMine)
  const merchantApply = useBank((s) => s.merchantApply)
  const merchantMyOrders = useBank((s) => s.merchantMyOrders)

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [app, setApp] = useState('')
  const [callback, setCallback] = useState('')
  const [orders, setOrders] = useState<any[]>([])
  const [copied, setCopied] = useState('')
  const [docs, setDocs] = useState(false)
  const [reapply, setReapply] = useState(false)

  useEffect(() => {
    (async () => {
      await merchantGetMine()
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!myMerchant) return
    merchantMyOrders().then((r) => { if (r.ok) setOrders(r.orders || []) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myMerchant?.id, myMerchant?.status])

  const copy = async (v: string, label: string) => {
    const ok = await copyText(v)
    if (ok) {
      setCopied(label)
      setTimeout(() => setCopied(''), 1400)
      toast('Copied', 'success')
    } else {
      toast('Could not copy', 'error')
    }
  }

  const apply = async () => {
    if (!name.trim() || !app.trim()) {
      toast('Enter business and app name', 'error')
      return
    }
    setBusy(true)
    const res = await merchantApply(name.trim(), app.trim(), callback.trim())
    setBusy(false)
    if (res.ok) {
      toast('Application submitted — admin will review', 'success')
      setName(''); setApp(''); setCallback(''); setReapply(false)
    } else toast(res.error || 'Failed', 'error')
  }

  const KeyRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
    <button
      onClick={() => copy(value, label)}
      className="w-full flex items-center justify-between gap-2 py-2.5 text-left border-b border-line last:border-b-0"
    >
      <span className="flex items-center gap-2 text-[11px] font-bold text-muted uppercase tracking-wide shrink-0">
        {copied === label ? <Check size={14} className="text-success" /> : <Copy size={13} />} {label}
      </span>
      <span className={`text-[12.5px] font-semibold text-text text-right break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </button>
  )

  const renderBody = () => {
    if (!myMerchant || (myMerchant.status === 'rejected' && reapply)) {
      // apply form
      return (
        <div className="card p-5 flex flex-col gap-4 anim-up">
          <div className="flex flex-col items-center text-center gap-2">
            <span className="w-14 h-14 rounded-2xl bg-accent/12 text-accent flex items-center justify-center"><Store size={26} /></span>
            <p className="text-[16px] font-bold text-text">Your own payment gateway</p>
            <p className="text-[12.5px] text-muted">
              Accept Jack Bank payments in your game or app. Linked to your account — the admin must approve it before keys are issued.
            </p>
          </div>
          <Field label="Business name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Abibas Games" className={inputCls} />
          </Field>
          <Field label="App / game name">
            <input value={app} onChange={(e) => setApp(e.target.value)} placeholder="e.g. Racer X" className={inputCls} />
          </Field>
          <Field label="Webhook callback URL (optional)">
            <input value={callback} onChange={(e) => setCallback(e.target.value)} placeholder="https://yourgame.com/pay/webhook" className={inputCls} />
          </Field>
          <Button full disabled={busy || !name.trim() || !app.trim()} onClick={apply}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />} Apply for gateway
          </Button>
        </div>
      )
    }

    if (myMerchant.status === 'pending') {
      return (
        <div className="card p-6 flex flex-col items-center text-center gap-3 anim-up">
          <span className="w-14 h-14 rounded-2xl bg-warning/12 text-warning flex items-center justify-center"><Clock size={26} /></span>
          <p className="text-[16px] font-bold text-text">Pending admin approval</p>
          <p className="text-[12.5px] text-muted">
            <span className="font-semibold text-text">{myMerchant.name}</span> · {myMerchant.appName}<br />
            The admin must approve your gateway. Your keys will appear here once it is approved.
          </p>
          <div className="w-full rounded-xl bg-surface2 border border-line px-3 py-2.5 flex items-center justify-center gap-1.5 text-[12px] text-muted">
            <Lock size={13} /> Keys are locked until the admin approves
          </div>
        </div>
      )
    }

    if (myMerchant.status === 'rejected') {
      return (
        <div className="card p-6 flex flex-col items-center text-center gap-3 anim-up">
          <span className="w-14 h-14 rounded-2xl bg-danger/12 text-danger flex items-center justify-center"><XCircle size={26} /></span>
          <p className="text-[16px] font-bold text-text">Application rejected</p>
          <p className="text-[12.5px] text-muted">The admin rejected <span className="font-semibold text-text">{myMerchant.name}</span>. You can apply again.</p>
          <Button full onClick={() => setReapply(true)}>Re-apply</Button>
        </div>
      )
    }

    // active or blocked
    const active = myMerchant.status === 'active'
    const paid = orders.filter((o) => o.status === 'paid')
    return (
      <div className="flex flex-col gap-3 anim-up">
        {/* status card */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger'}`}>
              {active ? <Store size={21} /> : <Ban size={21} />}
            </span>
            <div className="min-w-0">
              <p className="font-bold text-[14.5px] text-text truncate">{myMerchant.name}</p>
              <p className="text-[11.5px] text-muted truncate">{myMerchant.appName}</p>
            </div>
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${active ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger'}`}>
              {myMerchant.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-xl bg-surface2 px-3 py-2.5">
              <p className="text-[10px] text-muted uppercase tracking-wide flex items-center gap-1"><ReceiptText size={11} /> Orders</p>
              <p className="text-[15px] font-bold text-text">{orders.length}</p>
            </div>
            <div className="rounded-xl bg-surface2 px-3 py-2.5">
              <p className="text-[10px] text-muted uppercase tracking-wide flex items-center gap-1"><Wallet size={11} /> Unsettled</p>
              <p className="text-[15px] font-bold text-text">{inr(myMerchant.settlement)}</p>
            </div>
          </div>
        </div>

        {/* keys */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[12px] font-bold text-muted uppercase tracking-wide">Your keys</p>
            {active ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-success"><ShieldCheck size={12} /> Admin approved</span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold text-danger"><Lock size={12} /> Blocked</span>
            )}
          </div>
          {active ? (
            <div className="pt-1">
              <KeyRow label="Gateway anon key" value={ANON_KEY} mono />
              <KeyRow label="Merchant API key" value={myMerchant.apiKey} mono />
              <KeyRow label="Merchant API secret" value={myMerchant.apiSecret} mono />
            </div>
          ) : (
            <div className="pt-2 flex flex-col items-center gap-2 text-center py-3">
              <Lock size={22} className="text-faint" />
              <p className="text-[12.5px] text-muted">Your gateway is blocked — keys are hidden until the admin unblocks it.</p>
            </div>
          )}
          <p className="text-[10.5px] text-faint mt-2">Tap any key to copy it. Visible because the admin approved your gateway.</p>
        </div>

        {/* recent orders */}
        <div className="card p-4">
          <p className="text-[12px] font-bold text-muted uppercase tracking-wide mb-2">Recent orders</p>
          {orders.length === 0 ? (
            <p className="text-center text-[12.5px] text-muted py-4">No orders yet</p>
          ) : (
            <div className="flex flex-col">
              {orders.slice(0, 12).map((o) => (
                <div key={o.order_ref} className="flex items-center justify-between py-2 border-b border-line last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text truncate">{o.order_ref}</p>
                    <p className="text-[11px] text-muted">{fmtDateTime(new Date(o.created_at).getTime())}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[13px] font-bold text-text">{inr(o.amount)}</span>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase ${o.status === 'paid' ? 'bg-success/12 text-success' : o.status === 'pending' ? 'bg-warning/12 text-warning' : 'bg-surface2 text-muted'}`}>
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* docs */}
        <button onClick={() => setDocs(true)} className="card p-3.5 flex items-center gap-2 text-[13px] font-semibold text-text">
          <KeyRound size={15} className="text-primary" /> Integration docs
        </button>
      </div>
    )
  }

  return (
    <div className="pt-3">
      <TopBar
        title="Payment Gateway"
        left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>}
        right={<button onClick={() => { setLoading(true); merchantGetMine().then(() => setLoading(false)) }} className="p-1.5 text-muted"><RefreshCw size={18} /></button>}
      />
      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={26} className="animate-spin text-primary" /></div>
        ) : (
          renderBody()
        )}
      </div>

      <Sheet open={docs} onClose={() => setDocs(false)} title="Integration">
        <div className="pt-1 flex flex-col gap-3 text-[12.5px] text-muted">
          <p>Accept payments with two REST calls (PostgREST RPC). Use your keys from the dashboard.</p>
          <pre className="card p-3.5 text-[11.5px] font-mono text-text bg-surface2 overflow-x-auto whitespace-pre-wrap">
{`POST /rest/v1/rpc/jb_gateway_create_order
Headers: apikey: <anon key>, Content-Type: application/json
Body: { p_api_key, p_api_secret, p_order_ref,
        p_amount, p_note }
→ returns pay_url — open it for the user`}
          </pre>
          <pre className="card p-3.5 text-[11.5px] font-mono text-text bg-surface2 overflow-x-auto whitespace-pre-wrap">
{`POST /rest/v1/rpc/jb_gateway_verify
Body: { p_api_key, p_api_secret, p_order_ref }
→ returns status: paid / pending / refunded`}
          </pre>
          <Button variant="ghost" full onClick={() => setDocs(false)}>Close</Button>
        </div>
      </Sheet>
    </div>
  )
}
