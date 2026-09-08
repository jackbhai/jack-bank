import { useEffect, useState } from 'react'
import { Save, Percent, Landmark, CreditCard, Banknote, Building2 } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { Button, inputCls } from '../../components/ui'
import type { Settings } from '../../lib/types'

type NumKey = keyof Pick<
  Settings,
  | 'txnFeePct' | 'txnFeeMin' | 'txnFeeCap' | 'cashbackPct' | 'welcomeBonus' | 'minBalance' | 'perTxnLimit' | 'dailyLimit'
  | 'loanInterestRate' | 'loanProcessingPct' | 'minLoanAmount' | 'maxLoanAmount' | 'maxLoanTenure'
  | 'creditCardInterestRate' | 'savingsInterestRate' | 'fdInterestRate' | 'defaultCreditLimit'
>

function NumField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2.5 border-b border-line last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 bg-surface2 border border-line rounded-lg px-2.5 py-2 text-[13px] font-semibold text-text text-right outline-none focus:border-primary"
        />
        {suffix && <span className="text-[11px] text-faint w-8">{suffix}</span>}
      </div>
    </label>
  )
}

export default function Rules() {
  const toast = useToast((s) => s.toast)
  const settings = useBank((s) => s.settings)
  const updateSettings = useBank((s) => s.updateSettings)

  const [draft, setDraft] = useState<Settings | null>(null)
  useEffect(() => {
    if (settings && !draft) setDraft({ ...settings })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))
  const setNum = (k: NumKey, v: number) => set(k, Number.isFinite(v) ? v : 0)

  const sections = [
    {
      title: 'Transfer fees & cashback',
      Icon: Percent,
      fields: [
        { label: 'Transaction fee (%)', key: 'txnFeePct', suffix: '%' },
        { label: 'Minimum fee', key: 'txnFeeMin', suffix: '₹' },
        { label: 'Maximum fee (cap)', key: 'txnFeeCap', suffix: '₹' },
        { label: 'Cashback (%)', key: 'cashbackPct', suffix: '%' },
        { label: 'Welcome bonus', key: 'welcomeBonus', suffix: '₹' },
      ] as { label: string; key: NumKey; suffix: string }[],
    },
    {
      title: 'Limits & balance',
      Icon: Banknote,
      fields: [
        { label: 'Per-transaction limit', key: 'perTxnLimit', suffix: '₹' },
        { label: 'Daily transfer limit', key: 'dailyLimit', suffix: '₹' },
        { label: 'Minimum balance', key: 'minBalance', suffix: '₹' },
      ] as { label: string; key: NumKey; suffix: string }[],
    },
    {
      title: 'Loans',
      Icon: Landmark,
      fields: [
        { label: 'Interest rate', key: 'loanInterestRate', suffix: '%' },
        { label: 'Processing fee', key: 'loanProcessingPct', suffix: '%' },
        { label: 'Min loan amount', key: 'minLoanAmount', suffix: '₹' },
        { label: 'Max loan amount', key: 'maxLoanAmount', suffix: '₹' },
        { label: 'Max tenure', key: 'maxLoanTenure', suffix: 'mo' },
      ] as { label: string; key: NumKey; suffix: string }[],
    },
    {
      title: 'Cards & interest',
      Icon: CreditCard,
      fields: [
        { label: 'Credit card interest', key: 'creditCardInterestRate', suffix: '%' },
        { label: 'Default credit limit', key: 'defaultCreditLimit', suffix: '₹' },
        { label: 'Savings interest', key: 'savingsInterestRate', suffix: '%' },
        { label: 'FD interest rate', key: 'fdInterestRate', suffix: '%' },
      ] as { label: string; key: NumKey; suffix: string }[],
    },
  ]

  if (!draft) {
    return (
      <div className="pt-3">
        <div className="text-center">
          <h1 className="font-semibold text-[16px] text-text">Charges & Rules</h1>
        </div>
        <p className="text-center text-[13px] text-muted py-16">Loading rules…</p>
      </div>
    )
  }

  return (
    <div className="pt-3">
      <div className="text-center">
        <h1 className="font-semibold text-[16px] text-text">Charges & Rules</h1>
        <p className="text-[12.5px] text-muted mt-0.5">Every rule of the bank, fully editable</p>
      </div>

      <div className="mt-4 card p-4">
        <p className="text-[13px] font-bold text-text flex items-center gap-2 mb-1">
          <Building2 size={15} className="text-primary" /> Bank identity
        </p>
        <label className="flex items-center justify-between gap-3 py-2.5 border-b border-line">
          <span className="text-[13px] text-muted">Bank name</span>
          <input value={draft.bankName} onChange={(e) => set('bankName', e.target.value)} className={inputCls + ' !w-40 !py-2 text-right'} />
        </label>
        <label className="flex items-center justify-between gap-3 py-2.5 border-b border-line">
          <span className="text-[13px] text-muted">UPI domain</span>
          <input value={draft.upiDomain} onChange={(e) => set('upiDomain', e.target.value)} className={inputCls + ' !w-40 !py-2 text-right'} />
        </label>
        <label className="flex items-center justify-between gap-3 py-2.5 border-b border-line">
          <span className="text-[13px] text-muted">IFSC prefix</span>
          <input value={draft.ifscPrefix} onChange={(e) => set('ifscPrefix', e.target.value.toUpperCase())} className={inputCls + ' !w-40 !py-2 text-right'} />
        </label>
        <label className="flex items-center justify-between gap-3 py-2.5">
          <span className="text-[13px] text-muted">Branch</span>
          <input value={draft.branch} onChange={(e) => set('branch', e.target.value)} className={inputCls + ' !w-40 !py-2 text-right'} />
        </label>
      </div>

      {sections.map((sec) => (
        <div key={sec.title} className="mt-4 card p-4">
          <p className="text-[13px] font-bold text-text flex items-center gap-2 mb-1">
            <sec.Icon size={15} className="text-primary" /> {sec.title}
          </p>
          {sec.fields.map((f) => (
            <NumField key={f.key} label={f.label} value={draft[f.key] as number} suffix={f.suffix} onChange={(v) => setNum(f.key, v)} />
          ))}
        </div>
      ))}

      <div className="mt-5 sticky bottom-24">
        <Button
          full
          onClick={async () => {
            await updateSettings(draft)
            toast('Rules saved — applied bank-wide', 'success')
          }}
        >
          <Save size={16} /> Save all rules
        </Button>
      </div>
    </div>
  )
}
