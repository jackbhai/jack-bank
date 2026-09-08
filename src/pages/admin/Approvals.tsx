import { useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  IdCard,
  CreditCard,
  Check,
  X,
  ClipboardCheck,
} from 'lucide-react'
import { useBank, useToast } from '../../store'
import { fmtDateTime, inr } from '../../lib/utils'
import { Avatar, Segmented, Empty, Modal, Button } from '../../components/ui'
import type { ApprovalRequest, ReqKind } from '../../lib/types'

const KIND_META: Record<ReqKind, { label: string; Icon: typeof ArrowDownLeft; tint: string }> = {
  deposit: { label: 'Deposit', Icon: ArrowDownLeft, tint: 'text-success bg-success/12' },
  withdrawal: { label: 'Withdrawal', Icon: ArrowUpRight, tint: 'text-danger bg-danger/12' },
  loan: { label: 'Loan', Icon: Landmark, tint: 'text-primary bg-primary/12' },
  kyc: { label: 'KYC', Icon: IdCard, tint: 'text-accent bg-accent/12' },
  card: { label: 'Card Request', Icon: CreditCard, tint: 'text-warning bg-warning/12' },
}

function ReqRow({
  req,
  onDecide,
}: {
  req: ApprovalRequest
  onDecide: (req: ApprovalRequest, approve: boolean) => void
}) {
  const users = useBank((s) => s.users)
  const user = users.find((u) => u.id === req.userId)
  const meta = KIND_META[req.kind]
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <Avatar name={user?.name || '?'} hue={user?.avatarHue || 0} size={42} />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-text">{user?.name}</p>
          <p className="text-[11.5px] text-muted">{fmtDateTime(req.createdAt)}</p>
        </div>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.tint}`}>
          <meta.Icon size={17} />
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-muted uppercase">{meta.label}</span>
          {req.amount ? <span className="text-[15px] font-bold text-text">{inr(req.amount)}</span> : null}
        </div>
        {req.kind === 'loan' && req.meta?.months && (
          <span className="text-[11px] text-muted">{req.meta.months} months</span>
        )}
        {req.kind === 'card' && req.meta?.cardType && (
          <span className="text-[11px] text-muted capitalize">
            {req.meta.cardType} · limit {inr(req.meta.requestedLimit || 0)}
          </span>
        )}
      </div>
      {req.note && <p className="text-[12px] text-muted mt-1.5">“{req.note}”</p>}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={() => onDecide(req, true)}
          className="flex items-center justify-center gap-1.5 bg-success text-white py-2.5 rounded-xl text-[13px] font-bold active:scale-[0.97]"
        >
          <Check size={16} /> Approve
        </button>
        <button
          onClick={() => onDecide(req, false)}
          className="flex items-center justify-center gap-1.5 bg-surface2 border border-line text-danger py-2.5 rounded-xl text-[13px] font-bold active:scale-[0.97]"
        >
          <X size={16} /> Reject
        </button>
      </div>
    </div>
  )
}

export default function Approvals() {
  const toast = useToast((s) => s.toast)
  const requests = useBank((s) => s.requests)
  const decideRequest = useBank((s) => s.decideRequest)
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const [confirm, setConfirm] = useState<{ req: ApprovalRequest; approve: boolean } | null>(null)

  const pending = requests.filter((r) => r.status === 'pending').sort((a, b) => b.createdAt - a.createdAt)
  const history = requests.filter((r) => r.status !== 'pending').sort((a, b) => (b.decidedAt || 0) - (a.decidedAt || 0))

  return (
    <div className="pt-3">
      <div className="text-center">
        <h1 className="font-semibold text-[16px] text-text">Approvals</h1>
        <p className="text-[12.5px] text-muted mt-0.5">Review every request in the bank</p>
      </div>

      <div className="mt-4">
        <Segmented
          options={[
            { id: 'pending', label: `Pending (${pending.length})` },
            { id: 'history', label: 'History' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {tab === 'pending' ? (
          pending.length === 0 ? (
            <Empty icon={ClipboardCheck} title="All caught up" sub="No pending approvals" />
          ) : (
            pending.map((r) => <ReqRow key={r.id} req={r} onDecide={(req, approve) => setConfirm({ req, approve })} />)
          )
        ) : history.length === 0 ? (
          <Empty icon={ClipboardCheck} title="No history yet" />
        ) : (
          history.map((r) => {
            const user = useBank.getState().users.find((u) => u.id === r.userId)
            const meta = KIND_META[r.kind]
            return (
              <div key={r.id} className="card p-4 flex items-center gap-3">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.tint}`}>
                  <meta.Icon size={17} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-text">
                    {meta.label} · {user?.name}
                  </p>
                  <p className="text-[11.5px] text-muted">
                    {r.amount ? inr(r.amount) + ' · ' : ''}
                    {r.decidedAt ? fmtDateTime(r.decidedAt) : ''}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                    r.status === 'approved' ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
                  }`}
                >
                  {r.status}
                </span>
              </div>
            )
          })
        )}
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)}>
        {confirm && (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-[15px] font-bold text-text">
              {confirm.approve ? 'Approve' : 'Reject'} this {confirm.req.kind} request?
            </p>
            {confirm.req.amount ? (
              <p className="text-[20px] font-bold text-text">{inr(confirm.req.amount)}</p>
            ) : null}
            <div className="flex gap-2">
              <Button variant="ghost" full onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant={confirm.approve ? 'primary' : 'danger'}
                full
                onClick={async () => {
                  const res = await decideRequest(confirm.req.id, confirm.approve)
                  toast(res.ok ? (confirm.approve ? 'Approved' : 'Rejected') : res.error || 'Failed', res.ok ? 'success' : 'error')
                  setConfirm(null)
                }}
              >
                {confirm.approve ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
