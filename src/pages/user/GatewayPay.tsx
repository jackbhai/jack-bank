import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Store, ShieldCheck, CheckCircle2, Loader2, Lock, Sun, Moon, Smartphone, CreditCard as CreditCardIcon, Landmark, RefreshCw, KeyRound, Copy, Check, X } from 'lucide-react'
import { useBank, useToast, useTheme } from '../../store'
import { inrFull, fmtDateTime } from '../../lib/utils'
import { BankLogo } from '../../components/Cards'
import { Button, Sheet, Modal, PinPad, Segmented, Field, inputCls } from '../../components/ui'
import { PaySourceSelector, type PaySource } from '../../components/Pay'
import { fxCoin } from '../../lib/fx'

type Method = 'account' | 'upi' | 'card'
type OtpStage = 'idle' | 'sent' | 'done'

export default function GatewayPay() {
  const { token } = useParams()
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const gatewayGetOrder = useBank((s) => s.gatewayGetOrder)
  const gatewayPay = useBank((s) => s.gatewayPay)
  const gatewayInitiate = useBank((s) => s.gatewayInitiate)
  const gatewayConfirm = useBank((s) => s.gatewayConfirm)
  const gatewayOtpApprove = useBank((s) => s.gatewayOtpApprove)
  const theme = useTheme((s) => s.theme)
  const setTheme = useTheme((s) => s.setTheme)

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<Method>('account')
  const [pinOpen, setPinOpen] = useState(false)
  const [source, setSource] = useState<PaySource>('balance')
  const [done, setDone] = useState<{ amount: number; merchant: string } | null>(null)

  // upi
  const [upiId, setUpiId] = useState('')
  // card
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  // otp
  const [otpStage, setOtpStage] = useState<OtpStage>('idle')
  const [otp, setOtp] = useState('')
  const [otpTo, setOtpTo] = useState('')
  const [otpBusy, setOtpBusy] = useState(false)
  const [expiresIn, setExpiresIn] = useState(0)
  const [resendKey, setResendKey] = useState(0)
  // approval popup
  const [otpPopup, setOtpPopup] = useState(false)
  const [approved, setApproved] = useState(false)
  const [revealedOtp, setRevealedOtp] = useState('')
  const [approving, setApproving] = useState(false)
  const [copiedOtp, setCopiedOtp] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const me = session ? users.find((u) => u.id === session.userId) : undefined
  const creditCard = me?.cards.find((c) => c.type === 'credit' && c.status === 'active')
  const debitCard = me?.cards.find((c) => c.type === 'debit' && c.status === 'active')
  const creditAvailable = creditCard ? Math.max(0, (creditCard.creditLimit || 0) - (creditCard.dueAmount || 0)) : 0

  useEffect(() => {
    if (!token) return
    // reset flow state when the pay token changes (a new link = a fresh checkout)
    setLoading(true)
    setOrder(null)
    setError(null)
    setDone(null)
    setMethod('account')
    setSource('balance')
    setUpiId('')
    setCardNumber('')
    setCardExpiry('')
    setCardCvv('')
    setOtpStage('idle')
    setOtp('')
    setOtpTo('')
    setExpiresIn(0)
    setOtpPopup(false)
    setApproved(false)
    setRevealedOtp('')
    gatewayGetOrder(token).then((r) => {
      setLoading(false)
      if (r.ok) setOrder(r.order)
      else setError(r.error || 'Order not found')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (expiresIn <= 0) return
    timerRef.current = setInterval(() => setExpiresIn((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [expiresIn, resendKey])

  const startOtp = async (m: 'upi' | 'card') => {
    setOtpBusy(true)
    const res = await gatewayInitiate(token!, m, m === 'upi'
      ? { upiId: upiId.trim() }
      : { cardNumber: cardNumber.trim(), expiry: cardExpiry.trim(), cvv: cardCvv.trim() })
    setOtpBusy(false)
    if (res.ok) {
      setOtpStage('sent')
      setOtp('')
      setOtpTo(res.to || '')
      setExpiresIn(res.expiresIn || 300)
      setResendKey((k) => k + 1)
      setApproved(false)
      setRevealedOtp('')
      setCopiedOtp(false)
      setOtpPopup(true)
      toast(`OTP sent to ${res.to}`, 'success')
    } else {
      toast(res.error || 'Could not send OTP', 'error')
    }
  }

  const approveOtp = async () => {
    setApproving(true)
    const res = await gatewayOtpApprove(token!)
    setApproving(false)
    if (res.ok) {
      setApproved(true)
      setRevealedOtp(res.otp || '')
      setOtp(res.otp || '')
      setExpiresIn(res.expiresIn || expiresIn)
      setOtpTo(res.to || otpTo)
    } else {
      setOtpPopup(false)
      setOtpStage('idle')
      toast(res.error || 'Approval failed', 'error')
    }
  }

  const declineOtp = () => {
    setOtpPopup(false)
    setOtpStage('idle')
    setOtp('')
    setOtpTo('')
    setExpiresIn(0)
    toast('Payment request declined', 'info')
  }

  const copyOtp = async () => {
    try {
      await navigator.clipboard.writeText(revealedOtp)
      setCopiedOtp(true)
      setTimeout(() => setCopiedOtp(false), 1500)
      toast('OTP copied', 'success')
    } catch {
      toast('Could not copy', 'error')
    }
  }

  const confirmOtp = async () => {
    if (otp.length !== 6) return
    setOtpBusy(true)
    const res = await gatewayConfirm(token!, otp)
    setOtpBusy(false)
    if (res.ok) {
      fxCoin()
      setDone({ amount: res.amount ?? order.amount, merchant: res.merchant ?? order.merchant_name })
      setOtpStage('done')
    } else {
      toast(res.error || 'Verification failed', 'error')
    }
  }

  const confirmPin = async (pin: string) => {
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
      setDone({ amount: res.amount ?? order.amount, merchant: res.merchant ?? order.merchant_name })
    } else toast(res.error || 'Payment failed', 'error')
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-bg">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-[13px] text-muted">Loading secure payment…</p>
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

  if (order.status !== 'pending' && !done) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <CheckCircle2 size={44} className={order.status === 'paid' ? 'text-success' : 'text-faint'} />
        <p className="text-[16px] font-bold text-text">Order {order.status}</p>
        <p className="text-[12.5px] text-muted">This payment is already {order.status}.</p>
        <Button onClick={() => nav('/')}>Go to Jack Bank</Button>
      </div>
    )
  }

  const methods: { id: Method; label: string }[] = [{ id: 'account', label: 'Jack Bank' }, { id: 'upi', label: 'UPI ID' }, { id: 'card', label: 'Card' }]

  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      {/* header */}
      <div className="px-5 pt-5 pb-5 flex flex-col items-center gap-3 brand-gradient text-white relative">
        <button onClick={toggleTheme} className="absolute top-4 right-4 bg-white/15 hover:bg-white/25 rounded-full p-2 transition-colors">
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        <div className="rounded-2xl bg-white/15 p-2.5"><Store size={26} /></div>
        <p className="text-[16px] font-bold">{order.merchant_name}</p>
        <p className="text-[12px] opacity-80">{order.app_name} · via Jack Bank Gateway</p>
        <p className="text-[36px] font-bold mt-1">{inrFull(order.amount)}</p>
        {order.note && <p className="text-[12.5px] opacity-90">{order.note}</p>}
        <div className="flex items-center gap-2 text-[11px] opacity-75 mt-1">
          <span>Order {order.order_ref}</span>
          <span>·</span>
          <span>{fmtDateTime(new Date(order.created_at).getTime())}</span>
        </div>
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-3 max-w-md w-full mx-auto">
        {done ? (
          <div className="card p-6 flex flex-col items-center text-center gap-3 anim-pop">
            <CheckCircle2 size={52} className="text-success" />
            <p className="text-[18px] font-bold text-text">Payment Successful</p>
            <p className="text-[24px] font-bold text-text">{inrFull(done.amount)}</p>
            <p className="text-[12.5px] text-muted">Paid to {done.merchant}</p>
            <Button full onClick={() => nav('/')}>Done</Button>
          </div>
        ) : (
          <>
            {/* method tabs */}
            <Segmented options={methods} value={method} onChange={setMethod} />

            {method === 'account' && !session && (
              <div className="card p-5 flex flex-col items-center gap-3 text-center">
                <Landmark size={26} className="text-primary" />
                <p className="text-[14px] font-bold text-text">Sign in to pay from your Jack Bank account</p>
                <p className="text-[12.5px] text-muted">Pay directly with balance, debit card or credit card — no OTP needed.</p>
                <Button full onClick={() => nav('/login')}>Sign in</Button>
              </div>
            )}

            {method === 'account' && session && me && (
              <>
                <div className="card p-4 flex items-center gap-3">
                  <BankLogo size={40} />
                  <div className="text-[12.5px]">
                    <p className="font-semibold text-text">{me.name}</p>
                    <p className="text-muted">{me.upiId}</p>
                  </div>
                </div>
                <div className="card p-3.5">
                  <p className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-2">Pay using</p>
                  <PaySourceSelector
                    source={source}
                    onChange={setSource}
                    balance={me.balance}
                    hasDebit={!!debitCard}
                    hasCredit={!!creditCard}
                    creditAvailable={creditAvailable}
                    creditLimit={creditCard?.creditLimit}
                  />
                </div>
                <Button
                  full
                  disabled={source === 'card' ? creditAvailable < order.amount : me.balance < order.amount}
                  onClick={() => setPinOpen(true)}
                >
                  <Lock size={16} /> Pay {inrFull(order.amount)}{source === 'card' ? ' · Credit Card' : source === 'debit' ? ' · Debit Card' : ''}
                </Button>
                {source === 'card' && creditAvailable < order.amount && (
                  <p className="text-center text-[12.5px] text-danger">Insufficient credit available ({inrFull(creditAvailable)})</p>
                )}
                {source !== 'card' && me.balance < order.amount && (
                  <p className="text-center text-[12.5px] text-danger">Insufficient balance ({inrFull(me.balance)})</p>
                )}
              </>
            )}

            {method === 'upi' && (
              <div className="card p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
                  <Smartphone size={16} className="text-primary" /> Pay with any UPI ID
                </div>
                <p className="text-[12px] text-muted">Works even if you're on another device — an OTP is sent to the account owner for verification.</p>
                <Field label="UPI ID">
                  <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@jackbank" className={inputCls} />
                </Field>
                {otpStage === 'sent' && (
                  <>
                    <p className="text-[12px] text-success flex items-center gap-1.5">
                      <KeyRound size={13} /> OTP sent to {otpTo}
                    </p>
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      autoFocus
                      placeholder="••••••"
                      className="w-full bg-surface2 border border-line rounded-xl px-4 py-3.5 text-[26px] font-bold text-center tracking-[0.6em] text-text outline-none focus:border-primary"
                    />
                    <div className="flex items-center justify-between text-[11.5px] text-muted">
                      <span>Valid {Math.floor(expiresIn / 60)}:{String(expiresIn % 60).padStart(2, '0')}</span>
                      <button onClick={() => startOtp('upi')} disabled={otpBusy} className="text-primary font-bold flex items-center gap-1">
                        <RefreshCw size={12} /> Resend
                      </button>
                    </div>
                    <Button full disabled={otp.length !== 6 || otpBusy} onClick={confirmOtp}>
                      {otpBusy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Verify & Pay {inrFull(order.amount)}
                    </Button>
                  </>
                )}
                {otpStage !== 'sent' && (
                  <Button full disabled={!upiId.trim() || otpBusy} onClick={() => startOtp('upi')}>
                    {otpBusy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Send OTP
                  </Button>
                )}
              </div>
            )}

            {method === 'card' && (
              <div className="card p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
                  <CreditCardIcon size={16} className="text-primary" /> Pay with debit or credit card
                </div>
                <p className="text-[12px] text-muted">Debit card spends from balance · credit card adds to dues. An OTP is sent to the card owner for verification.</p>
                <Field label="Card number">
                  <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))} inputMode="numeric" placeholder="1234 5678 9012 3456" className={inputCls + ' font-mono'} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Expiry">
                    <input value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/YY" className={inputCls + ' font-mono'} />
                  </Field>
                  <Field label="CVV">
                    <input value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" type="password" placeholder="•••" className={inputCls + ' font-mono'} />
                  </Field>
                </div>
                {otpStage === 'sent' && (
                  <>
                    <p className="text-[12px] text-success flex items-center gap-1.5">
                      <KeyRound size={13} /> OTP sent to {otpTo}
                    </p>
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      autoFocus
                      placeholder="••••••"
                      className="w-full bg-surface2 border border-line rounded-xl px-4 py-3.5 text-[26px] font-bold text-center tracking-[0.6em] text-text outline-none focus:border-primary"
                    />
                    <div className="flex items-center justify-between text-[11.5px] text-muted">
                      <span>Valid {Math.floor(expiresIn / 60)}:{String(expiresIn % 60).padStart(2, '0')}</span>
                      <button onClick={() => startOtp('card')} disabled={otpBusy} className="text-primary font-bold flex items-center gap-1">
                        <RefreshCw size={12} /> Resend
                      </button>
                    </div>
                    <Button full disabled={otp.length !== 6 || otpBusy} onClick={confirmOtp}>
                      {otpBusy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Verify & Pay {inrFull(order.amount)}
                    </Button>
                  </>
                )}
                {otpStage !== 'sent' && (
                  <Button full disabled={cardNumber.length < 15 || !cardExpiry || cardCvv.length < 3 || otpBusy} onClick={() => startOtp('card')}>
                    {otpBusy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Send OTP
                  </Button>
                )}
              </div>
            )}

            {/* summary */}
            <div className="card p-3.5 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between"><span className="text-muted">Amount</span><span className="font-semibold text-text">{inrFull(order.amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Gateway fee</span><span className="font-semibold text-text">Paid by merchant</span></div>
              <div className="flex justify-between"><span className="text-muted">You pay</span><span className="font-bold text-text">{inrFull(order.amount)}</span></div>
            </div>

            <div className="mt-auto pt-3 flex items-center justify-center gap-1.5 text-[11px] text-faint">
              <ShieldCheck size={13} /> Secured by Jack Bank Gateway · 256-bit encryption · OTP protected
            </div>
          </>
        )}
      </div>

      <Sheet open={pinOpen} onClose={() => setPinOpen(false)} title="Confirm payment">
        <div className="pt-3 text-center mb-2">
          <p className="text-[13px] text-muted">Paying</p>
          <p className="text-[20px] font-bold text-text">{inrFull(order.amount)}</p>
          <p className="text-[13px] text-muted">to {order.merchant_name}</p>
        </div>
        <PinPad onComplete={confirmPin} />
      </Sheet>

      {/* OTP approval popup */}
      <Modal open={otpPopup} onClose={() => {}}>
        {!approved ? (
          <div className="flex flex-col items-center text-center gap-3">
            <span className="w-14 h-14 rounded-2xl bg-primary/12 text-primary flex items-center justify-center">
              <ShieldCheck size={28} />
            </span>
            <p className="text-[16px] font-bold text-text">Approve this payment?</p>
            <p className="text-[13px] text-muted">Verify it's you to reveal the one-time password for</p>
            <p className="text-[24px] font-bold text-text">{inrFull(order.amount)}</p>
            <p className="text-[13px] text-muted -mt-1.5">to {order.merchant_name}</p>
            <div className="w-full rounded-xl bg-surface2 border border-line px-3 py-2.5 flex items-center justify-between text-[12.5px]">
              <span className="text-muted flex items-center gap-1.5"><KeyRound size={13} /> OTP sent to</span>
              <span className="font-semibold text-text">{otpTo}</span>
            </div>
            <div className="w-full grid grid-cols-2 gap-2 mt-1">
              <Button variant="ghost" full onClick={declineOtp}>
                <X size={16} /> Decline
              </Button>
              <Button full onClick={approveOtp} disabled={approving}>
                {approving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Approve
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-3">
            <span className="w-14 h-14 rounded-2xl bg-success/12 text-success flex items-center justify-center">
              <KeyRound size={26} />
            </span>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wide">Your one-time password</p>
            <p className="font-mono text-[36px] font-bold tracking-[0.3em] text-text leading-none">{revealedOtp}</p>
            <p className="text-[12.5px] text-muted">
              Valid {Math.floor(expiresIn / 60)}:{String(expiresIn % 60).padStart(2, '0')} · filled in below automatically
            </p>
            <div className="w-full grid grid-cols-2 gap-2">
              <Button variant="ghost" full onClick={copyOtp}>
                {copiedOtp ? <Check size={16} className="text-success" /> : <Copy size={16} />} {copiedOtp ? 'Copied' : 'Copy'}
              </Button>
              <Button full onClick={() => setOtpPopup(false)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
