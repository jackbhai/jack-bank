import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Copy, Check, BadgeCheck, Star, ShieldAlert, FileCheck2, CalendarDays } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { creditScoreFor, fmtDate, inr } from '../../lib/utils'
import { MiniCardRow } from '../../components/Cards'
import { Avatar, Button, TopBar } from '../../components/ui'

export default function Profile() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const transactions = useBank((s) => s.transactions)
  const loans = useBank((s) => s.loans)
  const requestKyc = useBank((s) => s.requestKyc)

  const me = users.find((u) => u.id === session?.userId)!
  const [copied, setCopied] = useState(false)
  const score = creditScoreFor(me.id, transactions, loans, users)

  const copy = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast('Copied', 'success')
    } catch {
      toast('Could not copy', 'error')
    }
  }

  const scoreColor = score >= 750 ? 'text-success' : score >= 600 ? 'text-warning' : 'text-danger'
  const scoreLabel = score >= 750 ? 'Excellent' : score >= 600 ? 'Good' : 'Needs work'

  return (
    <div className="pt-3">
      <TopBar title="Profile" left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} />

      <div className="mt-2 flex flex-col items-center gap-2 card p-6">
        <Avatar name={me.name} hue={me.avatarHue} size={76} />
        <p className="text-[18px] font-bold text-text mt-1">{me.name}</p>
        <p className="text-[12.5px] text-muted">{me.email}</p>
        <div className="flex items-center gap-2 mt-1">
          {me.kycStatus === 'approved' ? (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-success bg-success/10 px-2.5 py-1 rounded-lg">
              <BadgeCheck size={13} /> KYC Verified
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-lg">
              <ShieldAlert size={13} /> KYC {me.kycStatus}
            </span>
          )}
          <span className="text-[11px] font-bold text-muted bg-surface2 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <CalendarDays size={13} /> Since {fmtDate(me.createdAt)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mt-4">
        <div className="card p-4">
          <p className="text-[11px] font-semibold text-muted uppercase">Credit Score</p>
          <p className={`text-[24px] font-bold ${scoreColor} mt-1`}>{score}</p>
          <p className={`text-[11.5px] font-semibold ${scoreColor}`}>{scoreLabel}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold text-muted uppercase flex items-center gap-1">
            <Star size={12} className="text-warning" /> Rewards
          </p>
          <p className="text-[24px] font-bold text-text mt-1">{me.rewards.toLocaleString('en-IN')}</p>
          <p className="text-[11.5px] text-muted">points earned</p>
        </div>
      </div>

      <div className="mt-4 card p-4">
        <MiniCardRow label="UPI ID" value={me.upiId} />
        <MiniCardRow label="Account Number" value={me.accountNumber} />
        <MiniCardRow label="IFSC Code" value={me.ifsc} />
        <MiniCardRow label="Branch" value={me.branch} />
        <MiniCardRow label="Account Type" value={me.accountType} />
        <MiniCardRow label="Phone" value={me.phone} />
        <MiniCardRow label="Balance" value={inr(me.balance)} />
        <MiniCardRow label="Cards" value={`${me.cards.length} active`} />
        <MiniCardRow label="Active FDs" value={`${me.fds.filter((f) => f.status === 'active').length}`} />
      </div>

      {me.kycStatus !== 'approved' && (
        <div className="mt-4">
          <Button
            full
            onClick={async () => {
              const res = await requestKyc(me.id)
              toast(res.ok ? 'KYC submitted for review' : res.error || 'Failed', res.ok ? 'success' : 'error')
            }}
          >
            <FileCheck2 size={16} /> Submit KYC for verification
          </Button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => copy(me.upiId)}>
          {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />} Copy UPI ID
        </Button>
        <Button variant="ghost" onClick={() => copy(me.accountNumber)}>
          <Copy size={16} /> Copy A/C No
        </Button>
      </div>
    </div>
  )
}
