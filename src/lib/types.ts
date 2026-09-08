export type Theme = 'amoled' | 'dark' | 'light'
export type KycStatus = 'pending' | 'approved' | 'rejected'
export type UserStatus = 'active' | 'blocked'
export type CardType = 'debit' | 'credit'
export type CardNetwork = 'Visa' | 'Mastercard' | 'RuPay'
export type CardStatus = 'active' | 'frozen' | 'blocked' | 'pending'

export interface Card {
  id: string
  userId?: string
  type: CardType
  number: string
  holderName: string
  expiry: string
  cvv: string
  network: CardNetwork
  status: CardStatus
  creditLimit?: number
  dueAmount?: number
  dueDate?: string
}

export interface FD {
  id: string
  userId?: string
  amount: number
  months: number
  rate: number
  createdAt: number
  maturityAt: number
  maturityValue: number
  status: 'active' | 'matured' | 'broken'
}

export interface User {
  id: string
  name: string
  phone: string
  email: string
  upiId: string
  accountNumber: string
  ifsc: string
  branch: string
  accountType: 'Savings' | 'Current'
  pin: string
  balance: number
  kycStatus: KycStatus
  status: UserStatus
  createdAt: number
  avatarHue: number
  rewards: number
  cards: Card[]
  fds: FD[]
}

export type TxnType =
  | 'transfer' | 'deposit' | 'withdrawal' | 'fee' | 'cashback'
  | 'emi' | 'card_spend' | 'card_payment' | 'loan_disbursal'
  | 'adjustment' | 'interest' | 'welcome' | 'fd_open' | 'fd_break'

export interface Transaction {
  id: string
  refNo: string
  type: TxnType
  amount: number
  fromUserId: string | null
  toUserId: string | null
  note?: string
  method: 'upi' | 'account' | 'card' | 'admin'
  status: 'success' | 'failed' | 'rejected'
  fee?: number
  createdAt: number
}

export type ReqKind = 'deposit' | 'withdrawal' | 'loan' | 'kyc' | 'card'

export interface ApprovalRequest {
  id: string
  kind: ReqKind
  userId: string
  amount?: number
  meta?: any
  status: 'pending' | 'approved' | 'rejected'
  createdAt: number
  decidedAt?: number
  note?: string
}

export interface Loan {
  id: string
  userId: string
  amount: number
  months: number
  rate: number
  emi: number
  status: 'pending' | 'active' | 'closed' | 'rejected'
  createdAt: number
  disbursedAt?: number
  emisPaid: number
  totalPayable: number
}

export interface MoneyRequest {
  id: string
  fromUserId: string
  toUserId: string
  amount: number
  note?: string
  status: 'pending' | 'paid' | 'declined'
  createdAt: number
}

export interface Notif {
  id: string
  userId: string
  title: string
  body: string
  read: boolean
  createdAt: number
}

export interface Settings {
  bankName: string
  upiDomain: string
  ifscPrefix: string
  branch: string
  txnFeePct: number
  txnFeeMin: number
  txnFeeCap: number
  cashbackPct: number
  welcomeBonus: number
  minBalance: number
  perTxnLimit: number
  dailyLimit: number
  loanInterestRate: number
  loanProcessingPct: number
  minLoanAmount: number
  maxLoanAmount: number
  maxLoanTenure: number
  creditCardInterestRate: number
  savingsInterestRate: number
  fdInterestRate: number
  defaultCreditLimit: number
}

export interface Session {
  role: 'user' | 'admin'
  userId: string
}

export interface Toast {
  id: string
  msg: string
  type: 'success' | 'error' | 'info'
}

export interface Res {
  ok: boolean
  error?: string
}
