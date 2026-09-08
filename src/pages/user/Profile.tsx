import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Copy, Check, BadgeCheck, Star, ShieldAlert, FileCheck2, CalendarDays, CreditCard, Briefcase, MapPin, UserPlus, ChevronRight } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { creditScoreFor, fmtDate, inr } from '../../lib/utils'
import { MiniCardRow } from '../../components/Cards'
import { Avatar, Button, TopBar, Sheet, Field, inputCls } from '../../components/ui'

const OCCUPATIONS = ['Student', 'Salaried', 'Self-employed', 'Business owner', 'Freelancer', 'Other']
const INCOME_BANDS = ['Under ₹2.5L', '₹2.5L – ₹5L', '₹5L – ₹10L', '₹10L – ₹25L', 'Above ₹25L']
const STATES = ['Delhi', 'Uttar Pradesh', 'Haryana', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'West Bengal', 'Rajasthan', 'Gujarat', 'Punjab', 'Other']

export default function Profile() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const transactions = useBank((s) => s.transactions)
  const loans = useBank((s) => s.loans)
  const submitKyc = useBank((s) => s.submitKyc)
  const kyc = useBank((s) => s.kyc)

  const me = users.find((u) => u.id === session?.userId)!
  const [copied, setCopied] = useState(false)
  const score = creditScoreFor(me.id, transactions, loans, users)

  const [kycOpen, setKycOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [f, setF] = useState({
    pan: kyc?.pan || '',
    dob: kyc?.dob || '',
    gender: kyc?.gender || 'Male',
    occupation: kyc?.occupation || '',
    incomeBand: kyc?.income_band || '',
    address: kyc?.address || '',
    city: kyc?.city || '',
    state: kyc?.state || '',
    pincode: kyc?.pincode || '',
    nomineeName: kyc?.nominee_name || '',
    nomineeRelation: kyc?.nominee_relation || '',
  })

  const copy = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast('Copied', 'success')
    } catch {
      toast('Could not copy', 'error')
    }
  }

  const scoreColor = score >= 750 ? 'text-success' : score >= 600 ? 'text-warning' : 'text-danger'
  const scoreLabel = score >= 750 ? 'Excellent' : score >= 600 ? 'Good' : 'Needs work'

  const canNext =
    step === 0 ? f.pan.trim().length >= 8 && f.dob && f.gender
    : step === 1 ? f.occupation && f.incomeBand
    : step === 2 ? f.address.trim() && f.city.trim() && f.state && f.pincode.trim().length >= 6
    : true

  const submit = async () => {
    const res = await submitKyc(me.id, {
      pan: f.pan.trim().toUpperCase(),
      dob: f.dob,
      gender: f.gender,
      occupation: f.occupation,
      incomeBand: f.incomeBand,
      address: f.address.trim(),
      city: f.city.trim(),
      state: f.state,
      pincode: f.pincode.trim(),
      nomineeName: f.nomineeName.trim(),
      nomineeRelation: f.nomineeRelation.trim(),
    })
    toast(res.ok ? 'KYC submitted for owner review' : res.error || 'Failed', res.ok ? 'success' : 'error')
    if (res.ok) setKycOpen(false)
  }

  const stepMeta = [
    { title: 'Identity', Icon: CreditCard },
    { title: 'Occupation & income', Icon: Briefcase },
    { title: 'Address', Icon: MapPin },
    { title: 'Nominee', Icon: UserPlus },
  ]

  return (
    <div className="pt-3">
      <TopBar title="Profile" left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} />

      <div className="mt-2 flex flex-col items-center gap-2 card p-6">
        <Avatar name={me.name} hue={me.avatarHue} size={76} />
        <p className="text-[18px] font-bold text-text mt-1">{me.name}</p>
        <p className="text-[12.5px] text-muted">{me.email}</p>
        <div className="flex items-center gap-2 mt-1">
          {me.kycStatus === 'approved' ? (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-success bg-success/10 px-2.5 py-1 rounded-lg">
              <BadgeCheck size={13} /> KYC Verified
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-lg">
              <ShieldAlert size={13} /> KYC {me.kycStatus}
            </span>
          )}
          <span className="text-[11px] font-bold text-muted bg-surface2 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <CalendarDays size={13} /> Since {fmtDate(me.createdAt)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mt-4">
        <div className="card p-4">
          <p className="text-[11px] font-semibold text-muted uppercase">Credit Score</p>
          <p className={`text-[24px] font-bold ${scoreColor} mt-1`}>{score}</p>
          <p className={`text-[11.5px] font-semibold ${scoreColor}`}>{scoreLabel}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold text-muted uppercase flex items-center gap-1">
            <Star size={12} className="text-warning" /> Rewards
          </p>
          <p className="text-[24px] font-bold text-text mt-1">{me.rewards.toLocaleString('en-IN')}</p>
          <p className="text-[11.5px] text-muted">points earned</p>
        </div>
      </div>

      <div className="mt-4 card p-4">
        <MiniCardRow label="UPI ID" value={me.upiId} />
        <MiniCardRow label="Account Number" value={me.accountNumber} />
        <MiniCardRow label="IFSC Code" value={me.ifsc} />
        <MiniCardRow label="Branch" value={me.branch} />
        <MiniCardRow label="Account Type" value={me.accountType} />
        <MiniCardRow label="Phone" value={me.phone} />
        <MiniCardRow label="Balance" value={inr(me.balance)} />
        <MiniCardRow label="Cards" value={`${me.cards.length} active`} />
        <MiniCardRow label="Active FDs" value={`${me.fds.filter((f) => f.status === 'active').length}`} />
      </div>

      {me.kycStatus !== 'approved' && (
        <div className="mt-4">
          <Button
            full
            onClick={() => {
              setStep(0)
              setKycOpen(true)
            }}
          >
            <FileCheck2 size={16} /> Complete KYC verification
          </Button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => copy(me.upiId)}>
          {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />} Copy UPI ID
        </Button>
        <Button variant="ghost" onClick={() => copy(me.accountNumber)}>
          <Copy size={16} /> Copy A/C No
        </Button>
      </div>

      {/* ---------------- KYC multi-step ---------------- */}
      <Sheet open={kycOpen} onClose={() => setKycOpen(false)} title="KYC verification">
        <div className="pt-1 flex flex-col gap-4">
          {/* steps */}
          <div className="flex items-center justify-center gap-1.5">
            {stepMeta.map((s, i) => (
              <div key={s.title} className="flex items-center gap-1.5">
                <div className={`flex flex-col items-center gap-1 ${i === step ? 'text-primary' : i < step ? 'text-success' : 'text-faint'}`}>
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center border ${i === step ? 'bg-primary/12 border-primary' : i < step ? 'bg-success/12 border-success' : 'border-line'}`}>
                    <s.Icon size={16} />
                  </span>
                  <span className="text-[9px] font-bold uppercase">{s.title.split(' ')[0]}</span>
                </div>
                {i < stepMeta.length - 1 && <span className="w-6 h-px bg-line mb-4" />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="flex flex-col gap-3">
              <Field label="PAN number">
                <input value={f.pan} onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" className={inputCls + ' uppercase tracking-wider'} maxLength={10} />
              </Field>
              <Field label="Date of birth">
                <input type="date" value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Gender">
                <div className="grid grid-cols-3 gap-2">
                  {['Male', 'Female', 'Other'].map((g) => (
                    <button key={g} onClick={() => setF({ ...f, gender: g })} className={`py-2.5 rounded-xl border text-[13px] font-semibold ${f.gender === g ? 'border-primary bg-primary/12 text-primary' : 'border-line text-muted'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-3">
              <Field label="Occupation">
                <div className="grid grid-cols-2 gap-2">
                  {OCCUPATIONS.map((o) => (
                    <button key={o} onClick={() => setF({ ...f, occupation: o })} className={`py-2.5 rounded-xl border text-[12.5px] font-semibold ${f.occupation === o ? 'border-primary bg-primary/12 text-primary' : 'border-line text-muted'}`}>
                      {o}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Annual income">
                <div className="grid grid-cols-2 gap-2">
                  {INCOME_BANDS.map((b) => (
                    <button key={b} onClick={() => setF({ ...f, incomeBand: b })} className={`py-2.5 rounded-xl border text-[12.5px] font-semibold ${f.incomeBand === b ? 'border-primary bg-primary/12 text-primary' : 'border-line text-muted'}`}>
                      {b}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <Field label="Residential address">
                <input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="House, street, area" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="City">
                  <input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="City" className={inputCls} />
                </Field>
                <Field label="Pincode">
                  <input value={f.pincode} onChange={(e) => setF({ ...f, pincode: e.target.value.replace(/\D/g, '') })} placeholder="110001" className={inputCls} maxLength={6} inputMode="numeric" />
                </Field>
              </div>
              <Field label="State">
                <div className="grid grid-cols-3 gap-2">
                  {STATES.map((s) => (
                    <button key={s} onClick={() => setF({ ...f, state: s })} className={`py-2 rounded-lg border text-[11.5px] font-semibold truncate px-1 ${f.state === s ? 'border-primary bg-primary/12 text-primary' : 'border-line text-muted'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3">
              <p className="text-[12.5px] text-muted">Add a nominee who can claim your balance in case of an emergency.</p>
              <Field label="Nominee name">
                <input value={f.nomineeName} onChange={(e) => setF({ ...f, nomineeName: e.target.value })} placeholder="Full name" className={inputCls} />
              </Field>
              <Field label="Relationship">
                <input value={f.nomineeRelation} onChange={(e) => setF({ ...f, nomineeRelation: e.target.value })} placeholder="e.g. Mother, Father, Spouse" className={inputCls} />
              </Field>
              <div className="card p-3.5 text-[12px] text-muted leading-relaxed">
                <span className="font-semibold text-text">Review:</span> {f.pan} · {f.dob} · {f.gender} · {f.occupation} · {f.incomeBand} · {f.address}, {f.city}, {f.state} {f.pincode}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" full onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button full disabled={!canNext} onClick={() => setStep(step + 1)}>
                Continue <ChevronRight size={16} />
              </Button>
            ) : (
              <Button full onClick={submit}>
                Submit for verification
              </Button>
            )}
          </div>
        </div>
      </Sheet>
    </div>
  )
}
