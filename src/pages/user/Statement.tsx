import { useMemo, useState } from 'react'
import { Search, Download, ArrowDownLeft, ArrowUpRight, ListFilter } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { downloadCsv, fmtDay, fmtTime, inr } from '../../lib/utils'
import { TxnIcon, txnMeta } from '../../components/Txn'
import { Empty, TopBar, inputCls } from '../../components/ui'
import type { Transaction } from '../../lib/types'

type Filter = 'all' | 'credit' | 'debit'

export default function Statement() {
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const transactions = useBank((s) => s.transactions)
  const toast = useToast((s) => s.toast)

  const me = users.find((u) => u.id === session?.userId)!
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const mine = useMemo(
    () =>
      transactions
        .filter((t) => t.fromUserId === me.id || t.toUserId === me.id)
        .sort((a, b) => b.createdAt - a.createdAt),
    [transactions, me.id],
  )

  const isCredit = (t: Transaction) => t.toUserId === me.id
  const counterpart = (t: Transaction) => {
    if (t.toUserId && t.toUserId !== me.id) return users.find((u) => u.id === t.toUserId)?.name || 'User'
    if (t.fromUserId && t.fromUserId !== me.id) return users.find((u) => u.id === t.fromUserId)?.name || 'User'
    return null
  }

  const filtered = mine.filter((t) => {
    if (filter === 'credit' && !isCredit(t)) return false
    if (filter === 'debit' && isCredit(t)) return false
    const cname = counterpart(t)
    const { label } = txnMeta(t.type)
    const hay = `${cname || ''} ${label} ${t.note || ''} ${t.refNo}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

  const totalIn = mine.filter(isCredit).reduce((a, t) => a + t.amount, 0)
  const totalOut = mine.filter((t) => !isCredit(t)).reduce((a, t) => a + t.amount, 0)

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const k = fmtDay(t.createdAt)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(t)
    }
    return [...map.entries()]
  }, [filtered])

  const exportCsv = () => {
    const rows: (string | number)[][] = [['Date', 'Type', 'Description', 'Ref No', 'Amount (₹)', 'Direction']]
    for (const t of mine) {
      const { label } = txnMeta(t.type)
      const desc = counterpart(t) || t.note || label
      rows.push([
        new Date(t.createdAt).toLocaleString('en-IN'),
        label,
        desc,
        t.refNo,
        t.amount.toFixed(2),
        isCredit(t) ? 'Credit' : 'Debit',
      ])
    }
    downloadCsv(`jack-bank-statement-${me.upiId}.csv`, rows)
    toast('Statement exported', 'success')
  }

  return (
    <div className="pt-3">
      <TopBar
        title="Statement"
        right={
          <button onClick={exportCsv} className="p-1.5">
            <Download size={19} className="text-muted" />
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase">
            <ArrowDownLeft size={13} className="text-success" /> Total credit
          </p>
          <p className="text-[18px] font-bold text-success mt-1">{inr(totalIn)}</p>
        </div>
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase">
            <ArrowUpRight size={13} className="text-danger" /> Total debit
          </p>
          <p className="text-[18px] font-bold text-danger mt-1">{inr(totalOut)}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transactions" className={inputCls + ' pl-9 py-2.5'} />
        </div>
      </div>

      <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'credit', label: 'Credits' },
            { id: 'debit', label: 'Debits' },
          ] as { id: Filter; label: string }[]
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-[12.5px] font-semibold border transition-all whitespace-nowrap ${
              filter === f.id ? 'bg-primary text-white border-primary' : 'bg-surface border-line text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {filtered.length === 0 && (
          <Empty icon={ListFilter} title="No transactions found" sub="Try a different filter or search" />
        )}
        {groups.map(([day, list]) => (
          <div key={day}>
            <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">{day}</p>
            <div className="card divide-y divide-line">
              {list.map((t) => {
                const { label } = txnMeta(t.type)
                const name = counterpart(t)
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3.5">
                    <TxnIcon type={t.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-text truncate">{name || label}</p>
                      <p className="text-[11.5px] text-muted">
                        {label} · {fmtTime(t.createdAt)} {t.note ? '· ' + t.note : ''}
                      </p>
                    </div>
                    <span className={`text-[14px] font-bold ${isCredit(t) ? 'text-success' : 'text-text'}`}>
                      {isCredit(t) ? '+' : '−'}
                      {inr(t.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
