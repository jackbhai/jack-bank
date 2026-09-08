import type {
  ApprovalRequest,
  Card,
  FD,
  Loan,
  MoneyRequest,
  Notif,
  Settings,
  Transaction,
  User,
} from './types'
import { genRefNo, uid } from './utils'

export const DEFAULT_SETTINGS: Settings = {
  bankName: 'Jack Bank',
  upiDomain: 'jackbank',
  ifscPrefix: 'JACK',
  branch: 'Jack Bank, Saket, New Delhi',
  txnFeePct: 0.5,
  txnFeeMin: 1,
  txnFeeCap: 50,
  cashbackPct: 0.5,
  welcomeBonus: 500,
  minBalance: 0,
  perTxnLimit: 50000,
  dailyLimit: 200000,
  loanInterestRate: 12,
  loanProcessingPct: 1,
  minLoanAmount: 1000,
  maxLoanAmount: 200000,
  maxLoanTenure: 24,
  creditCardInterestRate: 36,
  savingsInterestRate: 3.5,
  fdInterestRate: 7,
  defaultCreditLimit: 50000,
}

const ADMIN_ID = 'admin'
const ADMIN_PIN = '2468'

interface SeedPerson {
  id: string
  name: string
  phone: string
  email: string
  handle: string
  balance: number
  hue: number
  accountType: 'Savings' | 'Current'
}

const PEOPLE: SeedPerson[] = [
  { id: 'u1', name: 'Aarav Sharma', phone: '9876543210', email: 'aarav@jackbank.app', handle: 'aarav', balance: 124500, hue: 258, accountType: 'Savings' },
  { id: 'u2', name: 'Priya Verma', phone: '9812345678', email: 'priya@jackbank.app', handle: 'priya', balance: 83200, hue: 325, accountType: 'Savings' },
  { id: 'u3', name: 'Rohan Mehta', phone: '9898989898', email: 'rohan@jackbank.app', handle: 'rohan', balance: 45200, hue: 200, accountType: 'Current' },
  { id: 'u4', name: 'Sneha Iyer', phone: '9765432109', email: 'sneha@jackbank.app', handle: 'sneha', balance: 96000, hue: 155, accountType: 'Savings' },
  { id: 'u5', name: 'Kabir Khan', phone: '9999999999', email: 'kabir@jackbank.app', handle: 'kabir', balance: 17800, hue: 30, accountType: 'Savings' },
]

const randDigits = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('')

const cardNumber = (prefix: string) => {
  const body = randDigits(12)
  return `${prefix}${body}`.replace(/(.{4})/g, '$1 ').trim()
}

