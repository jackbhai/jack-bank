import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inr } from '../../lib/utils'
import { Avatar, Button, Segmented, Sheet, TopBar, inputCls } from '../../components/ui'
import type { User } from '../../lib/types'

export default function Request() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const moneyRequests = useBank((s) => s.moneyRequests)
  const requestMoney = useBank((s) => s.requestMoney)

  const me = users.find((u) => u.id === session?.userId)!
  const friends = users.filter((u) => u.id !== me.id)

  const [tab, setTab] = useState<'new' | 'history'>('new')
  const [selected, setSelected] = useState<User | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)

  const myRequests = moneyRequests.filter((r) => r.fromUserId === me.id).sort((a, b) => b.createdAt - a.createdAt)

  const send = async () => {
    if (!selected) return
    const res = await requestMoney(me.id, selected.id, Number(amount), note || 'Money request')
    if (res.ok) {
      setDone(true)
      setAmount('')
      setNote('')
      setTimeout(() => setDone(false), 1800)
    } else toast(res.error || 'Failed', 'error')
  }

  return (
    <div className="pt-3">
      <TopBar title="Request Money" left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} />

      <div className="mt-2">
        <Segmented
          options={[
            { id: 'new', label: 'New Request' },
            { id: 'history', label: 'History' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'new' ? (
        <div className="mt-4 flex flex-col gap-4 anim-up">
          <div>
            <p className="text-[12px] font-bold text-muted uppercase tracking-wide mb-2">Ask from</p>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {friends.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelected(f)}
                  className={`flex flex-col items-center gap-1.5 shrink-0 px-1 py-2 rounded-2xl border transition-all ${
                    selected?.id === f.id ? 'border-primary bg-primary/8' : 'border-transparent'
                  }`}
                >
                  <Avatar name={f.name} hue={f.avatarHue} size={52} />
                  <span className="text-[11px] font-semibold text-text w-16 truncate text-center">{f.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {selected && (
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
                {[100, 200, 500, 1000].map((v) => (
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
          )}

          {selected && (
            <>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's it for? (optional)" className={inputCls} />
              <Button full disabled={!amount || Number(amount) <= 0} onClick={send}>
                Request {amount && Number(amount) > 0 ? inr(Number(amount)) : ''} from {selected.name.split(' ')[0]}
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {myRequests.length === 0 && <p className="text-center text-[13px] text-muted py-10">No requests yet</p>}
          {myRequests.map((r) => {
            const to = users.find((u) => u.id === r.toUserId)
            const statusCls =
              r.status === 'paid' ? 'text-success bg-success/10' : r.status === 'declined' ? 'text-danger bg-danger/10' : 'text-warning bg-warning/10'
            return (
              <div key={r.id} className="card p-3.5 flex items-center gap-3">
                <Avatar name={to?.name || ''} hue={to?.avatarHue || 0} size={42} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-text">{to?.name}</p>
                  <p className="text-[12px] text-muted truncate">{r.note || 'Money request'}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[14px] font-bold text-text">{inr(r.amount)}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${statusCls}`}>{r.status}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={done} onClose={() => setDone(false)} title="Request sent">
        <div className="flex flex-col items-center gap-3 py-6">
          <CheckCircle2 size={48} className="text-success" />
          <p className="text-[16px] font-bold text-text">Request sent to {selected?.name}</p>
          <p className="text-[13px] text-muted text-center">They will be notified and can pay you anytime.</p>
        </div>
      </Sheet>
    </div>
  )
}
