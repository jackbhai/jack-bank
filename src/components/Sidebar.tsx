import { useEffect } from 'react'
import { create } from 'zustand'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  X, Home, QrCode, Send, ArrowDownLeft, CreditCard, ReceiptText, LineChart, PieChart,
  PiggyBank, Landmark, Palette, Globe, Banknote, Bell, UserRound, Settings, LogOut, ShieldCheck, LayoutGrid,
} from 'lucide-react'
import { useBank } from '../store'
import { Avatar } from './ui'

export const useSidebar = create<{ open: boolean; setOpen: (v: boolean) => void }>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
}))

const ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/scan', icon: QrCode, label: 'Scan & Pay' },
  { to: '/myqr', icon: QrCode, label: 'My QR' },
  { to: '/send', icon: Send, label: 'Send Money' },
  { to: '/request', icon: ArrowDownLeft, label: 'Request Money' },
  { to: '/cards', icon: CreditCard, label: 'Cards' },
  { to: '/statement', icon: ReceiptText, label: 'Statement' },
  { to: '/stocks', icon: LineChart, label: 'Stock Market' },
  { to: '/mf', icon: PieChart, label: 'Mutual Funds' },
  { to: '/fd', icon: PiggyBank, label: 'Fixed Deposit' },
  { to: '/loans', icon: Landmark, label: 'Loans' },
  { to: '/skins', icon: Palette, label: 'Skins & Themes' },
  { to: '/gateway', icon: Globe, label: 'Payment Gateway' },
  { to: '/withdraw', icon: Banknote, label: 'Withdraw' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profile', icon: UserRound, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/more', icon: LayoutGrid, label: 'More' },
]

export default function Sidebar() {
  const open = useSidebar((s) => s.open)
  const setOpen = useSidebar((s) => s.setOpen)
  const nav = useNavigate()
  const loc = useLocation()
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const logout = useBank((s) => s.logout)
  const me = users.find((u) => u.id === session?.userId)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const go = (to: string) => {
    setOpen(false)
    nav(to)
  }

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/70 anim-fade" onClick={() => setOpen(false)} />
      <div className="absolute left-0 top-0 bottom-0 w-[84%] max-w-[310px] bg-surface border-r border-line anim-slide-right flex flex-col overflow-y-auto no-scrollbar">
        {/* header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={me?.name || 'U'} hue={me?.avatarHue || 260} size={40} />
            <div className="min-w-0">
              <p className="font-semibold text-[14px] text-text truncate">{me?.name}</p>
              <p className="text-[11px] text-muted truncate">{me?.upiId}</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="p-2 rounded-full bg-surface2 text-muted">
            <X size={18} />
          </button>
        </div>
        {me && (
          <div className="mx-4 mb-2 flex items-center gap-1.5 text-[11px] font-bold text-success bg-success/10 px-2.5 py-1.5 rounded-lg">
            <ShieldCheck size={13} /> {me.kycStatus === 'approved' ? 'KYC verified' : 'KYC pending'}
          </div>
        )}

        {/* nav list */}
        <div className="flex-1 px-2.5 pb-4">
          {ITEMS.map((it) => {
            const active = loc.pathname === it.to
            return (
              <button
                key={it.to}
                onClick={() => go(it.to)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${active ? 'bg-primary/12 text-primary font-semibold' : 'text-text hover:bg-surface2'}`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-primary/15 text-primary' : 'bg-surface2 text-muted'}`}>
                  <it.icon size={17} />
                </span>
                <span className="text-[13.5px]">{it.label}</span>
              </button>
            )
          })}
        </div>

        {/* logout */}
        <div className="px-4 pb-6 border-t border-line pt-3">
          <button
            onClick={async () => {
              setOpen(false)
              await logout()
              nav('/login')
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-danger/10 transition-colors"
          >
            <span className="w-8 h-8 rounded-lg bg-danger/10 text-danger flex items-center justify-center">
              <LogOut size={17} />
            </span>
            <span className="text-[13.5px] font-semibold text-danger">Log out</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
