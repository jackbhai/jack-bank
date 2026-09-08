import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inrFull } from '../../lib/utils'
import { Avatar, Button, Sheet, PinPad, TopBar, Modal, inputCls } from '../../components/ui'

export default function Pay() {
  const { toId } = useParams()
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const transfer = useBank((s) => s.transfer)

  const me = users.find((u) => u.id === session?.userId)!
  const to = users.find((u) => u.id === toId)

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [pinOpen, setPinOpen] = useState(false)
  const [done, setDone] = useState<{ amount: number; ref: string } | null>(null)

  if (!to) {
    return (
      <div className="pt-3">
        <TopBar title="Pay" left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} />
        <p className="text-center text-muted py-16">Friend not found</p>
      </div>
    )
  }

  const doPay = async (pin: string) => {
    const res = await transfer(Number(amount), me.id, to.id, 'upi', note || 'Scan & Pay')
    setPinOpen(false)
    if (res.ok) {
      setDone({ amount: Number(amount), ref: String(Date.now()).slice(-9) })
      setAmount('')
      setNote('')
    } else toast(res.error || 'Payment failed', 'error')
  }

  return (
    <div className="pt-3">
      <TopBar title="Scan & Pay" left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} />

      <div className="mt-4 flex flex-col items-center text-center gap-2 anim-up">
        <Avatar name={to.name} hue={to.avatarHue} size={64} />
        <div>
          <p className="text-[17px] font-bold text-text">{to.name}</p>
          <p className="text-[13px] text-muted">{to.upiId}</p>
        </div>
      </div>

      <div className="mt-5 card p-4">
        <p className="text-[12px] font-semibold text-muted uppercase tracking-wide">Amount</p>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[22px] font-bold text-text">₹</span>
          <input
            autoFocus
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[32px] font-bold text-text placeholder:text-faint"
          />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[100, 500, 1000, 5000].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(String(Number(amount || 0) + v))}
              className="py-2 rounded-xl bg-surface2 border border-line text-[12px] font-bold text-text"
            >
              +{v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" className={inputCls} />
      </div>

      <div className="mt-5">
        <Button full disabled={!amount || Number(amount) <= 0} onClick={() => setPinOpen(true)}>
          Pay {amount && Number(amount) > 0 ? inrFull(Number(amount)) : ''}
        </Button>
      </div>

      <Sheet open={pinOpen} onClose={() => setPinOpen(false)} title="Confirm Payment">
        <div className="pt-3 text-center mb-2">
          <p className="text-[13px] text-muted">Paying</p>
          <p className="text-[20px] font-bold text-text">{inrFull(Number(amount || 0))}</p>
          <p className="text-[13px] text-muted">to {to.name}</p>
        </div>
        <PinPad onComplete={doPay} />
      </Sheet>

      <Modal open={!!done} onClose={() => setDone(null)}>
        {done && (
          <div className="flex flex-col items-center text-center gap-3">
            <CheckCircle2 size={52} className="text-success" />
            <p className="text-[18px] font-bold text-text">Payment Successful</p>
            <p className="text-[24px] font-bold text-text">{inrFull(done.amount)}</p>
            <div className="w-full card p-3.5 text-left space-y-1.5">
              <p className="text-[12.5px] text-muted">To <span className="text-text font-semibold">{to.name}</span></p>
              <p className="text-[12.5px] text-muted">Ref No <span className="text-text font-semibold">JK{done.ref}</span></p>
            </div>
            <Button variant="ghost" full onClick={() => setDone(null)}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
