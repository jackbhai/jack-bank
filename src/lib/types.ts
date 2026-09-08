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
  | 'mf_buy' | 'mf_redeem' | 'stock_buy' | 'stock_sell' | 'gateway_pay'

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
  gatewayFeePct: number
}

export interface KycDoc {
  pan: string
  aadhaar_masked: string
  dob: string
  gender: string
  occupation: string
  income_band: string
  address: string
  city: string
  state: string
  pincode: string
  nominee_name: string
  nominee_relation: string
  status: string
}

export type FundCategory = 'equity' | 'debt' | 'hybrid' | 'index' | 'elss'

export interface MfFund {
  id: string
  code: string
  name: string
  fundHouse: string
  category: FundCategory
  risk: string
  nav: number
  prevNav: number
  aum: number
  expenseRatio: number
  minLumpsum: number
  minSip: number
  ret1y: number
  ret3y: number
  description: string
}

export interface MfHolding {
  id: string
  userId: string
  fundId: string
  units: number
  invested: number
  avgNav: number
  sipActive: boolean
  sipAmount: number | null
  sipDay: number | null
}

export interface MfTxn {
  id: string
  userId: string
  fundId: string
  kind: 'lumpsum' | 'sip' | 'redeem'
  units: number
  nav: number
  amount: number
  createdAt: number
}

export interface Stock {
  id: string
  symbol: string
  name: string
  sector: string
  kind: 'equity' | 'crypto'
  price: number
  prevClose: number
  dayOpen: number
  dayHigh: number
  dayLow: number
  volume: number
  marketCap: number
  pe: number
  high52w: number
  low52w: number
  history: { t: number; p: number }[]
}

export interface StockOrder {
  id: string
  userId: string
  stockId: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  qty: number
  limitPrice: number | null
  status: 'open' | 'filled' | 'cancelled'
  filledQty: number
  avgPrice: number
  createdAt: number
}

export interface StockHolding {
  id: string
  userId: string
  stockId: string
  qty: number
  avgPrice: number
}

export interface StockTrade {
  id: string
  userId: string
  stockId: string
  side: 'buy' | 'sell'
  qty: number
  price: number
  amount: number
  createdAt: number
}

export interface Merchant {
  id: string
  name: string
  appName: string
  callbackUrl: string | null
  apiKey: string
  apiSecret: string
  settlement: number
  status: string
  createdAt: number
}

export interface GatewayOrder {
  id: string
  merchantId: string
  orderRef: string
  amount: number
  currency: string
  note: string | null
  status: 'pending' | 'paid' | 'failed' | 'expired'
  payerId: string | null
  payToken: string
  createdAt: number
  paidAt: number | null
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
