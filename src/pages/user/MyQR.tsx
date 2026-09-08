import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Copy, Check, Share2, Landmark } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { QR, MiniCardRow } from '../../components/Cards'
import { Avatar, Segmented, TopBar, inputCls } from '../../components/ui'

export default function MyQR() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const me = users.find((u) => u.id === session?.userId)!

  const [tab, setTab] = useState<'qr' | 'details'>('qr')
  const [amount, setAmount] = useState('')
  const [copied, setCopied] = useState(false)

  const upiString = `upi://pay?pa=${me.upiId}&pn=${encodeURIComponent(me.name)}&cu=INR${amount ? `&am=${amount}` : ''}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(upiString)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast('UPI link copied', 'success')
    } catch {
      toast('Could not copy', 'error')
    }
  }

  return (
    <div className="pt-3">
      <TopBar title="My QR" left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} />

      <div className="mt-2">
        <Segmented
          options={[
            { id: 'qr', label: 'QR Code' },
            { id: 'details', label: 'Account Details' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'qr' ? (
        <div className="mt-5 flex flex-col items-center gap-5 anim-up">
          <div className="card p-6 flex flex-col items-center gap-4 w-full">
            <div className="flex items-center gap-3">
              <Avatar name={me.name} hue={me.avatarHue} size={46} />
              <div>
                <p className="font-semibold text-[15px] text-text">{me.name}</p>
                <p className="text-[12px] text-muted">{me.upiId}</p>
              </div>
            </div>
            <QR value={upiString} size={200} />
            <p className="text-[12px] text-muted text-center">Scan with any Jack Bank app to pay instantly</p>
          </div>

          <div className="w-full flex flex-col gap-2">
            <div className="card p-4">
              <p className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-2">Fixed amount (optional)</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="₹ amount"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copy}
                className="flex items-center justify-center gap-2 bg-surface2 border border-line rounded-xl py-3 text-[13px] font-semibold text-text"
              >
                {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />} Copy link
              </button>
              <button
                onClick={copy}
                className="flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3 text-[13px] font-semibold"
              >
                <Share2 size={16} /> Share
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 card p-4 anim-up">
          <div className="flex items-center gap-3 pb-4 border-b border-line">
            <Avatar name={me.name} hue={me.avatarHue} size={48} />
            <div>
              <p className="font-semibold text-[15px] text-text">{me.name}</p>
              <p className="text-[12px] text-muted">{me.email}</p>
            </div>
          </div>
          <MiniCardRow label="UPI ID" value={me.upiId} />
          <MiniCardRow label="Account Number" value={me.accountNumber} />
          <MiniCardRow label="IFSC Code" value={me.ifsc} />
          <MiniCardRow label="Branch" value={me.branch} />
          <MiniCardRow label="Account Type" value={me.accountType} />
          <MiniCardRow label="Phone" value={me.phone} />
          <MiniCardRow label="KYC Status" value={me.kycStatus.toUpperCase()} />
          <div className="pt-3 flex items-center gap-2 text-[12px] text-faint">
            <Landmark size={14} /> {me.branch}
          </div>
        </div>
      )}
    </div>
  )
}
