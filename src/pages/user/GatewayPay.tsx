import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Store, ShieldCheck, CheckCircle2, Loader2, Lock } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inrFull } from '../../lib/utils'
import { BankLogo } from '../../components/Cards'
import { Button, Sheet, PinPad } from '../../components/ui'
import { PaySourceSelector, type PaySource } from '../../components/Pay'
import { fxCoin } from '../../lib/fx'

export default function GatewayPay() {
  const { token } = useParams()
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const gatewayGetOrder = useBank((s) => s.gatewayGetOrder)
  const gatewayPay = useBank((s) => s.gatewayPay)

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pinOpen, setPinOpen] = useState(false)
  const [source, setSource] = useState<PaySource>('balance')
  const [done, setDone] = useState(false)

  const me = session ? users.find((u) => u.id === session.userId) : undefined
  const creditCard = me?.cards.find((c) => c.type === 'credit' && c.status === 'active')
  const cardAvailable = creditCard ? Math.max(0, (creditCard.creditLimit || 0) - (creditCard.dueAmount || 0)) : 0

  useEffect(() => {
    if (!token) return
    gatewayGetOrder(token).then((r) => {
      setLoading(false)
      if (r.ok) setOrder(r.order)
      else setError(r.error || 'Order not found')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const confirmPay = async (pin: string) => {
    if (!me || !order) return
    if (pin !== me.pin) {
      setPinOpen(false)
      toast('Incorrect PIN', 'error')
      return
    }
    const res = await gatewayPay(token!, me.id, source)
    setPinOpen(false)
    if (res.ok) {
      fxCoin()
      setDone(true)
    } else toast(res.error || 'Payment failed', 'error')
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-bg">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-[13px] text-muted">Loading payment…</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-danger/10 text-danger flex items-center justify-center"><Store size={26} /></div>
        <p className="text-[15px] font-bold text-text">Payment link invalid</p>
        <p className="text-[12.5px] text-muted">{error || 'This payment link is not valid or has expired.'}</p>
        <Button onClick={() => nav('/')}>Go to Jack Bank</Button>
      </div>
    )
  }

  if (order.status !== 'pending') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <CheckCircle2 size={44} className={order.status === 'paid' ? 'text-success' : 'text-faint'} />
        <p className="text-[16px] font-bold text-text">Order {order.status}</p>
        <p className="text-[12.5px] text-muted">This payment is already {order.status}.</p>
        <Button onClick={() => nav('/')}>Go to Jack Bank</Button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      <div className="px-5 pt-8 pb-5 flex flex-col items-center gap-3 brand-gradient text-white">
        <div className="rounded-2xl bg-white/15 p-2.5"><Store size={26} /></div>
        <p className="text-[15px] font-bold">{order.merchant_name}</p>
        <p className="text-[12px] opacity-80">{order.app_name} · via Jack Bank Gateway</p>
        <p className="text-[34px] font-bold mt-1">{inrFull(order.amount)}</p>
        {order.note && <p className="text-[12.5px] opacity-90">{order.note}</p>}
        <p className="text-[11px] opacity-70">Order {order.order_ref}</p>
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-3">
        <div className="card p-4 flex items-center gap-3">
          <BankLogo size={40} />
          <div className="text-[12.5px]">
            <p className="font-semibold text-text">Pay with Jack Bank</p>
            <p className="text-muted">Instant UPI payment from your balance</p>
          </div>
        </div>

        {done ? (
          <div className="card p-6 flex flex-col items-center text-center gap-3 anim-pop">
            <CheckCircle2 size={52} className="text-success" />
            <p className="text-[18px] font-bold text-text">Payment Successful</p>
            <p className="text-[24px] font-bold text-text">{inrFull(order.amount)}</p>
            <p className="text-[12.5px] text-muted">Paid to {order.merchant_name}</p>
            <Button full onClick={() => nav('/')}>Done</Button>
          </div>
        ) : !session ? (
          <Button full onClick={() => nav('/login')}>Sign in to pay</Button>
        ) : (
          <>
            <div className="card p-3.5">
              <p className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-2">Pay using</p>
              <PaySourceSelector
                source={source}
                onChange={setSource}
                balance={me?.balance || 0}
                hasCard={!!creditCard}
                cardAvailable={cardAvailable}
                cardLimit={creditCard?.creditLimit}
              />
            </div>
            <Button
              full
              disabled={!me || (source === 'balance' ? me.balance < order.amount : cardAvailable < order.amount)}
              onClick={() => setPinOpen(true)}
            >
              <Lock size={16} /> Pay {inrFull(order.amount)}{source === 'card' ? ' · Credit Card' : ''}
            </Button>
          </>
        )}

        {session && me && source === 'balance' && me.balance < order.amount && (
          <p className="text-center text-[12.5px] text-danger">Insufficient balance ({inrFull(me.balance)})</p>
        )}
        {session && me && source === 'card' && cardAvailable < order.amount && (
          <p className="text-center text-[12.5px] text-danger">Insufficient credit available ({inrFull(cardAvailable)})</p>
        )}

        <div className="mt-auto pt-4 flex items-center justify-center gap-1.5 text-[11px] text-faint">
          <ShieldCheck size={13} /> Secured by Jack Bank Gateway · 256-bit encryption
        </div>
      </div>

      <Sheet open={pinOpen} onClose={() => setPinOpen(false)} title="Confirm payment">
        <div className="pt-3 text-center mb-2">
          <p className="text-[13px] text-muted">Paying</p>
          <p className="text-[20px] font-bold text-text">{inrFull(order.amount)}</p>
          <p className="text-[13px] text-muted">to {order.merchant_name}</p>
        </div>
        <PinPad onComplete={confirmPay} />
      </Sheet>
    </div>
  )
}