const expiry = (months: number) => {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${mm}/${String(d.getFullYear()).slice(-2)}`
}

const DEBIT_PREFIX = '4539'
const CREDIT_PREFIX = '5408'

const NETWORKS: Card['network'][] = ['Visa', 'Mastercard', 'RuPay']

export function buildSeed() {
  const users: User[] = []
  const transactions: Transaction[] = []
  const loans: Loan[] = []
  const requests: ApprovalRequest[] = []
  const moneyRequests: MoneyRequest[] = []
  const notifs: Notif[] = []
  const announcements: { id: string; text: string; createdAt: number }[] = []

  const day = 86400000
  const now = Date.now()

  const t = (
    fromUserId: string | null,
    toUserId: string | null,
    type: Transaction['type'],
    amount: number,
    opts: Partial<Transaction> = {},
  ) => {
    transactions.push({
      id: uid(),
      refNo: genRefNo(),
      type,
      amount,
      fromUserId,
      toUserId,
      method: opts.method || 'upi',
      status: 'success',
      createdAt: opts.createdAt || now,
      note: opts.note,
      fee: opts.fee,
    })
  }

  // ---- users + cards ----
  for (let i = 0; i < PEOPLE.length; i++) {
    const p = PEOPLE[i]
    const upiId = `${p.handle}@${DEFAULT_SETTINGS.upiDomain}`
    const accountNumber = '1000' + randDigits(8)
    const ifsc = `${DEFAULT_SETTINGS.ifscPrefix}0${randDigits(6)}`

    const debit: Card = {
      id: uid(),
      type: 'debit',
      number: cardNumber(DEBIT_PREFIX),
      holderName: p.name.toUpperCase(),
      expiry: expiry(12 + ((i * 7) % 30)),
      cvv: randDigits(3),
      network: NETWORKS[i % 3],
      status: 'active',
    }
    const credit: Card = {
      id: uid(),
      type: 'credit',
      number: cardNumber(CREDIT_PREFIX),
      holderName: p.name.toUpperCase(),
      expiry: expiry(20 + ((i * 5) % 24)),
      cvv: randDigits(3),
      network: NETWORKS[(i + 1) % 3],
      status: 'active',
      creditLimit: DEFAULT_SETTINGS.defaultCreditLimit,
      dueAmount: i % 2 === 0 ? 5000 + i * 1000 : 0,
      dueDate: new Date(now + 8 * day).toISOString().slice(0, 10),
    }

    users.push({
      id: p.id,
      name: p.name,
      phone: p.phone,
      email: p.email,
      upiId,
      accountNumber,
      ifsc,
      branch: DEFAULT_SETTINGS.branch,
      accountType: p.accountType,
      pin: '1234',
      balance: p.balance,
      kycStatus: i === 4 ? 'pending' : 'approved',
      status: 'active',
      createdAt: now - 60 * day - i * 7 * day,
      avatarHue: p.hue,
      rewards: 120 + i * 65,
      cards: [debit, credit],
      fds: [],
    })
  }

  // ---- loans ----
  const loan1: Loan = {
    id: uid(),
    userId: 'u2',
    amount: 25000,
    months: 12,
    rate: DEFAULT_SETTINGS.loanInterestRate,
    emi: 2221,
    status: 'active',
    createdAt: now - 120 * day,
    disbursedAt: now - 119 * day,
    emisPaid: 4,
    totalPayable: 26652,
  }
  const loan2: Loan = {
    id: uid(),
    userId: 'u4',
    amount: 100000,
    months: 24,
    rate: DEFAULT_SETTINGS.loanInterestRate,
    emi: 4707,
    status: 'active',
    createdAt: now - 200 * day,
    disbursedAt: now - 199 * day,
    emisPaid: 7,
    totalPayable: 112968,
  }
  loans.push(loan1, loan2)

  // ---- FDs ----
  const fd1: FD = {
    id: uid(),
    amount: 50000,
    months: 12,
    rate: DEFAULT_SETTINGS.fdInterestRate,
    createdAt: now - 100 * day,
    maturityAt: now + 265 * day,
    maturityValue: 53500,
    status: 'active',
  }
  users[1].fds.push(fd1)
  users[3].fds.push({
    id: uid(),
    amount: 100000,
    months: 24,
    rate: DEFAULT_SETTINGS.fdInterestRate,
    createdAt: now - 50 * day,
    maturityAt: now + 680 * day,
    maturityValue: 114000,
    status: 'active',
  })

  // ---- transactions history ----
  const mk = (i: number) => now - i * day - Math.floor(Math.random() * 8) * 3600000
  t(null, 'u1', 'deposit', 50000, { method: 'admin', createdAt: mk(35), note: 'Initial deposit' })
  t(null, 'u2', 'deposit', 40000, { method: 'admin', createdAt: mk(33), note: 'Initial deposit' })
  t(null, 'u3', 'deposit', 30000, { method: 'admin', createdAt: mk(31), note: 'Initial deposit' })
  t(null, 'u4', 'deposit', 45000, { method: 'admin', createdAt: mk(30), note: 'Initial deposit' })
  t(null, 'u5', 'deposit', 15000, { method: 'admin', createdAt: mk(28), note: 'Initial deposit' })
  t(null, 'u1', 'welcome', 500, { createdAt: mk(34), note: 'Welcome bonus' })
  t(null, 'u2', 'welcome', 500, { createdAt: mk(33), note: 'Welcome bonus' })
  t(null, 'u3', 'welcome', 500, { createdAt: mk(31), note: 'Welcome bonus' })
  t(null, 'u4', 'welcome', 500, { createdAt: mk(30), note: 'Welcome bonus' })
  t(null, 'u5', 'welcome', 500, { createdAt: mk(28), note: 'Welcome bonus' })
  t(null, 'u2', 'loan_disbursal', 25000, { createdAt: mk(119), note: 'Personal loan disbursed' })
  t(null, 'u4', 'loan_disbursal', 100000, { createdAt: mk(199), note: 'Personal loan disbursed' })

  t('u1', 'u2', 'transfer', 2500, { createdAt: mk(20), note: 'Movie tickets', method: 'upi' })
  t('u2', 'u1', 'transfer', 1200, { createdAt: mk(19), note: 'Dinner split', method: 'upi' })
  t('u1', 'u3', 'transfer', 4000, { createdAt: mk(17), note: 'Trip booking', method: 'upi' })
  t('u3', 'u4', 'transfer', 1500, { createdAt: mk(15), note: 'Gift contribution', method: 'upi' })
  t('u4', 'u1', 'transfer', 6000, { createdAt: mk(12), note: 'Rent share', method: 'upi' })
  t('u2', 'u5', 'transfer', 800, { createdAt: mk(10), note: 'Chai + snacks', method: 'upi' })
  t('u5', 'u2', 'transfer', 1000, { createdAt: mk(9), note: 'Recharge', method: 'upi' })
  t('u1', 'u4', 'transfer', 3500, { createdAt: mk(6), note: 'Concert tickets', method: 'upi' })
  t('u3', 'u1', 'transfer', 2200, { createdAt: mk(4), note: 'Fuel share', method: 'upi' })
  t('u2', 'u3', 'transfer', 900, { createdAt: mk(3), note: 'Cake', method: 'upi' })

  t('u2', null, 'emi', 2221, { createdAt: mk(100), note: 'Loan EMI', method: 'account' })
  t('u2', null, 'emi', 2221, { createdAt: mk(70), note: 'Loan EMI', method: 'account' })
  t('u2', null, 'emi', 2221, { createdAt: mk(40), note: 'Loan EMI', method: 'account' })
  t('u2', null, 'emi', 2221, { createdAt: mk(10), note: 'Loan EMI', method: 'account' })
  t('u4', null, 'emi', 4707, { createdAt: mk(170), note: 'Loan EMI', method: 'account' })
  t('u4', null, 'emi', 4707, { createdAt: mk(140), note: 'Loan EMI', method: 'account' })
  t('u4', null, 'emi', 4707, { createdAt: mk(110), note: 'Loan EMI', method: 'account' })

  t('u1', null, 'card_spend', 12999, { createdAt: mk(8), note: 'Headphones', method: 'card' })
  t('u1', null, 'card_payment', 12999, { createdAt: mk(7), note: 'Credit card bill', method: 'account' })
  t('u4', null, 'card_spend', 8499, { createdAt: mk(5), note: 'Shoes', method: 'card' })

  t('u1', null, 'withdrawal', 3000, { createdAt: mk(2), note: 'ATM withdrawal', method: 'account' })

  t(null, 'u1', 'interest', 34, { createdAt: mk(1), note: 'Savings interest', method: 'account' })
  t(null, 'u1', 'cashback', 45, { createdAt: mk(1), note: 'Cashback on transfers', method: 'account' })
  t(null, 'u1', 'fee', 8, { createdAt: mk(1), note: 'Transaction fee', method: 'account' })

  // ---- pending approval requests ----
  requests.push(
    {
      id: uid(),
      kind: 'deposit',
      userId: 'u5',
      amount: 10000,
      status: 'pending',
      createdAt: now - 2 * 3600000,
      note: 'Add money via UPI',
    },
    {
      id: uid(),
      kind: 'withdrawal',
      userId: 'u3',
      amount: 5000,
      status: 'pending',
      createdAt: now - 5 * 3600000,
      note: 'Withdraw to bank',
    },
    {
      id: uid(),
      kind: 'loan',
      userId: 'u1',
      amount: 60000,
      meta: { months: 12, purpose: 'New laptop' },
      status: 'pending',
      createdAt: now - 8 * 3600000,
    },
    {
      id: uid(),
      kind: 'kyc',
      userId: 'u5',
      status: 'pending',
      createdAt: now - 20 * 3600000,
      note: 'KYC documents uploaded',
    },
    {
      id: uid(),
      kind: 'card',
      userId: 'u2',
      meta: { cardType: 'credit', requestedLimit: 75000 },
      status: 'pending',
      createdAt: now - 26 * 3600000,
    },
  )

  // ---- money requests ----
  moneyRequests.push({
    id: uid(),
    fromUserId: 'u2',
    toUserId: 'u1',
    amount: 1500,
    note: 'Trip contribution',
    status: 'pending',
    createdAt: now - 4 * 3600000,
  })

  // ---- notifications ----
  notifs.push(
    {
      id: uid(),
      userId: 'u1',
      title: 'Money received',
      body: 'You received ₹3,500 from Sneha Iyer',
      read: false,
      createdAt: now - 6 * day * 24 * 3600000 * 0.2,
    },
    {
      id: uid(),
      userId: 'u1',
      title: 'Cashback credited',
      body: '₹45 cashback added to your account',
      read: false,
      createdAt: now - day,
    },
    {
      id: uid(),
      userId: 'u1',
      title: 'Loan offer',
      body: 'You are eligible for a personal loan up to ₹1,00,000',
      read: true,
      createdAt: now - 3 * day,
    },
  )

  announcements.push({
    id: uid(),
    text: 'Welcome to Jack Bank — your friends-only virtual bank. Add money, trade with friends, and manage your cards!',
    createdAt: now - 2 * day,
  })

  return {
    users,
    transactions,
    loans,
    requests,
    moneyRequests,
    notifs,
    announcements,
    admin: { id: ADMIN_ID, pin: ADMIN_PIN },
  }
}
