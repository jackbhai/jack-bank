import { create } from 'zustand'
import { supabase } from './lib/supabase'
import type {
  ApprovalRequest,
  Card,
  FD,
  Loan,
  MoneyRequest,
  Notif,
  Res,
  Session,
  Settings,
  Theme,
  Transaction,
  User,
} from './lib/types'
import { DEFAULT_SETTINGS } from './lib/seed'
import { uid } from './lib/utils'
import { fxSuccess, fxError, fxTap } from './lib/fx'

export interface Announcement {
  id: string
  text: string
  createdAt: number
}

export interface DirectoryUser {
  id: string
  name: string
  upiId: string
  avatarHue: number
  status: string
}

/* ---------- mappers ---------- */
const num = (v: unknown): number => (v == null ? 0 : Number(v))

const mapUser = (p: any): User => ({
  id: p.id,
  name: p.name,
  phone: p.phone ?? '',
  email: p.email ?? '',
  upiId: p.upi_id,
  accountNumber: p.account_number,
  ifsc: p.ifsc ?? '',
  branch: p.branch ?? '',
  accountType: p.account_type ?? 'Savings',
  pin: p.pin ?? '',
  balance: num(p.balance),
  kycStatus: p.kyc_status ?? 'pending',
  status: p.status ?? 'active',
  createdAt: new Date(p.created_at).getTime(),
  avatarHue: p.avatar_hue ?? 260,
  rewards: p.rewards ?? 0,
  cards: [],
  fds: [],
})

const mapCard = (c: any): Card => ({
  id: c.id,
  userId: c.user_id,
  type: c.type,
  number: c.number,
  holderName: c.holder_name ?? '',
  expiry: c.expiry ?? '',
  cvv: c.cvv ?? '',
  network: c.network ?? 'Visa',
  status: c.status ?? 'active',
  creditLimit: c.credit_limit == null ? undefined : num(c.credit_limit),
  dueAmount: c.due_amount == null ? undefined : num(c.due_amount),
  dueDate: c.due_date ?? undefined,
})

const mapFd = (f: any): FD => ({
  id: f.id,
  userId: f.user_id,
  amount: num(f.amount),
  months: f.months,
  rate: num(f.rate),
  createdAt: new Date(f.created_at).getTime(),
  maturityAt: new Date(f.maturity_at).getTime(),
  maturityValue: num(f.maturity_value),
  status: f.status,
})

const mapLoan = (l: any): Loan => ({
  id: l.id,
  userId: l.user_id,
  amount: num(l.amount),
  months: l.months,
  rate: num(l.rate),
  emi: num(l.emi),
  status: l.status,
  createdAt: new Date(l.created_at).getTime(),
  disbursedAt: l.disbursed_at ? new Date(l.disbursed_at).getTime() : undefined,
  emisPaid: l.emis_paid ?? 0,
  totalPayable: num(l.total_payable),
})

const mapTxn = (t: any): Transaction => ({
  id: t.id,
  refNo: t.ref_no ?? '',
  type: t.type,
  amount: num(t.amount),
  fromUserId: t.from_user,
  toUserId: t.to_user,
  note: t.note ?? undefined,
  method: t.method ?? 'upi',
  status: t.status ?? 'success',
  fee: t.fee == null ? undefined : num(t.fee),
  createdAt: new Date(t.created_at).getTime(),
})

const mapReq = (r: any): ApprovalRequest => ({
  id: r.id,
  kind: r.kind,
  userId: r.user_id,
  amount: r.amount == null ? undefined : num(r.amount),
  meta: r.meta ?? undefined,
  status: r.status,
  createdAt: new Date(r.created_at).getTime(),
  decidedAt: r.decided_at ? new Date(r.decided_at).getTime() : undefined,
  note: r.note ?? undefined,
})

const mapMr = (m: any): MoneyRequest => ({
  id: m.id,
  fromUserId: m.from_user,
  toUserId: m.to_user,
  amount: num(m.amount),
  note: m.note ?? undefined,
  status: m.status,
  createdAt: new Date(m.created_at).getTime(),
})

const mapNotif = (n: any): Notif => ({
  id: n.id,
  userId: n.user_id,
  title: n.title,
  body: n.body ?? '',
  read: n.read,
  createdAt: new Date(n.created_at).getTime(),
})

