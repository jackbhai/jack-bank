import { useState } from 'react'
import { Store, Copy, Check, Plus, Globe, KeyRound, Wallet, ArrowDownToLine, Terminal, X } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inr, fmtDateTime } from '../../lib/utils'
import type { Merchant } from '../../lib/types'
import { Button, Field, Sheet, TopBar, inputCls } from '../../components/ui'

export default function Gateway() {
  const toast = useToast((s) => s.toast)
  const merchants = useBank((s) => s.merchants)
  const orders = useBank((s) => s.gatewayOrders)
  const users = useBank((s) => s.users)
  const registerMerchant = useBank((s) => s.registerMerchant)
  const gatewaySettle = useBank((s) => s.gatewaySettle)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [app, setApp] = useState('')
  const [callback, setCallback] = useState('')
  const [created, setCreated] = useState<Merchant | null>(null)
  const [copied, setCopied] = useState('')
  const [docs, setDocs] = useState(false)

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

  const totalSettled = merchants.reduce((a, m) => a + m.settlement, 0)

  return (
    <div className="pt-3">
      <TopBar title="Payment Gateway" right={<button onClick={() => setDocs(true)} className="p-1.5 text-muted"><Terminal size={19} /></button>} />

      <div className="mt-2 card p-5 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-accent/15" />
        <div className="relative">
          <p className="flex items-center gap-2 text-[12px] font-bold text-muted uppercase tracking-wide">
            <Wallet size={14} /> Gateway
          </p>
          <p className="text-[26px] font-bold text-text mt-1.5">{merchants.length} merchant apps</p>
          <p className="text-[12.5px] text-muted mt-0.5">Unsettled balance {inr(totalSettled)} · {orders.filter((o) => o.status === 'paid').length} paid orders</p>
          <Button className="mt-3" onClick={() => { setOpen(true); setCreated(null); setName(''); setApp(''); setCallback('') }}>
            <Plus size={16} /> Register merchant app
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[13px] font-bold text-text mb-2">Merchant apps</p>
        {merchants.length === 0 && <p className="text-center text-[13px] text-muted py-8">No merchant apps yet. Register one to accept payments.</p>}
        <div className="flex flex-col gap-2.5">
          {merchants.map((m) => (
            <div key={m.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0"><Store size={19} /></span>
                  <div className="min-w-0">
                    <p className="font-bold text-[14px] text-text truncate">{m.name}</p>
                    <p className="text-[11.5px] text-muted truncate">{m.appName} · {m.status}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-muted bg-surface2 px-2 py-0.5 rounded-md uppercase">{m.callbackUrl ? 'webhook' : 'polling'}</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                <button onClick={() => copy(m.apiKey, 'key' + m.id)} className="flex items-center gap-1.5 text-[11.5px] font-mono text-muted max-w-[60%] truncate">
                  <KeyRound size={12} /> {m.apiKey.slice(0, 14)}…
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted">Unsettled <span className="font-bold text-text">{inr(m.settlement)}</span></span>
                  <button
                    onClick={async () => {
                      const res = await gatewaySettle(m.id)
                      toast(res.ok ? `Settled ${inr(res.amount!)}` : res.error || 'Failed', res.ok ? 'success' : 'error')
                    }}
                    disabled={m.settlement <= 0}
                    className="flex items-center gap-1 text-[11.5px] font-bold text-primary bg-primary/12 px-2.5 py-1.5 rounded-lg disabled:opacity-40"
                  >
                    <ArrowDownToLine size={13} /> Settle
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[13px] font-bold text-text mb-2">Recent gateway orders</p>
        {orders.length === 0 && <p className="text-center text-[13px] text-muted py-6">No orders yet</p>}
        <div className="flex flex-col gap-2">
          {orders.slice(0, 25).map((o) => {
            const m = merchants.find((x) => x.id === o.merchantId)
            const payer = users.find((u) => u.id === o.payerId)
            return (
              <div key={o.id} className="card p-3.5 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text truncate">{m?.name || '—'} · <span className="text-muted font-normal">{o.orderRef}</span></p>
                  <p className="text-[11px] text-muted">{payer ? `Paid by ${payer.name}` : '—'} · {fmtDateTime(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[13px] font-bold text-text">{inr(o.amount)}</span>
                  <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase ${o.status === 'paid' ? 'bg-success/12 text-success' : o.status === 'pending' ? 'bg-warning/12 text-warning' : 'bg-surface2 text-muted'}`}>
                    {o.status}
                  </span>
                </div>
              </div>
            )
          })}
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

      {/* docs */}
      <Sheet open={docs} onClose={() => setDocs(false)} title="Gateway API">
        <div className="pt-1 flex flex-col gap-3 text-[12.5px] text-muted">
          <p>Integrate Jack Bank payments in any game/app with two REST calls (PostgREST RPC):</p>
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
→ returns status: paid / pending`}
          </pre>
          <p>Payments settle instantly into the merchant's Jack Bank settlement balance ({`${1.5}% gateway fee`}).</p>
          <Button variant="ghost" full onClick={() => setDocs(false)}><X size={15} /> Close</Button>
        </div>
      </Sheet>
    </div>
  )
}
