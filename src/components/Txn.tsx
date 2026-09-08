import {
  ArrowUpRight,
  ArrowDownLeft,
  Landmark,
  Banknote,
  PiggyBank,
  Wallet,
  Receipt,
  TrendingUp,
  Gift,
  Percent,
  CreditCard,
  BadgePercent,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'
import type { TxnType } from '../lib/types'

export function txnMeta(type: TxnType): { label: string; Icon: LucideIcon; cls: string } {
  switch (type) {
    case 'transfer':
      return { label: 'Transfer', Icon: ArrowUpRight, cls: 'bg-primary/12 text-primary' }
    case 'deposit':
      return { label: 'Add Money', Icon: ArrowDownLeft, cls: 'bg-success/12 text-success' }
    case 'withdrawal':
      return { label: 'Withdrawal', Icon: Banknote, cls: 'bg-danger/12 text-danger' }
    case 'fee':
      return { label: 'Transaction Fee', Icon: Percent, cls: 'bg-warning/12 text-warning' }
    case 'cashback':
      return { label: 'Cashback', Icon: BadgePercent, cls: 'bg-accent/12 text-accent' }
    case 'emi':
      return { label: 'Loan EMI', Icon: Receipt, cls: 'bg-danger/12 text-danger' }
    case 'card_spend':
      return { label: 'Card Spend', Icon: CreditCard, cls: 'bg-danger/12 text-danger' }
    case 'card_payment':
      return { label: 'Card Bill', Icon: CreditCard, cls: 'bg-success/12 text-success' }
    case 'loan_disbursal':
      return { label: 'Loan', Icon: Landmark, cls: 'bg-primary/12 text-primary' }
    case 'adjustment':
      return { label: 'Adjustment', Icon: SlidersHorizontal, cls: 'bg-warning/12 text-warning' }
    case 'interest':
      return { label: 'Interest', Icon: TrendingUp, cls: 'bg-success/12 text-success' }
    case 'welcome':
      return { label: 'Welcome Bonus', Icon: Gift, cls: 'bg-accent/12 text-accent' }
    case 'fd_open':
      return { label: 'FD Booked', Icon: PiggyBank, cls: 'bg-primary/12 text-primary' }
    case 'fd_break':
      return { label: 'FD Broken', Icon: Wallet, cls: 'bg-warning/12 text-warning' }
    case 'mf_buy':
      return { label: 'MF Invested', Icon: TrendingUp, cls: 'bg-primary/12 text-primary' }
    case 'mf_redeem':
      return { label: 'MF Redeemed', Icon: TrendingUp, cls: 'bg-success/12 text-success' }
    case 'stock_buy':
      return { label: 'Stock Bought', Icon: TrendingUp, cls: 'bg-primary/12 text-primary' }
    case 'stock_sell':
      return { label: 'Stock Sold', Icon: TrendingUp, cls: 'bg-success/12 text-success' }
    case 'gateway_pay':
      return { label: 'Merchant Pay', Icon: Receipt, cls: 'bg-accent/12 text-accent' }
    case 'skin_buy':
      return { label: 'Skin Purchase', Icon: BadgePercent, cls: 'bg-primary/12 text-primary' }
    default:
      return { label: 'Transaction', Icon: Receipt, cls: 'bg-surface2 text-muted' }
  }
}

export function TxnIcon({ type }: { type: TxnType }) {
  const { Icon, cls } = txnMeta(type)
  return (
    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${cls}`}>
      <Icon size={19} />
    </span>
  )
}
