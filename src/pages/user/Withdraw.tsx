import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inr } from '../../lib/utils'
import { Button, Field, TopBar, inputCls } from '../../components/ui'

export default function Withdraw() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const withdrawRequest = useBank((s) => s.withdrawRequest)

  const me = users.find((u) => u.id === session?.userId)!
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  return (
    <div className="pt-3">
      <TopBar title="Withdraw" left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} />

      <div className="mt-4 card p-5">
        <p className="text-[12px] text-muted">Available balance</p>
        <p className="text-[30px] font-bold text-text">{inr(me.balance)}</p>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <Field label="Amount">
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className={inputCls}
          />
        </Field>
        <Field label="Destination (optional note)">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Withdraw to my bank account" className={inputCls} />
        </Field>

        <div className="card p-4 text-[12.5px] text-muted leading-relaxed">
          Withdrawals are processed after the bank owner approves them from the admin panel.
        </div>

        <Button
          full
          disabled={!amount || Number(amount) <= 0 || Number(amount) > me.balance}
          onClick={async () => {
            const res = await withdrawRequest(me.id, Number(amount), note || 'Withdrawal request')
            toast(res.ok ? 'Withdrawal request sent for approval' : res.error || 'Failed', res.ok ? 'success' : 'error')
            if (res.ok) nav('/')
          }}
        >
          Request Withdrawal
        </Button>
      </div>
    </div>
  )
}
