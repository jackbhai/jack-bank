import { Segmented } from './ui'
import { inr } from '../lib/utils'

export type PaySource = 'balance' | 'debit' | 'card'

export function PaySourceSelector({
  source,
  onChange,
  balance,
  hasDebit,
  hasCredit,
  creditAvailable,
  creditLimit,
}: {
  source: PaySource
  onChange: (s: PaySource) => void
  balance: number
  hasDebit: boolean
  hasCredit: boolean
  creditAvailable: number
  creditLimit?: number
}) {
  const options: { id: PaySource; label: string }[] = [{ id: 'balance', label: 'Balance' }]
  if (hasDebit) options.push({ id: 'debit', label: 'Debit Card' })
  if (hasCredit) options.push({ id: 'card', label: 'Credit Card' })

  return (
    <div>
      <Segmented options={options} value={source} onChange={onChange} />
      <p className="text-[11.5px] text-muted mt-2">
        {source === 'card'
          ? `Available credit ${inr(creditAvailable)}${creditLimit != null ? ` of ${inr(creditLimit)}` : ''} · amount adds to your card dues`
          : source === 'debit'
          ? `Debit card spends from your balance ${inr(balance)}`
          : `Paying from balance ${inr(balance)}`}
      </p>
    </div>
  )
}
