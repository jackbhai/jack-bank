import { useMemo, useState } from 'react'
import { Search, Ban, CircleCheck, MinusCircle, PlusCircle, CreditCard, Landmark, IdCard } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { fmtDate, inr } from '../../lib/utils'
import { Avatar, Modal, Button, Field, inputCls } from '../../components/ui'
import type { User } from '../../lib/types'

export default function Users() {
  const toast = useToast((s) => s.toast)
  const users = useBank((s) => s.users)
  const loans = useBank((s) => s.loans)
  const blockUser = useBank((s) => s.blockUser)
  const unblockUser = useBank((s) => s.unblockUser)
  const adminAdjust = useBank((s) => s.adminAdjust)

  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<User | null>(null)
  const [adjustAmt, setAdjustAmt] = useState('')
  const [adjustNote, setAdjustNote] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return users
    return users.filter(
      (u) => u.name.toLowerCase().includes(s) || u.upiId.toLowerCase().includes(s) || u.accountNumber.includes(s),
    )
  }, [users, q])

  const userLoans = (id: string) => loans.filter((l) => l.userId === id && l.status === 'active').length

  return (
    <div className="pt-3">
      <div className="text-center">
        <h1 className="font-semibold text-[16px] text-text">Friends & Accounts</h1>
        <p className="text-[12.5px] text-muted mt-0.5">{users.length} accounts · tap to manage</p>
      </div>

      <div className="relative mt-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, UPI ID or account" className={inputCls + ' pl-10'} />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {filtered.map((u) => (
          <button key={u.id} onClick={() => setSelected(u)} className="card p-3.5 flex items-center gap-3 text-left active:scale-[0.98]">
            <Avatar name={u.name} hue={u.avatarHue} size={44} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-text truncate">{u.name}</p>
              <p className="text-[11.5px] text-muted truncate">{u.upiId}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[14px] font-bold text-text">{inr(u.balance)}</span>
              <div className="flex gap-1">
                {u.status === 'blocked' ? (
                  <span className="text-[9px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded uppercase">Blocked</span>
                ) : (
                  <span className="text-[9px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded uppercase">Active</span>
                )}
                {u.kycStatus !== 'approved' && (
                  <span className="text-[9px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded uppercase">KYC</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={selected.name} hue={selected.avatarHue} size={48} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[16px] text-text">{selected.name}</p>
                <p className="text-[12px] text-muted truncate">{selected.upiId}</p>
              </div>
              <span className="text-[16px] font-bold text-text">{inr(selected.balance)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="card p-2.5">
                <p className="text-[10px] text-muted uppercase">Cards</p>
                <p className="font-bold text-text flex items-center justify-center gap-1 mt-0.5">
                  <CreditCard size={13} className="text-primary" /> {selected.cards.length}
                </p>
              </div>
              <div className="card p-2.5">
                <p className="text-[10px] text-muted uppercase">Loans</p>
                <p className="font-bold text-text flex items-center justify-center gap-1 mt-0.5">
                  <Landmark size={13} className="text-accent" /> {userLoans(selected.id)}
                </p>
              </div>
              <div className="card p-2.5">
                <p className="text-[10px] text-muted uppercase">KYC</p>
                <p className="font-bold text-text flex items-center justify-center gap-1 mt-0.5">
                  <IdCard size={13} className={selected.kycStatus === 'approved' ? 'text-success' : 'text-warning'} />
                  {selected.kycStatus === 'approved' ? 'OK' : 'No'}
                </p>
              </div>
            </div>

            <div className="card p-3.5 space-y-1.5 text-[12.5px]">
              <p className="text-muted">A/C <span className="text-text font-semibold">{selected.accountNumber}</span></p>
              <p className="text-muted">IFSC <span className="text-text font-semibold">{selected.ifsc}</span></p>
              <p className="text-muted">Phone <span className="text-text font-semibold">{selected.phone}</span></p>
              <p className="text-muted">Member since <span className="text-text font-semibold">{fmtDate(selected.createdAt)}</span></p>
              <p className="text-muted">Rewards <span className="text-text font-semibold">{selected.rewards.toLocaleString('en-IN')}</span></p>
            </div>

            <Field label="Adjust balance (credit / debit)">
              <input
                type="number"
                inputMode="numeric"
                value={adjustAmt}
                onChange={(e) => setAdjustAmt(e.target.value)}
                placeholder="Amount"
                className={inputCls}
              />
              <input
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Reason (optional)"
                className={inputCls + ' mt-2'}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!adjustAmt || Number(adjustAmt) <= 0}
                onClick={async () => {
                  const res = await adminAdjust(selected.id, Number(adjustAmt), adjustNote || 'Manual credit')
                  toast(res.ok ? 'Balance credited' : res.error || 'Failed', res.ok ? 'success' : 'error')
                  if (res.ok) {
                    setAdjustAmt('')
                    setAdjustNote('')
                    setSelected(users.find((u) => u.id === selected.id) || null)
                  }
                }}
                className="flex items-center justify-center gap-1.5 bg-success text-white py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-40"
              >
                <PlusCircle size={16} /> Credit
              </button>
              <button
                disabled={!adjustAmt || Number(adjustAmt) <= 0}
                onClick={async () => {
                  const res = await adminAdjust(selected.id, -Number(adjustAmt), adjustNote || 'Manual debit')
                  toast(res.ok ? 'Balance debited' : res.error || 'Failed', res.ok ? 'success' : 'error')
                  if (res.ok) {
                    setAdjustAmt('')
                    setAdjustNote('')
                    setSelected(users.find((u) => u.id === selected.id) || null)
                  }
                }}
                className="flex items-center justify-center gap-1.5 bg-danger text-white py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-40"
              >
                <MinusCircle size={16} /> Debit
              </button>
            </div>

            {selected.status === 'active' ? (
              <Button
                variant="outline"
                full
                onClick={async () => {
                  const res = await blockUser(selected.id)
                  toast(res.ok ? `${selected.name} blocked` : res.error || 'Failed', res.ok ? 'success' : 'error')
                  setSelected(users.find((u) => u.id === selected.id) || null)
                }}
              >
                <Ban size={16} /> Block account
              </Button>
            ) : (
              <Button
                full
                onClick={async () => {
                  const res = await unblockUser(selected.id)
                  toast(res.ok ? `${selected.name} unblocked` : res.error || 'Failed', res.ok ? 'success' : 'error')
                  setSelected(users.find((u) => u.id === selected.id) || null)
                }}
              >
                <CircleCheck size={16} /> Unblock account
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
