import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Snowflake, Flame, Eye, EyeOff, ShoppingBag, Wallet, Plus, Lock } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inr, inrFull } from '../../lib/utils'
import { DebitCard, CreditCard } from '../../components/Cards'
import { Button, Segmented, Sheet, TopBar, inputCls } from '../../components/ui'
import type { Card } from '../../lib/types'

export default function Cards() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const setCardStatus = useBank((s) => s.setCardStatus)
  const creditCardSpend = useBank((s) => s.creditCardSpend)
  const payCardBill = useBank((s) => s.payCardBill)
  const requestCard = useBank((s) => s.requestCard)

  const me = users.find((u) => u.id === session?.userId)!
  const debit = me.cards.filter((c) => c.type === 'debit')
  const credit = me.cards.filter((c) => c.type === 'credit')

  const [tab, setTab] = useState<'debit' | 'credit'>('debit')
  const [showNum, setShowNum] = useState(false)
  const [spendOpen, setSpendOpen] = useState(false)
  const [billOpen, setBillOpen] = useState(false)
  const [spendAmt, setSpendAmt] = useState('')
  const [billAmt, setBillAmt] = useState('')
  const [reqOpen, setReqOpen] = useState(false)
  const [reqType, setReqType] = useState<'debit' | 'credit'>('credit')
  const [reqLimit, setReqLimit] = useState('')

  const list = tab === 'debit' ? debit : credit
  const active = list[0]

  const statusBadge = (c: Card) =>
    c.status === 'active' ? (
      <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-md uppercase">Active</span>
    ) : c.status === 'frozen' ? (
      <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md uppercase">Frozen</span>
    ) : (
      <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-md uppercase">{c.status}</span>
    )

  return (
    <div className="pt-3">
      <TopBar title="Cards" left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} />

      <div className="mt-2">
        <Segmented
          options={[
            { id: 'debit', label: 'Debit Card' },
            { id: 'credit', label: 'Credit Card' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {list.length === 0 ? (
        <div className="mt-8 card p-8 flex flex-col items-center gap-3 text-center">
          <Lock size={28} className="text-faint" />
          <p className="font-semibold text-text">No {tab} card yet</p>
          <p className="text-[13px] text-muted">Request one — the owner approves it from the admin panel.</p>
          <Button variant="outline" onClick={() => setReqOpen(true)}>
            <Plus size={16} /> Request {tab} card
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 -mx-5 px-5 flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            {list.map((c) => (
              <div key={c.id} className="min-w-[92%] snap-center">
                {tab === 'debit' ? <DebitCard card={c} name={me.name} /> : <CreditCard card={c} />}
              </div>
            ))}
          </div>

          {active && (
            <div className="mt-5 flex flex-col gap-3 anim-up">
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-text">Card number</span>
                  <button onClick={() => setShowNum((s) => !s)} className="text-primary">
                    {showNum ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <p className="text-[16px] font-mono tracking-wider mt-1.5 text-text">
                  {showNum ? active.number : active.number.replace(/\d(?=\d{4})/g, '•')}
                </p>
                <div className="flex justify-between mt-2 text-[12px] text-muted">
                  <span>Expiry {active.expiry}</span>
                  <span>CVV {showNum ? active.cvv : '•••'}</span>
                  <span>{active.network}</span>
                </div>
              </div>

              {tab === 'credit' && (
                <div className="card p-4 space-y-3">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted">Credit limit</span>
                    <span className="font-semibold text-text">{inr(active.creditLimit || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted">Current due</span>
                    <span className="font-semibold text-text">{inr(active.dueAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted">Due date</span>
                    <span className="font-semibold text-text">{active.dueDate || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button variant="ghost" onClick={() => setSpendOpen(true)}>
                      <ShoppingBag size={16} /> Simulate spend
                    </Button>
                    <Button onClick={() => setBillOpen(true)} disabled={(active.dueAmount || 0) <= 0}>
                      <Wallet size={16} /> Pay bill
                    </Button>
                  </div>
                </div>
              )}

              {active.status === 'active' || active.status === 'frozen' ? (
                <Button
                  variant={active.status === 'active' ? 'outline' : 'ghost'}
                  onClick={async () => {
                    const res = await setCardStatus(me.id, active.id, active.status === 'active' ? 'frozen' : 'active')
                    toast(res.ok ? (active.status === 'active' ? 'Card frozen' : 'Card unfrozen') : res.error || 'Failed', res.ok ? 'success' : 'error')
                  }}
                >
                  {active.status === 'active' ? (
                    <>
                      <Snowflake size={16} /> Freeze card
                    </>
                  ) : (
                    <>
                      <Flame size={16} /> Unfreeze card
                    </>
                  )}
                </Button>
              ) : null}

              <Button variant="outline" onClick={() => setReqOpen(true)}>
                <Plus size={16} /> Request new card
              </Button>
              <p className="text-center text-[11px] text-faint">All cards are virtual — for the Jack Bank simulation.</p>
            </div>
          )}
        </>
      )}

      {/* spend sheet */}
      <Sheet open={spendOpen} onClose={() => setSpendOpen(false)} title="Simulate Card Spend">
        <div className="pt-2 flex flex-col gap-3">
          <p className="text-[13px] text-muted">This adds to your credit card due amount (as if you swiped your card).</p>
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            value={spendAmt}
            onChange={(e) => setSpendAmt(e.target.value)}
            placeholder="Amount"
            className={inputCls}
          />
          <Button
            full
            disabled={!spendAmt || Number(spendAmt) <= 0}
            onClick={async () => {
              const res = await creditCardSpend(me.id, Number(spendAmt), 'Card spend (simulated)')
              toast(res.ok ? 'Spend added to your card dues' : res.error || 'Failed', res.ok ? 'success' : 'error')
              if (res.ok) {
                setSpendOpen(false)
                setSpendAmt('')
              }
            }}
          >
            Add spend {spendAmt && Number(spendAmt) > 0 ? inrFull(Number(spendAmt)) : ''}
          </Button>
        </div>
      </Sheet>

      {/* bill sheet */}
      <Sheet open={billOpen} onClose={() => setBillOpen(false)} title="Pay Credit Card Bill">
        <div className="pt-2 flex flex-col gap-3">
          <p className="text-[13px] text-muted">
            Current due: <span className="font-semibold text-text">{inr(active?.dueAmount || 0)}</span> · Balance:{' '}
            <span className="font-semibold text-text">{inr(me.balance)}</span>
          </p>
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            value={billAmt}
            onChange={(e) => setBillAmt(e.target.value)}
            placeholder="Amount to pay"
            className={inputCls}
          />
          <Button
            variant="ghost"
            onClick={() => setBillAmt(String(active?.dueAmount || 0))}
          >
            Pay full due
          </Button>
          <Button
            full
            disabled={!billAmt || Number(billAmt) <= 0}
            onClick={async () => {
              const res = await payCardBill(me.id, Number(billAmt))
              toast(res.ok ? 'Bill payment successful' : res.error || 'Failed', res.ok ? 'success' : 'error')
              if (res.ok) {
                setBillOpen(false)
                setBillAmt('')
              }
            }}
          >
            Pay {billAmt && Number(billAmt) > 0 ? inrFull(Number(billAmt)) : ''}
          </Button>
        </div>
      </Sheet>

      {/* request card sheet */}
      <Sheet open={reqOpen} onClose={() => setReqOpen(false)} title="Request a Card">
        <div className="pt-2 flex flex-col gap-3">
          <Segmented
            options={[
              { id: 'credit', label: 'Credit Card' },
              { id: 'debit', label: 'Debit Card' },
            ]}
            value={reqType}
            onChange={setReqType}
          />
          {reqType === 'credit' && (
            <input
              type="number"
              inputMode="numeric"
              value={reqLimit}
              onChange={(e) => setReqLimit(e.target.value)}
              placeholder="Requested credit limit (₹)"
              className={inputCls}
            />
          )}
          <p className="text-[12.5px] text-muted">The owner reviews and issues your card from the admin panel.</p>
          <Button
            full
            onClick={async () => {
              const res = await requestCard(me.id, reqType, reqLimit ? Number(reqLimit) : undefined)
              toast(res.ok ? 'Card request sent for approval' : res.error || 'Failed', res.ok ? 'success' : 'error')
              if (res.ok) {
                setReqOpen(false)
                setReqLimit('')
              }
            }}
          >
            Submit request
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