const mapAnn = (a: any): Announcement => ({
  id: a.id,
  text: a.text,
  createdAt: new Date(a.created_at).getTime(),
})

const mapSettings = (s: any): Settings => ({
  bankName: s.bank_name,
  upiDomain: s.upi_domain,
  ifscPrefix: s.ifsc_prefix,
  branch: s.branch,
  txnFeePct: num(s.txn_fee_pct),
  txnFeeMin: num(s.txn_fee_min),
  txnFeeCap: num(s.txn_fee_cap),
  cashbackPct: num(s.cashback_pct),
  welcomeBonus: num(s.welcome_bonus),
  minBalance: num(s.min_balance),
  perTxnLimit: num(s.per_txn_limit),
  dailyLimit: num(s.daily_limit),
  loanInterestRate: num(s.loan_interest_rate),
  loanProcessingPct: num(s.loan_processing_pct),
  minLoanAmount: num(s.min_loan_amount),
  maxLoanAmount: num(s.max_loan_amount),
  maxLoanTenure: s.max_loan_tenure,
  creditCardInterestRate: num(s.credit_card_interest_rate),
  savingsInterestRate: num(s.savings_interest_rate),
  fdInterestRate: num(s.fd_interest_rate),
  defaultCreditLimit: num(s.default_credit_limit),
})

/* ---------- store ---------- */
interface BankState {
  booting: boolean
  ready: boolean
  session: Session | null
  directory: DirectoryUser[]
  settings: Settings | null
  users: User[]
  transactions: Transaction[]
  cards: Card[]
  fds: FD[]
  loans: Loan[]
  requests: ApprovalRequest[]
  moneyRequests: MoneyRequest[]
  notifications: Notif[]
  announcements: Announcement[]

  init: () => Promise<void>
  login: (email: string, password: string) => Promise<Res & { role?: string }>
  signup: (name: string, email: string, phone: string, password: string, pin: string) => Promise<Res & { authed?: boolean }>
  adminCreateUser: (email: string, password: string, name: string, phone: string, pin: string) => Promise<Res>
  logout: () => Promise<void>
  loadAll: () => Promise<void>
  stopRealtime: () => void
  startRealtime: () => void

  transfer: (amount: number, fromUserId: string, toUserId: string, method: 'upi' | 'account', note?: string) => Promise<Res>
  requestMoney: (fromUserId: string, toUserId: string, amount: number, note?: string) => Promise<Res>
  respondMoneyRequest: (reqId: string, action: 'pay' | 'decline') => Promise<Res>
  addMoneyRequest: (userId: string, amount: number, note?: string) => Promise<Res>
  withdrawRequest: (userId: string, amount: number, note?: string) => Promise<Res>
  applyLoan: (userId: string, amount: number, months: number, purpose: string) => Promise<Res>
  requestCard: (userId: string, cardType: 'debit' | 'credit', limit?: number) => Promise<Res>
  requestKyc: (userId: string) => Promise<Res>
  decideRequest: (reqId: string, approve: boolean) => Promise<Res>
  creditCardSpend: (userId: string, amount: number, note?: string) => Promise<Res>
  payCardBill: (userId: string, amount: number) => Promise<Res>
  setCardStatus: (userId: string, cardId: string, status: Card['status']) => Promise<Res>
  changePin: (userId: string, newPin: string) => Promise<Res>
  openFD: (userId: string, amount: number, months: number) => Promise<Res>
  breakFD: (userId: string, fdId: string) => Promise<Res>
  repayLoan: (userId: string, loanId: string) => Promise<Res>
  blockUser: (id: string) => Promise<Res>
  unblockUser: (id: string) => Promise<Res>
  adminAdjust: (userId: string, amount: number, note: string) => Promise<Res>
  addAnnouncement: (text: string) => Promise<Res>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  markNotifsRead: (userId: string) => Promise<void>
  resetBank: () => Promise<void>

  refreshUsers: () => Promise<void>
  refreshTxns: () => Promise<void>
  refreshCards: () => Promise<void>
  refreshFds: () => Promise<void>
  refreshLoans: () => Promise<void>
  refreshRequests: () => Promise<void>
  refreshMoneyRequests: () => Promise<void>
  refreshNotifs: () => Promise<void>
  refreshAnnouncements: () => Promise<void>
}

