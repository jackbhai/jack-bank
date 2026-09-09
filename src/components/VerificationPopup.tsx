import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import {
  ShieldCheck, KeyRound, Copy, Check, Loader2, X, Store,
} from 'lucide-react'
import { useBank, useToast } from '../store'
import { inrFull, copyText } from '../lib/utils'
import { Button, Modal } from './ui'
import type { Notif } from '../lib/types'

export const useVerify = create<{ notif: Notif | null; setNotif: (n: Notif | null) => void }>((set) => ({
  notif: null,
  setNotif: (n) => set({ notif: n }),
}))

export default function VerificationPopup() {
  const notif = useVerify((s) => s.notif)
  const setNotif = useVerify((s) => s.setNotif)
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const notifications = useBank((s) => s.notifications)

  const [approved, setApproved] = useState(false)
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [expiresIn, setExpiresIn] = useState(0)
  const [copied, setCopied] = useState(false)
  const seen = useRef<Set<string>>(new Set())

  // watch for incoming verification requests (realtime via store)
  useEffect(() => {
    if (!session) return
    for (const n of notifications) {
      if (n.userId !== session.userId) continue
      const isVerify = n.title === 'Payment verification request' || !!(n.meta && n.meta.pay_token)
      if (!isVerify) continue
      if (seen.current.has(n.id)) continue
      if (n.read) continue
      seen.current.add(n.id)
      setNotif(n)
      break
    }
  }, [notifications, session, setNotif])

  // reset inner state on new notification
  useEffect(() => {
    setApproved(false)
    setOtp('')
    setExpiresIn(0)
    setCopied(false)
  }, [notif?.id])

  useEffect(() => {
    if (expiresIn <= 0) return
    const t = setInterval(() => setExpiresIn((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [expiresIn])

  if (!notif) return null

  const meta = notif.meta || {}
  const amount = Number(meta.amount || 0)
  const merchant = String(meta.merchant || '')
  const to = String(meta.to || '')
  const orderRef = String(meta.order_ref || '')

  const approve = async () => {
    setBusy(true)
    const res = await useBank.getState().gatewayOtpApprove(meta.pay_token)
    setBusy(false)
    if (res.ok) {
      setApproved(true)
      setOtp(res.otp || '')
      setExpiresIn(res.expiresIn || 300)
      useBank.getState().markNotifRead(notif.id)
    } else {
      setNotif(null)
      toast(res.error || 'Verification failed', 'error')
    }
  }

  const decline = async () => {
    await useBank.getState().markNotifRead(notif.id)
    setNotif(null)
    toast('Payment request declined', 'info')
  }

  const copy = async () => {
    const ok = await copyText(otp)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast('OTP copied', 'success')
    } else toast('Could not copy', 'error')
  }

  return (
    <Modal open={!!notif} onClose={() => {}}>
      {!approved ? (
        <div className="flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-2xl bg-primary/12 text-primary flex items-center justify-center">
            <ShieldCheck size={28} />
          </span>
          <p className="text-[16px] font-bold text-text">Payment verification request</p>
          <p className="text-[13px] text-muted">Approve to reveal the one-time password for</p>
          <p className="text-[24px] font-bold text-text">{inrFull(amount)}</p>
          <p className="text-[13px] text-muted -mt-1.5">to {merchant}</p>
          <div className="w-full rounded-xl bg-surface2 border border-line px-3 py-2.5 flex items-center justify-between text-[12.5px]">
            <span className="text-muted flex items-center gap-1.5"><KeyRound size={13} /> Requested via</span>
            <span className="font-semibold text-text">{to}</span>
          </div>
          {orderRef && <p className="text-[11px] text-faint -mt-1">Order {orderRef}</p>}
          <div className="w-full grid grid-cols-2 gap-2 mt-1">
            <Button variant="ghost" full onClick={decline}>
              <X size={16} /> Decline
            </Button>
            <Button full onClick={approve} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Approve
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-2xl bg-success/12 text-success flex items-center justify-center">
            <KeyRound size={26} />
          </span>
          <p className="text-[11px] font-bold text-muted uppercase tracking-wide">Your one-time password</p>
          <p className="font-mono text-[36px] font-bold tracking-[0.3em] text-text leading-none">{otp}</p>
          <p className="text-[12.5px] text-muted">
            Valid {Math.floor(expiresIn / 60)}:{String(expiresIn % 60).padStart(2, '0')} · enter it on the payment page
          </p>
          <div className="w-full grid grid-cols-2 gap-2">
            <Button variant="ghost" full onClick={copy}>
              {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button full onClick={() => setNotif(null)}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
