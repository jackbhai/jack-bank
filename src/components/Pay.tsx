import { Segmented } from './ui'
import { inr } from '../lib/utils'

export type PaySource = 'balance' | 'card'

export function PaySourceSelector({
  source,
  onChange,
  balance,
  hasCard,
  cardAvailable,
  cardLimit,
}: {
  source: PaySource
  onChange: (s: PaySource) => void
  balance: number
  hasCard: boolean
  cardAvailable: number
  cardLimit?: number
}) {
  if (!hasCard) {
    return (
      <p className="text-[11.5px] text-muted">
        Paying from balance {inr(balance)} · no active credit card
      </p>
    )
  }
  return (
    <div>
      <Segmented
        options={[
          { id: 'balance', label: 'Balance' },
          { id: 'card', label: 'Credit Card' },
        ]}
        value={source}
        onChange={onChange}
      />
      <p className="text-[11.5px] text-muted mt-2">
        {source === 'card'
          ? `Available credit ${inr(cardAvailable)}${cardLimit != null ? ` of ${inr(cardLimit)}` : ''} · amount adds to your card dues`
          : `Paying from balance ${inr(balance)}`}
      </p>
    </div>
  )
}
