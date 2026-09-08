import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  Send,
  HandCoins,
  QrCode,
  ScanLine,
  Plus,
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
  PieChart,
  LineChart,
  ReceiptText,
  UserRound,
  Settings,
  ChevronRight,
  Megaphone,
  Copy,
  Check,
} from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inr, inrFull } from '../../lib/utils'
import { BankLogo } from '../../components/Cards'
import { Avatar, Sheet, Button, PinPad, RefreshButton } from '../../components/ui'
import { PaySourceSelector, type PaySource } from '../../components/Pay'
import { TxnIcon, txnMeta } from '../../components/Txn'
import { TxnDetail } from '../../components/TxnDetail'
import type { Transaction, MoneyRequest } from '../../lib/types'

export default function Home() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const transactions = useBank((s) => s.transactions)
  const moneyRequests = useBank((s) => s.moneyRequests)
  const notifs = useBank((s) => s.notifications)
  const announcements = useBank((s) => s.announcements)
  const respondMoneyRequest = useBank((s) => s.respondMoneyRequest)
  const addMoneyRequest = useBank((s) => s.addMoneyRequest)
  const withdrawRequest = useBank((s) => s.withdrawRequest)
  const refreshHome = useBank((s) => s.refreshHome)

  const me = users.find((u) => u.id === session?.userId)
  if (!me) return null

  const unread = notifs.filter((n) => n.userId === me.id && !n.read).length
  const incoming = moneyRequests.filter((r) => r.toUserId === me.id && r.status === 'pending')
  const recent = transactions
    .filter((t) => t.fromUserId === me.id || t.toUserId === me.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)

  const [addOpen, setAddOpen] = useState(false)
  const [addAmt, setAddAmt] = useState('')
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [payReq, setPayReq] = useState<MoneyRequest | null>(null)
  const [paySource, setPaySource] = useState<PaySource>('balance')
  const [detail, setDetail] = useState<Transaction | null>(null)

  const creditCard = me.cards.find((c) => c.type === 'credit' && c.status === 'active')
  const cardAvailable = creditCard ? Math.max(0, (creditCard.creditLimit || 0) - (creditCard.dueAmount || 0)) : 0

  const doRefresh = async () => {
    setRefreshing(true)
    await refreshHome()
    setRefreshing(false)
  }

  const doPayRequest = async (pin: string) => {
    if (!payReq) return
    if (pin !== me.pin) {
      setPayReq(null)
      toast('Incorrect PIN', 'error')
      return
    }
    const res = await respondMoneyRequest(payReq.id, 'pay', paySource)
    setPayReq(null)
    toast(res.ok ? 'Payment sent' : res.error || 'Failed', res.ok ? 'success' : 'error')
  }

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(me.upiId)
    } catch {
      /* ignore */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const counterpartName = (t: Transaction) => {
    if (t.toUserId && t.toUserId !== me.id) return users.find((u) => u.id === t.toUserId)?.name || 'User'
    if (t.fromUserId && t.fromUserId !== me.id) return users.find((u) => u.id === t.fromUserId)?.name || 'User'
    return null
  }

  const signed = (t: Transaction) => (t.toUserId === me.id ? t.amount : -t.amount)

  return (
    <div className="pt-3 anim-up">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BankLogo size={34} />
          <div>
            <p className="font-bold text-[16px] leading-tight">Jack Bank</p>
            <p className="text-[11px] text-muted">Friends-only bank</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => nav('/notifications')} className="relative p-2.5 rounded-xl bg-surface border border-line">
            <Bell size={19} className="text-muted" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
          <Link to="/profile">
            <Avatar name={me.name} hue={me.avatarHue} size={40} />
          </Link>
        </div>
      </div>

      {/* announcement */}
      {announcements[0] && (
        <div className="mt-4 flex items-start gap-2.5 card p-3.5">
          <span className="w-8 h-8 rounded-lg bg-accent/12 text-accent flex items-center justify-center shrink-0">
            <Megaphone size={17} />
          </span>
          <p className="text-[12.5px] text-muted leading-snug">{announcements[0].text}</p>
        </div>
      )}

      {/* balance card */}
      <div className="mt-4 rounded-3xl brand-gradient-2 p-5 text-white relative overflow-hidden shadow-xl shadow-primary/25">
        <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-black/15" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[12px] font-medium opacity-85">Total Balance</p>
              <RefreshButton
                onClick={doRefresh}
                refreshing={refreshing}
                size={14}
                className="!p-1 bg-white/15 hover:bg-white/25 !text-white"
              />
            </div>
            <button
              onClick={copyUpi}
              className="flex items-center gap-1 bg-white/15 hover:bg-white/25 transition-colors rounded-lg px-2 py-1 text-[11px] font-semibold"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {me.upiId}
            </button>
          </div>
          <p className="text-[34px] font-bold tracking-tight mt-1">{inr(me.balance)}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] opacity-80">A/C {me.accountNumber}</p>
            <p className="text-[11px] opacity-80">IFSC {me.ifsc}</p>
          </div>
        </div>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        {[
          { label: 'Send', Icon: Send, to: '/send', tint: 'text-primary' },
          { label: 'Request', Icon: HandCoins, to: '/request', tint: 'text-accent' },
          { label: 'Scan', Icon: ScanLine, to: '/scan', tint: 'text-success' },
          { label: 'My QR', Icon: QrCode, to: '/myqr', tint: 'text-warning' },
        ].map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="flex flex-col items-center gap-2 card p-3.5 active:scale-[0.96] transition-all"
          >
            <span className={`w-11 h-11 rounded-2xl bg-surface2 flex items-center justify-center ${a.tint}`}>
              <a.Icon size={21} />
            </span>
            <span className="text-[11px] font-semibold text-text">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* money requests owed */}
      {incoming.length > 0 && (
        <div className="mt-5">
          <p className="text-[13px] font-bold text-text mb-2">Pending from you</p>
          {incoming.map((r) => {
            const asker = users.find((u) => u.id === r.fromUserId)
            return (
              <div key={r.id} className="card p-3.5 flex items-center gap-3 mb-2">
                <Avatar name={asker?.name || ''} hue={asker?.avatarHue || 0} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-text">
                    {asker?.name} <span className="text-muted font-normal">requested</span>
                  </p>
                  <p className="text-[12px] text-muted truncate">{r.note || 'Money request'}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[14px] font-bold text-text">{inr(r.amount)}</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setPaySource('balance')
                        setPayReq(r)
                      }}
                      className="text-[11px] font-bold bg-primary text-white px-3 py-1.5 rounded-lg"
                    >
                      Pay
                    </button>
                    <button
                      onClick={() => {
                        respondMoneyRequest(r.id, 'decline')
                      }}
                      className="text-[11px] font-bold bg-surface2 text-muted px-3 py-1.5 rounded-lg"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* shortcut grid */}
      <div className="mt-5">
        <p className="text-[13px] font-bold text-text mb-2">Banking</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Add Money', Icon: Plus, act: () => setAddOpen(true), tint: 'text-success' },
            { label: 'Withdraw', Icon: Banknote, act: () => nav('/withdraw'), tint: 'text-danger' },
            { label: 'Cards', Icon: CreditCard, act: () => nav('/cards'), tint: 'text-primary' },
            { label: 'Loans', Icon: Landmark, act: () => nav('/loans'), tint: 'text-accent' },
            { label: 'FD', Icon: PiggyBank, act: () => nav('/fd'), tint: 'text-warning' },
            { label: 'Mutual Funds', Icon: PieChart, act: () => nav('/mf'), tint: 'text-primary' },
            { label: 'Stock Market', Icon: LineChart, act: () => nav('/stocks'), tint: 'text-accent' },
            { label: 'Statement', Icon: ReceiptText, act: () => nav('/statement'), tint: 'text-primary' },
            { label: 'Profile', Icon: UserRound, act: () => nav('/profile'), tint: 'text-accent' },
            { label: 'Settings', Icon: Settings, act: () => nav('/settings'), tint: 'text-muted' },
          ].map((a) => (
            <button key={a.label} onClick={a.act} className="flex flex-col items-center gap-2 card p-3.5 active:scale-[0.96] transition-all">
              <span className={`w-11 h-11 rounded-2xl bg-surface2 flex items-center justify-center ${a.tint}`}>
                <a.Icon size={21} />
              </span>
              <span className="text-[11px] font-semibold text-text text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* recent transactions */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-bold text-text">Recent activity</p>
          <Link to="/statement" className="text-[12px] font-semibold text-primary flex items-center">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        <div className="card divide-y divide-line">
          {recent.map((t) => {
            const name = counterpartName(t)
            const { label } = txnMeta(t.type)
            return (
              <button
                key={t.id}
                onClick={() => setDetail(t)}
                className="w-full flex items-center gap-3 p-3.5 text-left active:bg-surface2 transition-colors"
              >
                <TxnIcon type={t.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-text truncate">{name || label}</p>
                  <p className="text-[11.5px] text-muted">{label}</p>
                </div>
                <span className={`text-[14px] font-bold ${signed(t) >= 0 ? 'text-success' : 'text-text'}`}>
                  {signed(t) >= 0 ? '+' : '−'}
                  {inr(Math.abs(signed(t)))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* add money sheet */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Money">
        <div className="pt-2 flex flex-col gap-4">
          <p className="text-[13px] text-muted">Add virtual money to your account. The owner approves it from the admin panel.</p>
          <input
            autoFocus
            type="number"
            inputMode="numeric"
            placeholder="Enter amount"
            value={addAmt}
            onChange={(e) => setAddAmt(e.target.value)}
            className="w-full bg-surface2 border border-line rounded-xl px-4 py-3.5 text-[22px] font-bold text-text outline-none focus:border-primary"
          />
          <div className="grid grid-cols-3 gap-2">
            {[500, 1000, 5000].map((v) => (
              <button
                key={v}
                onClick={() => setAddAmt(String(v))}
                className="py-2.5 rounded-xl bg-surface2 border border-line text-[13px] font-bold text-text"
              >
                ₹{v}
              </button>
            ))}
          </div>
          <Button
            full
            disabled={!addAmt || Number(addAmt) <= 0}
            onClick={async () => {
              const res = await addMoneyRequest(me.id, Number(addAmt), 'Add money via UPI')
              toast(res.ok ? 'Request sent to admin for approval' : res.error || 'Failed', res.ok ? 'success' : 'error')
              setAddOpen(false)
              setAddAmt('')
            }}
          >
            Request Deposit
          </Button>
        </div>
      </Sheet>

      {/* pay a money request sheet */}
      <Sheet open={!!payReq} onClose={() => setPayReq(null)} title="Pay Request">
        {payReq && (
          <div className="pt-2 flex flex-col gap-3 pb-2">
            <div className="text-center">
              <p className="text-[13px] text-muted">Paying</p>
              <p className="text-[22px] font-bold text-text">{inrFull(payReq.amount)}</p>
              <p className="text-[12.5px] text-muted">{payReq.note || 'Money request'}</p>
            </div>
            <PaySourceSelector
              source={paySource}
              onChange={setPaySource}
              balance={me.balance}
              hasCard={!!creditCard}
              cardAvailable={cardAvailable}
              cardLimit={creditCard?.creditLimit}
            />
            <PinPad onComplete={doPayRequest} />
          </div>
        )}
      </Sheet>

      <TxnDetail txn={detail} users={users} meId={me.id} onClose={() => setDetail(null)} />
    </div>
  )
}
