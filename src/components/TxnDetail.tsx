import { useState } from 'react'
import { Copy, Check, Hash, CreditCard, ReceiptText } from 'lucide-react'
import { Sheet } from './ui'
import { TxnIcon, txnMeta } from './Txn'
import { inr, inrFull, fmtDateTime } from '../lib/utils'
import type { Transaction, User } from '../lib/types'

const methodLabel: Record<string, string> = {
  upi: 'UPI',
  account: 'Account transfer',
  card: 'Credit card',
  admin: 'Admin',
}

/** Full detail view for any transaction — used by Statement, Home, Cards, Ledger. */
export function TxnDetail({
  txn,
  users,
  meId,
  onClose,
}: {
  txn: Transaction
  users: User[]
  meId?: string | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  if (!txn) return null
  const { label } = txnMeta(txn.type)

  const who = (id: string | null) => users.find((u) => u.id === id)
  const from = who(txn.fromUserId)
  const to = who(txn.toUserId)

  // direction relative to the viewer (defaults to neutral for admin/ledger)
  const credit = meId ? txn.toUserId === meId : txn.toUserId != null && txn.fromUserId == null
  const signed = meId ? (credit ? '+' : '−') : ''
  const amountCls = meId ? (credit ? 'text-success' : 'text-danger') : 'text-text'

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(txn.refNo)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <Sheet open={!!txn} onClose={onClose} title="Transaction details">
      <div className="pt-2 flex flex-col gap-4 pb-2">
        {/* header */}
        <div className="flex flex-col items-center text-center gap-2">
          <TxnIcon type={txn.type} />
          <div>
            <p className="text-[15px] font-bold text-text">{label}</p>
            <p className={`text-[28px] font-bold tracking-tight ${amountCls}`}>
              {signed}{inrFull(txn.amount)}
            </p>
            <span
              className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                txn.status === 'success' ? 'bg-success/12 text-success' : txn.status === 'failed' ? 'bg-danger/12 text-danger' : 'bg-warning/12 text-warning'
              }`}
            >
              {txn.status}
            </span>
          </div>
        </div>

        {/* parties */}
        <div className="card p-3.5 space-y-0">
          {from && (
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-[12px] text-muted">From</span>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-text">{from.name}</p>
                <p className="text-[11px] text-faint">{from.upiId}</p>
              </div>
            </div>
          )}
          {to && (
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-[12px] text-muted">To</span>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-text">{to.name}</p>
                <p className="text-[11px] text-faint">{to.upiId}</p>
              </div>
            </div>
          )}
          {!from && !to && (
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-[12px] text-muted">Account</span>
              <span className="text-[13px] font-semibold text-text">Jack Bank</span>
            </div>
          )}
          {txn.note && (
            <div className="flex items-center justify-between py-2.5 border-b border-line gap-3">
              <span className="text-[12px] text-muted shrink-0">Note</span>
              <span className="text-[13px] font-semibold text-text text-right">{txn.note}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2.5 border-b border-line">
            <span className="text-[12px] text-muted">Method</span>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
              {txn.method === 'card' ? <CreditCard size={14} /> : <ReceiptText size={14} />}
              {methodLabel[txn.method] || txn.method}
            </span>
          </div>
          {txn.fee != null && txn.fee > 0 && (
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-[12px] text-muted">Fee</span>
              <span className="text-[13px] font-semibold text-text">{inr(txn.fee)}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2.5 border-b border-line">
            <span className="text-[12px] text-muted">Date & time</span>
            <span className="text-[13px] font-semibold text-text">{fmtDateTime(txn.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-[12px] text-muted">Reference</span>
            <button onClick={copyRef} className="flex items-center gap-1.5 text-[13px] font-semibold text-primary">
              {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
              {txn.refNo || '—'}
            </button>
          </div>
        </div>

        {/* txn id */}
        <p className="text-center text-[10.5px] text-faint flex items-center justify-center gap-1">
          <Hash size={10} /> Transaction ID {txn.id}
        </p>
      </div>
    </Sheet>
  )
}
