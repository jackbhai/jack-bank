import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inr, inrFull } from '../../lib/utils'
import { Avatar, Button, Segmented, Sheet, PinPad, TopBar, Modal, inputCls } from '../../components/ui'
import type { User } from '../../lib/types'
import { fxCoin } from '../../lib/fx'

export default function Send() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const transfer = useBank((s) => s.transfer)

  const me = users.find((u) => u.id === session?.userId)!
  const friends = users.filter((u) => u.id !== me.id)

  const [method, setMethod] = useState<'upi' | 'account' | 'phone'>('upi')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<User | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [pinOpen, setPinOpen] = useState(false)
  const [done, setDone] = useState<{ amount: number; to: string; ref: string } | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) =>
      f.name.toLowerCase().includes(q) || f.upiId.toLowerCase().includes(q) || f.accountNumber.includes(q) || f.phone.includes(q),
    )
  }, [friends, query])

  const matchField = (u: User) => (method === 'upi' ? u.upiId : method === 'account' ? `${u.accountNumber} · ${u.ifsc}` : u.phone)

  const doPay = async (pin: string) => {
    if (!selected) return
    if (pin !== me.pin) {
      setPinOpen(false)
      toast('Incorrect PIN', 'error')
      return
    }
    const res = await transfer(Number(amount), me.id, selected.id, method === 'account' ? 'account' : 'upi', note || 'Money transfer')
    setPinOpen(false)
    if (res.ok) {
      fxCoin()
      setDone({ amount: Number(amount), to: selected.name, ref: String(Date.now()).slice(-9) })
      setAmount('')
      setNote('')
      setSelected(null)
      setQuery('')
    } else {
      toast(res.error || 'Transfer failed', 'error')
    }
  }

  return (
    <div className="pt-3">
      <TopBar title="Send Money" left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} />

      <div className="mt-2">
        <Segmented
          options={[
            { id: 'upi', label: 'UPI ID' },
            { id: 'account', label: 'Account' },
            { id: 'phone', label: 'Phone' },
          ]}
          value={method}
          onChange={(v) => {
            setMethod(v)
            setSelected(null)
            setQuery('')
          }}
        />
      </div>

      {!selected ? (
        <>
          <div className="relative mt-4">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={method === 'upi' ? 'Search UPI ID or name' : method === 'account' ? 'Search account / IFSC / name' : 'Search phone or name'}
              className={inputCls + ' pl-10'}
            />
          </div>

          <p className="text-[12px] font-bold text-muted uppercase tracking-wide mt-5 mb-2">Your friends</p>
          <div className="flex flex-col gap-2">
            {filtered.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setSelected(f)
                  setQuery('')
                }}
                className="card p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-all"
              >
                <Avatar name={f.name} hue={f.avatarHue} size={42} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14.5px] text-text">{f.name}</p>
                  <p className="text-[12px] text-muted truncate">{matchField(f)}</p>
                </div>
                <span className="text-[11px] font-bold text-primary">Pay</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-[13px] text-muted py-8">No friend matches your search</p>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-col gap-4 anim-up">
          <div className="card p-4 flex items-center gap-3">
            <Avatar name={selected.name} hue={selected.avatarHue} size={46} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[15px] text-text">{selected.name}</p>
              <p className="text-[12px] text-muted truncate">{matchField(selected)}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-[12px] font-bold text-primary">
              Change
            </button>
          </div>

          <div className="card p-4">
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

          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" className={inputCls} />

          <Button full disabled={!amount || Number(amount) <= 0} onClick={() => setPinOpen(true)}>
            Pay {amount && Number(amount) > 0 ? inrFull(Number(amount)) : ''}
          </Button>
        </div>
      )}

      <Sheet open={pinOpen} onClose={() => setPinOpen(false)} title="Confirm Payment">
        <div className="pt-3 text-center mb-2">
          <p className="text-[13px] text-muted">Paying</p>
          <p className="text-[20px] font-bold text-text">{inrFull(Number(amount || 0))}</p>
          {selected && <p className="text-[13px] text-muted">to {selected.name}</p>}
        </div>
        <PinPad onComplete={doPay} />
      </Sheet>

      <Modal open={!!done} onClose={() => setDone(null)}>
        {done && (
          <div className="flex flex-col items-center text-center gap-3">
            <CheckCircle2 size={52} className="text-success" />
            <p className="text-[18px] font-bold text-text">Payment Successful</p>
            <p className="text-[24px] font-bold text-text">{inr(done.amount)}</p>
            <div className="w-full card p-3.5 text-left space-y-1.5">
              <p className="text-[12.5px] text-muted">To <span className="text-text font-semibold">{done.to}</span></p>
              <p className="text-[12.5px] text-muted">Ref No <span className="text-text font-semibold">JK{done.ref}</span></p>
            </div>
            <div className="flex gap-2 w-full mt-1">
              <Button variant="ghost" full onClick={() => setDone(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
