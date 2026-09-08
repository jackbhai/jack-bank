import { useMemo, useState } from 'react'
import { Search, Download, ScrollText, ArrowLeftRight, ChevronRight } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { downloadCsv, fmtDateTime, inrCompact, inr } from '../../lib/utils'
import { TxnIcon, txnMeta } from '../../components/Txn'
import { TxnDetail } from '../../components/TxnDetail'
import { Empty, inputCls } from '../../components/ui'
import type { Transaction } from '../../lib/types'

export default function Ledger() {
  const toast = useToast((s) => s.toast)
  const transactions = useBank((s) => s.transactions)
  const users = useBank((s) => s.users)
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<Transaction | null>(null)

  const nameOf = (id: string | null) => (id ? users.find((u) => u.id === id)?.name || '—' : '—')

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => b.createdAt - a.createdAt),
    [transactions],
  )

  const filtered = sorted.filter((t) => {
    const hay = `${nameOf(t.fromUserId)} ${nameOf(t.toUserId)} ${txnMeta(t.type).label} ${t.note || ''} ${t.refNo}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

  const totalVol = transactions.reduce((a, t) => a + t.amount, 0)
  const totalFees = transactions.filter((t) => t.type === 'fee').reduce((a, t) => a + t.amount, 0)

  const exportCsv = () => {
    const rows: (string | number)[][] = [['Time', 'Type', 'From', 'To', 'Amount', 'Ref']]
    for (const t of sorted) {
      rows.push([
        new Date(t.createdAt).toLocaleString('en-IN'),
        txnMeta(t.type).label,
        nameOf(t.fromUserId),
        nameOf(t.toUserId),
        t.amount,
        t.refNo,
      ])
    }
    downloadCsv('jack-bank-ledger.csv', rows)
    toast('Ledger exported', 'success')
  }

  return (
    <div className="pt-3">
      <div className="text-center">
        <h1 className="font-semibold text-[16px] text-text">Bank Ledger</h1>
        <p className="text-[12.5px] text-muted mt-0.5">Every transaction in Jack Bank</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="card p-4">
          <p className="text-[11px] font-semibold text-muted uppercase">Total volume</p>
          <p className="text-[18px] font-bold text-text mt-1">{inrCompact(totalVol)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold text-muted uppercase">Fees earned</p>
          <p className="text-[18px] font-bold text-success mt-1">{inr(totalFees)}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ledger" className={inputCls + ' pl-9 py-2.5'} />
        </div>
        <button onClick={exportCsv} className="px-3.5 rounded-xl bg-surface border border-line text-muted">
          <Download size={18} />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {filtered.length === 0 && <Empty icon={ScrollText} title="No transactions" />}
        {filtered.slice(0, 80).map((t) => {
          const { label } = txnMeta(t.type)
          return (
            <button
              key={t.id}
              onClick={() => setDetail(t)}
              className="card p-3.5 flex items-center gap-3 text-left active:bg-surface2 transition-colors"
            >
              <TxnIcon type={t.type} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-text truncate">
                  {nameOf(t.fromUserId)} <ArrowLeftRight size={11} className="inline text-faint mx-0.5" /> {nameOf(t.toUserId)}
                </p>
                <p className="text-[11px] text-muted truncate">
                  {label} · {fmtDateTime(t.createdAt)}
                </p>
              </div>
              <span className="text-[13.5px] font-bold text-text">{inr(t.amount)}</span>
              <ChevronRight size={15} className="text-faint" />
            </button>
          )
        })}
      </div>

      <TxnDetail txn={detail} users={users} onClose={() => setDetail(null)} />
    </div>
  )
}
