import { useNavigate } from 'react-router-dom'
import {
  UserRound,
  Landmark,
  PiggyBank,
  Plus,
  Banknote,
  Bell,
  Settings,
  LogOut,
  ShieldCheck,
  CreditCard,
} from 'lucide-react'
import { useBank, useToast } from '../../store'
import { Avatar } from '../../components/ui'

export default function More() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const logout = useBank((s) => s.logout)
  const notifs = useBank((s) => s.notifications)

  const me = users.find((u) => u.id === session?.userId)!
  const unread = notifs.filter((n) => n.userId === me.id && !n.read).length

  const tiles = [
    { label: 'Profile', Icon: UserRound, to: '/profile', tint: 'text-primary' },
    { label: 'Loans', Icon: Landmark, to: '/loans', tint: 'text-accent' },
    { label: 'Fixed Deposit', Icon: PiggyBank, to: '/fd', tint: 'text-warning' },
    { label: 'Add Money', Icon: Plus, to: '/', tint: 'text-success' },
    { label: 'Withdraw', Icon: Banknote, to: '/withdraw', tint: 'text-danger' },
    { label: 'Cards', Icon: CreditCard, to: '/cards', tint: 'text-primary' },
    { label: 'Notifications', Icon: Bell, to: '/notifications', tint: 'text-accent', badge: unread },
    { label: 'Settings', Icon: Settings, to: '/settings', tint: 'text-muted' },
  ]

  return (
    <div className="pt-3">
      <div className="flex items-center gap-3 card p-4">
        <Avatar name={me.name} hue={me.avatarHue} size={52} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[16px] text-text">{me.name}</p>
          <p className="text-[12.5px] text-muted truncate">{me.upiId}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-success bg-success/10 px-2.5 py-1.5 rounded-lg">
          <ShieldCheck size={13} /> {me.kycStatus === 'approved' ? 'KYC OK' : 'KYC pending'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mt-5">
        {tiles.map((t) => (
          <button
            key={t.label}
            onClick={() => {
              if (t.label === 'Add Money') {
                toast('Use the Add Money button on Home', 'info')
                nav('/')
                return
              }
              nav(t.to)
            }}
            className="card p-4 flex items-center gap-3 text-left active:scale-[0.97] transition-all"
          >
            <span className={`w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center ${t.tint}`}>
              <t.Icon size={19} />
            </span>
            <span className="flex-1 text-[13.5px] font-semibold text-text">{t.label}</span>
            {t.badge ? (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        <button
          onClick={async () => {
            await logout()
            toast('Logged out', 'info')
            nav('/login')
          }}
          className="card p-4 flex items-center gap-3 text-left active:scale-[0.97]"
        >
          <span className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
            <LogOut size={19} />
          </span>
          <span className="text-[13.5px] font-semibold text-danger">Log out</span>
        </button>
      </div>

      <p className="text-center text-[11px] text-faint mt-8">Jack Bank · v1.0 · Friends-only virtual banking</p>
    </div>
  )
}
