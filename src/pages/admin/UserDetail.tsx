import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, Ban, CircleCheck, MinusCircle, PlusCircle, KeyRound, Trash2, BadgeCheck,
  CreditCard, Snowflake, Flame, Unlock, ChevronDown, Landmark,
  PiggyBank, PieChart, LineChart, SlidersHorizontal, ShieldCheck,
} from 'lucide-react'
import { useBank, useToast } from '../../store'
import { creditScoreFor, fmtDate, fmtDateTime, inr } from '../../lib/utils'
import { USER_SETTINGS_SCHEMA, DEFAULT_USER_CFG, TOTAL_USER_PARAMS } from '../../lib/userCfg'
import { Avatar, Modal, Button, Field, inputCls, Segmented } from '../../components/ui'
import { maskCard } from '../../lib/utils'

export default function UserDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const users = useBank((s) => s.users)
  const cards = useBank((s) => s.cards)
  const fds = useBank((s) => s.fds)
  const loans = useBank((s) => s.loans)
  const transactions = useBank((s) => s.transactions)
  const mfHoldings = useBank((s) => s.mfHoldings)
  const mfFunds = useBank((s) => s.mfFunds)
  const stockHoldings = useBank((s) => s.stockHoldings)
  const stocks = useBank((s) => s.stocks)
  const requests = useBank((s) => s.requests)
  const userSettings = useBank((s) => s.userSettings)
  const getUserSettings = useBank((s) => s.getUserSettings)
  const setUserSetting = useBank((s) => s.setUserSetting)
  const blockUser = useBank((s) => s.blockUser)
  const unblockUser = useBank((s) => s.unblockUser)
  const adminAdjust = useBank((s) => s.adminAdjust)
  const adminResetPin = useBank((s) => s.adminResetPin)
  const adminIssueCard = useBank((s) => s.adminIssueCard)
  const adminSetCardLimit = useBank((s) => s.adminSetCardLimit)
  const adminApproveKyc = useBank((s) => s.adminApproveKyc)
  const adminDeleteUser = useBank((s) => s.adminDeleteUser)
  const setCardStatus = useBank((s) => s.setCardStatus)

  const me = users.find((u) => u.id === id)
  const [tab, setTab] = useState<'overview' | 'cards' | 'loans' | 'invest' | 'settings' | 'activity'>('overview')
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustAmt, setAdjustAmt] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [pinOpen, setPinOpen] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [cardOpen, setCardOpen] = useState(false)
  const [cardType, setCardType] = useState<'debit' | 'credit'>('debit')
  const [cardLimit, setCardLimit] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [limitCard, setLimitCard] = useState<string | null>(null)
  const [limitVal, setLimitVal] = useState('')

  useEffect(() => {
    if (id) getUserSettings(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const cfg = userSettings[id] || DEFAULT_USER_CFG
  const myCards = useMemo(() => cards.filter((c) => c.userId === id), [cards, id])
  const myFds = fds.filter((f) => f.userId === id && f.status !== 'broken')
  const myLoans = loans.filter((l) => l.userId === id)
  const myTxns = transactions.filter((t) => t.fromUserId === id || t.toUserId === id).slice(0, 40)
  const myReq = requests.filter((r) => r.userId === id)
  const score = me ? creditScoreFor(me.id, transactions, loans, users) : 0

  const mfInvested = mfHoldings.filter((h) => h.userId === id).reduce((a, h) => a + h.invested, 0)
  const mfValue = mfHoldings.filter((h) => h.userId === id).reduce((a, h) => {
    const f = mfFunds.find((x) => x.id === h.fundId)
    return a + (f ? h.units * f.nav : 0)
  }, 0)
  const stValue = stockHoldings.filter((h) => h.userId === id).reduce((a, h) => {
    const s = stocks.find((x) => x.id === h.stockId)
    return a + (s ? h.qty * s.price : 0)
  }, 0)

  if (!me) {
    return (
      <div className="pt-3">
        <button onClick={() => nav('/admin/users')} className="flex items-center gap-1 text-muted text-[13px] mb-4"><ChevronLeft size={18} /> Back</button>
        <p className="text-center text-muted py-16">User not found</p>
      </div>
    )
  }

  const scoreColor = score >= 750 ? 'text-success' : score >= 600 ? 'text-warning' : 'text-danger'

  return (
    <div className="pt-3">
      <TopBarL left={<button onClick={() => nav('/admin/users')} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} title="Account" />

      {/* header */}
      <div className="mt-2 card p-5 relative overflow-hidden">
        <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-primary/12" />
        <div className="relative flex items-center gap-3">
          <Avatar name={me.name} hue={me.avatarHue} size={62} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[17px] text-text truncate">{me.name}</p>
            <p className="text-[12px] text-muted truncate">{me.upiId}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              {me.status === 'active' ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-md uppercase"><CircleCheck size={11} /> Active</span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-md uppercase"><Ban size={11} /> Blocked</span>
              )}
              {me.kycStatus === 'approved' ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-md uppercase"><BadgeCheck size={11} /> KYC</span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-md uppercase"><ShieldCheck size={11} /> KYC {me.kycStatus}</span>
              )}
              <span className="text-[10px] font-bold text-muted bg-surface2 px-2 py-0.5 rounded-md uppercase">{(cfg.account_tier as string) || 'Basic'}</span>
            </div>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-2 mt-4">
          <MiniStat label="Balance" value={inr(me.balance)} />
          <MiniStat label="Credit score" value={String(score)} cls={scoreColor} />
          <MiniStat label="Rewards" value={me.rewards.toLocaleString('en-IN')} />
        </div>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        <QAction label="Credit" Icon={PlusCircle} cls="bg-success/12 text-success" onClick={() => { setAdjustOpen(true); setAdjustAmt(''); setAdjustNote('') }} />
        <QAction label="Debit" Icon={MinusCircle} cls="bg-danger/12 text-danger" onClick={() => { setAdjustOpen(true); setAdjustAmt(''); setAdjustNote('') }} />
        <QAction label="Reset PIN" Icon={KeyRound} cls="bg-warning/12 text-warning" onClick={() => { setPinOpen(true); setNewPin('') }} />
        <QAction label={me.status === 'active' ? 'Block' : 'Unblock'} Icon={me.status === 'active' ? Ban : CircleCheck} cls="bg-surface2 text-muted" onClick={async () => {
          const res = me.status === 'active' ? await blockUser(me.id) : await unblockUser(me.id)
          toast(res.ok ? (me.status === 'active' ? 'Blocked' : 'Unblocked') : res.error || 'Failed', res.ok ? 'success' : 'error')
        }} />
      </div>

      <div className="mt-4">
        <Segmented
          options={[
            { id: 'overview', label: 'Overview' },
            { id: 'cards', label: 'Cards' },
            { id: 'invest', label: 'Invest' },
            { id: 'settings', label: `Settings (${TOTAL_USER_PARAMS})` },
            { id: 'activity', label: 'Activity' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'overview' && <Overview me={me} myCards={myCards} myFds={myFds} myLoans={myLoans} myReq={myReq} score={score} scoreColor={scoreColor} onApproveKyc={async () => { const r = await adminApproveKyc(me.id); toast(r.ok ? 'KYC approved' : r.error || 'Failed', r.ok ? 'success' : 'error') }} />}

      {tab === 'cards' && (
        <div className="mt-3 flex flex-col gap-2.5">
          <Button full onClick={() => { setCardOpen(true); setCardType('debit'); setCardLimit('') }}><CreditCard size={16} /> Issue new card</Button>
          {myCards.length === 0 && <p className="text-center text-[13px] text-muted py-8">No cards issued</p>}
          {myCards.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-bold text-text flex items-center gap-2">{c.type === 'credit' ? 'Credit' : 'Debit'} · {c.network} <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${c.status === 'active' ? 'bg-success/12 text-success' : c.status === 'frozen' ? 'bg-accent/12 text-accent' : 'bg-danger/12 text-danger'}`}>{c.status}</span></p>
                  <p className="text-[12px] text-muted font-mono mt-0.5">{maskCard(c.number)} · exp {c.expiry}</p>
                  {c.type === 'credit' && <p className="text-[11.5px] text-muted mt-0.5">Limit {inr(c.creditLimit || 0)} · Due {inr(c.dueAmount || 0)}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button onClick={async () => {
                    const res = await setCardStatus(me.id, c.id, c.status === 'frozen' ? 'active' : 'frozen')
                    toast(res.ok ? 'Card updated' : res.error || 'Failed', res.ok ? 'success' : 'error')
                  }} className="flex items-center justify-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-surface2 text-text">
                    {c.status === 'frozen' ? <Unlock size={13} /> : <Snowflake size={13} />} {c.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                  </button>
                  <button onClick={async () => {
                    const res = await setCardStatus(me.id, c.id, c.status === 'blocked' ? 'active' : 'blocked')
                    toast(res.ok ? 'Card updated' : res.error || 'Failed', res.ok ? 'success' : 'error')
                  }} className="flex items-center justify-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-danger/12 text-danger">
                    <Flame size={13} /> {c.status === 'blocked' ? 'Unblock' : 'Block'}
                  </button>
                  {c.type === 'credit' && (
                    <button onClick={() => { setLimitCard(c.id); setLimitVal(String(c.creditLimit || 0)) }} className="flex items-center justify-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-primary/12 text-primary">
                      <SlidersHorizontal size={13} /> Limit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'invest' && (
        <div className="mt-3 flex flex-col gap-2.5">
          <InvestCard Icon={PiggyBank} label="Fixed deposits" value={inr(myFds.reduce((a, f) => a + f.amount, 0))} sub={`${myFds.length} active`} />
          <InvestCard Icon={PieChart} label="Mutual funds" value={inr(mfValue)} sub={`Invested ${inr(mfInvested)}`} />
          <InvestCard Icon={LineChart} label="Stocks" value={inr(stValue)} sub={`${stockHoldings.filter((h) => h.userId === id).length} holdings`} />
          <InvestCard Icon={Landmark} label="Loans" value={inr(myLoans.filter((l) => l.status === 'active').reduce((a, l) => a + l.amount, 0))} sub={`${myLoans.filter((l) => l.status === 'active').length} active loans`} />
        </div>
      )}

      {tab === 'settings' && <SettingsEditor cfg={cfg} userId={me.id} onSet={(k, v) => setUserSetting(me.id, k, v)} />}

      {tab === 'activity' && (
        <div className="mt-3 flex flex-col gap-2">
          {myTxns.length === 0 && <p className="text-center text-[13px] text-muted py-8">No transactions yet</p>}
          {myTxns.map((t) => {
            const other = t.fromUserId === id ? t.toUserId : t.fromUserId
            const otherU = users.find((u) => u.id === other)
            return (
              <div key={t.id} className="card p-3.5 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text truncate">{t.note || t.type.replace(/_/g, ' ')}</p>
                  <p className="text-[11px] text-muted">{otherU ? (t.fromUserId === id ? '→ ' : '← ') + otherU.name : ''} · {fmtDateTime(t.createdAt)}</p>
                </div>
                <span className={`text-[13px] font-bold shrink-0 ${t.toUserId === id ? 'text-success' : 'text-text'}`}>
                  {t.toUserId === id ? '+' : '−'}{inr(t.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* delete */}
      <div className="mt-6">
        <button onClick={() => setDeleteOpen(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-danger/30 text-danger text-[13px] font-semibold">
          <Trash2 size={15} /> Delete account & all data
        </button>
      </div>

      {/* ---- modals ---- */}
      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)}>
        <div className="flex flex-col gap-3">
          <p className="text-[15px] font-bold text-text">Adjust balance — {me.name}</p>
          <Field label="Amount">
            <input type="number" inputMode="numeric" autoFocus value={adjustAmt} onChange={(e) => setAdjustAmt(e.target.value)} placeholder="Amount" className={inputCls} />
          </Field>
          <input value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="Reason (optional)" className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <button disabled={!adjustAmt || Number(adjustAmt) <= 0} onClick={async () => {
              const res = await adminAdjust(me.id, Number(adjustAmt), adjustNote || 'Manual credit')
              toast(res.ok ? 'Credited' : res.error || 'Failed', res.ok ? 'success' : 'error')
              if (res.ok) setAdjustOpen(false)
            }} className="bg-success text-white py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-40">Credit</button>
            <button disabled={!adjustAmt || Number(adjustAmt) <= 0} onClick={async () => {
              const res = await adminAdjust(me.id, -Number(adjustAmt), adjustNote || 'Manual debit')
              toast(res.ok ? 'Debited' : res.error || 'Failed', res.ok ? 'success' : 'error')
              if (res.ok) setAdjustOpen(false)
            }} className="bg-danger text-white py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-40">Debit</button>
          </div>
        </div>
      </Modal>

      <Modal open={pinOpen} onClose={() => setPinOpen(false)}>
        <div className="flex flex-col gap-3">
          <p className="text-[15px] font-bold text-text">Reset PIN</p>
          <p className="text-[12.5px] text-muted">Set a new 4-digit UPI PIN for {me.name}.</p>
          <input type="password" inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} placeholder="New 4-digit PIN" className={inputCls + ' tracking-[0.5em] text-center'} />
          <Button full disabled={!/^\d{4}$/.test(newPin)} onClick={async () => {
            const res = await adminResetPin(me.id, newPin)
            toast(res.ok ? 'PIN reset' : res.error || 'Failed', res.ok ? 'success' : 'error')
            if (res.ok) setPinOpen(false)
          }}>Save PIN</Button>
        </div>
      </Modal>

      <Modal open={cardOpen} onClose={() => setCardOpen(false)}>
        <div className="flex flex-col gap-3">
          <p className="text-[15px] font-bold text-text">Issue card</p>
          <Segmented options={[{ id: 'debit', label: 'Debit' }, { id: 'credit', label: 'Credit' }]} value={cardType} onChange={setCardType} />
          {cardType === 'credit' && (
            <Field label="Credit limit">
              <input type="number" inputMode="numeric" value={cardLimit} onChange={(e) => setCardLimit(e.target.value)} placeholder="50000" className={inputCls} />
            </Field>
          )}
          <Button full onClick={async () => {
            const res = await adminIssueCard(me.id, cardType, cardType === 'credit' ? Number(cardLimit) : undefined)
            toast(res.ok ? `${cardType} card issued` : res.error || 'Failed', res.ok ? 'success' : 'error')
            if (res.ok) setCardOpen(false)
          }}>Issue {cardType} card</Button>
        </div>
      </Modal>

      <Modal open={!!limitCard} onClose={() => setLimitCard(null)}>
        <div className="flex flex-col gap-3">
          <p className="text-[15px] font-bold text-text">Set credit limit</p>
          <input type="number" inputMode="numeric" value={limitVal} onChange={(e) => setLimitVal(e.target.value)} placeholder="50000" className={inputCls} />
          <Button full disabled={!limitVal || Number(limitVal) <= 0} onClick={async () => {
            if (!limitCard) return
            const res = await adminSetCardLimit(limitCard, Number(limitVal))
            toast(res.ok ? 'Limit updated' : res.error || 'Failed', res.ok ? 'success' : 'error')
            if (res.ok) setLimitCard(null)
          }}>Save limit</Button>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <div className="flex flex-col gap-4 text-center">
          <Trash2 size={36} className="text-danger mx-auto" />
          <div>
            <p className="font-bold text-[16px] text-text">Delete {me.name}?</p>
            <p className="text-[13px] text-muted mt-1">This permanently removes the account, balance, cards, loans, FDs, investments and all transactions. This cannot be undone.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" full onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" full onClick={async () => {
              const res = await adminDeleteUser(me.id)
              toast(res.ok ? 'Account deleted' : res.error || 'Failed', res.ok ? 'success' : 'error')
              setDeleteOpen(false)
              if (res.ok) nav('/admin/users')
            }}>Delete permanently</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ================= helpers ================= */

function TopBarL({ left, title }: { left: React.ReactNode; title: string }) {
  return (
    <header className="sticky top-0 z-40 -mx-5 px-5 py-3 flex items-center justify-between bg-bg/85 backdrop-blur-lg">
      {left}
      <p className="text-[15px] font-semibold text-text">{title}</p>
      <span className="w-7" />
    </header>
  )
}

function MiniStat({ label, value, cls = 'text-text' }: { label: string; value: string; cls?: string }) {
  return (
    <div className="bg-surface2 rounded-xl p-2.5">
      <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
      <p className={`text-[14px] font-bold ${cls} mt-0.5`}>{value}</p>
    </div>
  )
}

function QAction({ label, Icon, cls, onClick }: { label: string; Icon: any; cls: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card p-3 flex flex-col items-center gap-1.5 active:scale-[0.96] transition-all">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${cls}`}><Icon size={17} /></span>
      <span className="text-[10.5px] font-semibold text-text">{label}</span>
    </button>
  )
}

function InvestCard({ Icon, label, value, sub }: { Icon: any; label: string; value: string; sub: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl bg-surface2 text-primary flex items-center justify-center shrink-0"><Icon size={19} /></span>
      <div className="flex-1">
        <p className="text-[12px] text-muted">{label}</p>
        <p className="text-[15px] font-bold text-text">{value}</p>
      </div>
      <span className="text-[11px] text-muted">{sub}</span>
    </div>
  )
}

function Overview({ me, myCards, myFds, myLoans, myReq, score, scoreColor, onApproveKyc }: {
  me: any; myCards: any[]; myFds: any[]; myLoans: any[]; myReq: any[]; score: number; scoreColor: string; onApproveKyc: () => void
}) {
  const rows: [string, string][] = [
    ['Full name', me.name],
    ['UPI ID', me.upiId],
    ['Account number', me.accountNumber],
    ['IFSC', me.ifsc],
    ['Branch', me.branch],
    ['Account type', me.accountType],
    ['Email', me.email],
    ['Phone', me.phone],
    ['Status', me.status],
    ['KYC', me.kycStatus],
    ['Member since', fmtDate(me.createdAt)],
    ['Balance', inr(me.balance)],
    ['Credit score', `${score} (${score >= 750 ? 'Excellent' : score >= 600 ? 'Good' : 'Needs work'})`],
    ['Rewards', me.rewards.toLocaleString('en-IN')],
    ['Cards', `${myCards.length} issued`],
    ['Active FDs', String(myFds.length)],
    ['Active loans', String(myLoans.filter((l) => l.status === 'active').length)],
    ['Pending requests', String(myReq.filter((r) => r.status === 'pending').length)],
  ]
  return (
    <div className="mt-3 flex flex-col gap-3">
      {me.kycStatus !== 'approved' && (
        <button onClick={onApproveKyc} className="flex items-center justify-center gap-2 bg-success text-white py-3 rounded-xl text-[13px] font-bold">
          <BadgeCheck size={16} /> Approve KYC now
        </button>
      )}
      <div className="card divide-y divide-line overflow-hidden">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-4 py-3">
            <span className="text-[12.5px] text-muted">{k}</span>
            <span className={`text-[13px] font-semibold text-text text-right max-w-[60%] truncate ${k === 'Credit score' ? scoreColor : ''}`}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsEditor({ cfg, userId, onSet }: { cfg: Record<string, any>; userId: string; onSet: (k: string, v: any) => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ 'Transfers & UPI': true })
  return (
    <div className="mt-3 flex flex-col gap-2.5">
      <p className="text-[11.5px] text-muted">Edits save instantly. {TOTAL_USER_PARAMS} parameters control this account's behaviour.</p>
      {USER_SETTINGS_SCHEMA.map((g) => {
        const isOpen = open[g.title] ?? false
        return (
          <div key={g.title} className="card overflow-hidden">
            <button onClick={() => setOpen({ ...open, [g.title]: !isOpen })} className="w-full flex items-center justify-between px-4 py-3.5">
              <span className="text-[13px] font-bold text-text">{g.title}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted">{g.fields.length}<ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} /></span>
            </button>
            {isOpen && (
              <div className="divide-y divide-line border-t border-line">
                {g.fields.map((f) => (
                  <div key={f.key} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-text">{f.label}</p>
                      {f.hint && <p className="text-[10.5px] text-muted mt-0.5">{f.hint}</p>}
                    </div>
                    <div className="shrink-0">
                      {f.type === 'bool' && (
                        <button onClick={() => onSet(f.key, !cfg[f.key])} className={`relative w-11 rounded-full transition-colors ${cfg[f.key] ? 'bg-primary' : 'bg-line'}`} style={{ height: 26 }}>
                          <span className={`absolute top-0.5 rounded-full bg-white shadow transition-all ${cfg[f.key] ? 'left-[22px]' : 'left-0.5'}`} style={{ width: 22, height: 22 }} />
                        </button>
                      )}
                      {f.type === 'num' && (
                        <div className="flex items-center gap-1">
                          {f.rupee && <span className="text-[12px] text-muted">₹</span>}
                          <input
                            type="number"
                            inputMode="decimal"
                            value={cfg[f.key] ?? ''}
                            min={f.min}
                            max={f.max}
                            step={f.step ?? 1}
                            onChange={(e) => {
                              const v = e.target.value
                              if (v === '') return
                              onSet(f.key, Number(v))
                            }}
                            onBlur={(e) => { if (e.target.value === '') onSet(f.key, 0) }}
                            className="w-24 bg-surface2 border border-line rounded-lg px-2.5 py-1.5 text-[12.5px] text-text text-right outline-none focus:border-primary"
                          />
                        </div>
                      )}
                      {f.type === 'select' && (
                        <div className="flex flex-wrap justify-end gap-1 max-w-[190px]">
                          {(f.options || []).map((o) => (
                            <button key={o} onClick={() => onSet(f.key, o)} className={`px-2 py-1 rounded-lg text-[10.5px] font-bold ${cfg[f.key] === o ? 'bg-primary text-white' : 'bg-surface2 text-muted'}`}>{o}</button>
                          ))}
                        </div>
                      )}
                      {f.type === 'text' && (
                        <input value={cfg[f.key] ?? ''} onChange={(e) => onSet(f.key, e.target.value)} placeholder="—" className="w-40 bg-surface2 border border-line rounded-lg px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