let realtime: ReturnType<typeof supabase.channel> | null = null

export const useBank = create<BankState>()((set, get) => ({
  booting: true,
  ready: false,
  session: null,
  directory: [],
  settings: null,
  users: [],
  transactions: [],
  cards: [],
  fds: [],
  loans: [],
  requests: [],
  moneyRequests: [],
  notifications: [],
  announcements: [],

  /* ---------------- loaders ---------------- */
  refreshUsers: async () => {
    const s = get()
    if (!s.session) return
    if (s.session.role === 'admin') {
      const { data } = await supabase.from('jb_profiles').select('*').order('name')
      set((st) => ({ users: (data ?? []).map(mapUser) }))
    } else {
      const [meRow, friends] = await Promise.all([
        supabase.from('jb_profiles').select('*').eq('id', s.session.userId).single(),
        supabase.rpc('jb_friends'),
      ])
      if (meRow.data) {
        const me = mapUser(meRow.data)
        const others = ((friends.data as any[]) ?? []).map(mapUser)
        set((st) => {
          const withCards = { ...me, cards: st.cards.filter((c) => c.userId === me.id), fds: st.fds.filter((f) => f.userId === me.id) }
          return { users: [withCards, ...others] }
        })
      }
    }
  },

  refreshTxns: async () => {
    const s = get()
    if (!s.session) return
    const q =
      s.session.role === 'admin'
        ? supabase.from('jb_transactions').select('*').order('created_at', { ascending: false }).limit(600)
        : supabase
            .from('jb_transactions')
            .select('*')
            .or(`from_user.eq.${s.session.userId},to_user.eq.${s.session.userId}`)
            .order('created_at', { ascending: false })
            .limit(400)
    const { data } = await q
    set({ transactions: (data ?? []).map(mapTxn) })
  },

  refreshCards: async () => {
    const s = get()
    if (!s.session) return
    const q =
      s.session.role === 'admin'
        ? supabase.from('jb_cards').select('*')
        : supabase.from('jb_cards').select('*').eq('user_id', s.session.userId)
    const { data } = await q
    const cards = (data ?? []).map(mapCard)
    set((st) => ({
      cards,
      users: st.users.map((u) => (u.id === s.session?.userId || s.session?.role === 'admin' ? { ...u, cards: cards.filter((c) => c.userId === u.id) } : u)),
    }))
  },

  refreshFds: async () => {
    const s = get()
    if (!s.session) return
    const q =
      s.session.role === 'admin'
        ? supabase.from('jb_fds').select('*')
        : supabase.from('jb_fds').select('*').eq('user_id', s.session.userId)
    const { data } = await q
    const fds = (data ?? []).map(mapFd)
    set((st) => ({
      fds,
      users: st.users.map((u) => (u.id === s.session?.userId || s.session?.role === 'admin' ? { ...u, fds: fds.filter((f) => f.userId === u.id) } : u)),
    }))
  },

  refreshLoans: async () => {
    const s = get()
    if (!s.session) return
    const q =
      s.session.role === 'admin'
        ? supabase.from('jb_loans').select('*').order('created_at', { ascending: false })
        : supabase.from('jb_loans').select('*').eq('user_id', s.session.userId).order('created_at', { ascending: false })
    const { data } = await q
    set({ loans: (data ?? []).map(mapLoan) })
  },

  refreshRequests: async () => {
    const s = get()
    if (!s.session) return
    const q =
      s.session.role === 'admin'
        ? supabase.from('jb_requests').select('*').order('created_at', { ascending: false })
        : supabase.from('jb_requests').select('*').eq('user_id', s.session.userId).order('created_at', { ascending: false })
    const { data } = await q
    set({ requests: (data ?? []).map(mapReq) })
  },

  refreshMoneyRequests: async () => {
    const s = get()
    if (!s.session) return
    const q =
      s.session.role === 'admin'
        ? supabase.from('jb_money_requests').select('*').order('created_at', { ascending: false })
        : supabase
            .from('jb_money_requests')
            .select('*')
            .or(`from_user.eq.${s.session.userId},to_user.eq.${s.session.userId}`)
            .order('created_at', { ascending: false })
    const { data } = await q
    set({ moneyRequests: (data ?? []).map(mapMr) })
  },

  refreshNotifs: async () => {
    const s = get()
    if (!s.session || s.session.role === 'admin') return
    const { data } = await supabase
      .from('jb_notifications')
      .select('*')
      .eq('user_id', s.session.userId)
      .order('created_at', { ascending: false })
      .limit(100)
    set({ notifications: (data ?? []).map(mapNotif) })
  },

  refreshAnnouncements: async () => {
    const { data } = await supabase.from('jb_announcements').select('*').order('created_at', { ascending: false }).limit(10)
    set({ announcements: (data ?? []).map(mapAnn) })
  },

  init: async () => {
    // public directory for login screen
    try {
      const { data: dir } = await supabase.rpc('jb_public_directory')
      set({ directory: (dir as any[])?.map((d) => ({ id: d.id, name: d.name, upiId: d.upi_id, avatarHue: d.avatar_hue, status: d.status })) ?? [] })
    } catch {
      /* ignore */
    }
    const { data: auth } = await supabase.auth.getSession()
    if (auth.session) {
      const uid = auth.session.user.id
      const { data: prof } = await supabase.from('jb_profiles').select('id, role').eq('id', uid).single()
      if (prof) {
        set({ session: { role: prof.role === 'admin' ? 'admin' : 'user', userId: uid } })
        await get().loadAll()
      }
    }
    supabase.auth.onAuthStateChange((_e, sess) => {
      if (!sess && get().session) {
        get().stopRealtime()
        set({ session: null, ready: false, users: [], transactions: [], cards: [], fds: [], loans: [], requests: [], moneyRequests: [], notifications: [], announcements: [] })
      }
    })
    set({ booting: false })
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: error.message }
    const uid = data.user.id
    const { data: prof } = await supabase.from('jb_profiles').select('id, role, status').eq('id', uid).single()
    if (!prof) return { ok: false, error: 'Account not found' }
    if (prof.status === 'blocked') return { ok: false, error: 'Account blocked. Contact the owner.' }
    const role = prof.role === 'admin' ? 'admin' : 'user'
    set({ session: { role, userId: uid } })
    await get().loadAll()
    return { ok: true, role }
  },

  signup: async (name, email, phone, password, pin) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone, pin } },
    })
    if (error) return { ok: false, error: error.message }
    if (data.session) {
      const uid = data.user!.id
      set({ session: { role: 'user', userId: uid } })
      await get().loadAll()
      return { ok: true, authed: true }
    }
    return { ok: true, authed: false }
  },

  adminCreateUser: async (email, password, name, phone, pin) => {
    const { data, error } = await supabase.rpc('jb_admin_create_user', {
      p_email: email, p_password: password, p_name: name, p_phone: phone || null, p_pin: pin || null,
    })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    return { ok: true }
  },

  logout: async () => {
    await supabase.auth.signOut()
    get().stopRealtime()
    set({ session: null, ready: false, users: [], transactions: [], cards: [], fds: [], loans: [], requests: [], moneyRequests: [], notifications: [], announcements: [] })
  },

  loadAll: async () => {
    const s = get()
    if (!s.session) return
    const { data: settings } = await supabase.from('jb_settings').select('*').single()
    if (settings) set({ settings: mapSettings(settings) })
    await Promise.all([
      s.refreshUsers(), s.refreshTxns(), s.refreshLoans(), s.refreshRequests(),
      s.refreshMoneyRequests(), s.refreshNotifs(), s.refreshAnnouncements(),
    ])
    await Promise.all([s.refreshCards(), s.refreshFds()])
    await s.refreshUsers()
    set({ ready: true })
    get().startRealtime()
  },

  stopRealtime: () => {
    if (realtime) {
      supabase.removeChannel(realtime)
      realtime = null
    }
  },

  startRealtime: () => {
    get().stopRealtime()
    realtime = supabase
      .channel('jack-bank-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jb_transactions' }, () => get().refreshTxns())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jb_profiles' }, () => get().refreshUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jb_notifications' }, () => get().refreshNotifs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jb_requests' }, () => get().refreshRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jb_money_requests' }, () => get().refreshMoneyRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jb_cards' }, () => get().refreshCards())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jb_fds' }, () => get().refreshFds())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jb_loans' }, () => get().refreshLoans())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jb_announcements' }, () => get().refreshAnnouncements())
      .subscribe()
  },

  /* ---------------- actions ---------------- */
  transfer: async (amount, fromUserId, toUserId, method, note) => {
    const { data, error } = await supabase.rpc('jb_transfer_money', {
      p_from: fromUserId,
      p_to: toUserId,
      p_amount: amount,
      p_note: note || null,
      p_method: method,
    })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await Promise.all([get().refreshTxns(), get().refreshUsers()])
    return { ok: true }
  },

  requestMoney: async (fromUserId, toUserId, amount, note) => {
    const { data, error } = await supabase.rpc('jb_request_money', { p_from: fromUserId, p_to: toUserId, p_amount: amount, p_note: note || null })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await get().refreshMoneyRequests()
    return { ok: true }
  },

  respondMoneyRequest: async (reqId, action) => {
    const { data, error } = await supabase.rpc('jb_respond_money_request', { p_req: reqId, p_action: action })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await Promise.all([get().refreshMoneyRequests(), get().refreshTxns(), get().refreshUsers()])
    return { ok: true }
  },

  addMoneyRequest: async (userId, amount, note) => {
    const { data, error } = await supabase.rpc('jb_add_money_request', { p_user: userId, p_amount: amount, p_note: note || null })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await get().refreshRequests()
    return { ok: true }
  },

  withdrawRequest: async (userId, amount, note) => {
    const { data, error } = await supabase.rpc('jb_withdraw_request', { p_user: userId, p_amount: amount, p_note: note || null })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await get().refreshRequests()
    return { ok: true }
  },

  applyLoan: async (userId, amount, months, purpose) => {
    const { data, error } = await supabase.rpc('jb_apply_loan', { p_user: userId, p_amount: amount, p_months: months, p_purpose: purpose || null })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await get().refreshRequests()
    return { ok: true }
  },

  requestCard: async (userId, cardType, limit) => {
    const { data, error } = await supabase.rpc('jb_request_card', { p_user: userId, p_card_type: cardType, p_limit: limit ?? null })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await get().refreshRequests()
    return { ok: true }
  },

  requestKyc: async (userId) => {
    const { data, error } = await supabase.rpc('jb_request_kyc', { p_user: userId })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await get().refreshRequests()
    return { ok: true }
  },

  decideRequest: async (reqId, approve) => {
    const { data, error } = await supabase.rpc('jb_decide_request', { p_req: reqId, p_approve: approve })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await Promise.all([get().refreshRequests(), get().refreshTxns(), get().refreshUsers(), get().refreshCards(), get().refreshLoans()])
    return { ok: true }
  },

  creditCardSpend: async (userId, amount, note) => {
    const { data, error } = await supabase.rpc('jb_credit_card_spend', { p_user: userId, p_amount: amount, p_note: note || null })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await Promise.all([get().refreshCards(), get().refreshTxns()])
    return { ok: true }
  },

  payCardBill: async (userId, amount) => {
    const { data, error } = await supabase.rpc('jb_pay_card_bill', { p_user: userId, p_amount: amount })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await Promise.all([get().refreshCards(), get().refreshUsers(), get().refreshTxns()])
    return { ok: true }
  },

  setCardStatus: async (userId, cardId, status) => {
    const { data, error } = await supabase.rpc('jb_set_card_status', { p_user: userId, p_card: cardId, p_status: status })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await get().refreshCards()
    return { ok: true }
  },

  changePin: async (userId, newPin) => {
    const { data, error } = await supabase.rpc('jb_change_pin', { p_user: userId, p_pin: newPin })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    return { ok: true }
  },

  openFD: async (userId, amount, months) => {
    const { data, error } = await supabase.rpc('jb_open_fd', { p_user: userId, p_amount: amount, p_months: months })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await Promise.all([get().refreshFds(), get().refreshUsers(), get().refreshTxns()])
    return { ok: true }
  },

  breakFD: async (userId, fdId) => {
    const { data, error } = await supabase.rpc('jb_break_fd', { p_user: userId, p_fd: fdId })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await Promise.all([get().refreshFds(), get().refreshUsers(), get().refreshTxns()])
    return { ok: true }
  },

  repayLoan: async (userId, loanId) => {
    const { data, error } = await supabase.rpc('jb_repay_loan', { p_user: userId, p_loan: loanId })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await Promise.all([get().refreshLoans(), get().refreshUsers(), get().refreshTxns()])
    return { ok: true }
  },

  blockUser: async (id) => {
    const { error } = await supabase.rpc('jb_block_user', { p_user: id })
    if (error) return { ok: false, error: error.message }
    await get().refreshUsers()
    return { ok: true }
  },

  unblockUser: async (id) => {
    const { error } = await supabase.rpc('jb_unblock_user', { p_user: id })
    if (error) return { ok: false, error: error.message }
    await get().refreshUsers()
    return { ok: true }
  },

  adminAdjust: async (userId, amount, note) => {
    const { data, error } = await supabase.rpc('jb_admin_adjust', { p_user: userId, p_amount: amount, p_note: note || null })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await Promise.all([get().refreshUsers(), get().refreshTxns()])
    return { ok: true }
  },

  addAnnouncement: async (text) => {
    const { data, error } = await supabase.rpc('jb_add_announcement', { p_text: text })
    if (error) return { ok: false, error: error.message }
    const j = data as any
    if (!j.ok) return { ok: false, error: j.error }
    await get().refreshAnnouncements()
    return { ok: true }
  },

  updateSettings: async (patch) => {
    const snake: Record<string, unknown> = {}
    const map: Record<string, string> = {
      bankName: 'bank_name', upiDomain: 'upi_domain', ifscPrefix: 'ifsc_prefix', branch: 'branch',
      txnFeePct: 'txn_fee_pct', txnFeeMin: 'txn_fee_min', txnFeeCap: 'txn_fee_cap', cashbackPct: 'cashback_pct',
      welcomeBonus: 'welcome_bonus', minBalance: 'min_balance', perTxnLimit: 'per_txn_limit', dailyLimit: 'daily_limit',
      loanInterestRate: 'loan_interest_rate', loanProcessingPct: 'loan_processing_pct', minLoanAmount: 'min_loan_amount',
      maxLoanAmount: 'max_loan_amount', maxLoanTenure: 'max_loan_tenure', creditCardInterestRate: 'credit_card_interest_rate',
      savingsInterestRate: 'savings_interest_rate', fdInterestRate: 'fd_interest_rate', defaultCreditLimit: 'default_credit_limit',
    }
    for (const [k, v] of Object.entries(patch)) if (map[k]) snake[map[k]] = v
    if (Object.keys(snake).length) {
      await supabase.from('jb_settings').update(snake).eq('id', 1)
      const { data } = await supabase.from('jb_settings').select('*').single()
      if (data) set({ settings: mapSettings(data) })
    }
  },

  markNotifsRead: async (userId) => {
    await supabase.rpc('jb_mark_notifs_read', { p_user: userId })
    get().refreshNotifs()
  },

  resetBank: async () => {
    await supabase.rpc('jb_reset_demo')
    await get().loadAll()
  },
}))

/* ---------- theme store ---------- */
const themeKey = 'jack-bank-theme'
interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
}
export const useTheme = create<ThemeState>((set) => ({
  theme: (localStorage.getItem(themeKey) as Theme) || 'amoled',
  setTheme: (t) => {
    localStorage.setItem(themeKey, t)
    set({ theme: t })
    document.documentElement.setAttribute('data-theme', t)
  },
}))

/* ---------- toast store ---------- */
interface ToastState {
  toasts: { id: string; msg: string; type: 'success' | 'error' | 'info' }[]
  toast: (msg: string, type?: 'success' | 'error' | 'info') => void
  dismiss: (id: string) => void
}
export const useToast = create<ToastState>((set) => ({
  toasts: [],
  toast: (msg, type = 'info') => {
    const id = uid()
    set((s) => ({ toasts: [...s.toasts, { id, msg, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200)
    if (type === 'success') fxSuccess()
    else if (type === 'error') fxError()
    else fxTap()
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
