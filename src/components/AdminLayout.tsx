import { Outlet } from 'react-router-dom'
import { LayoutDashboard, ClipboardCheck, Users, SlidersHorizontal, ScrollText, Globe, LineChart } from 'lucide-react'
import { BottomNav } from './ui'

const items = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/approvals', icon: ClipboardCheck, label: 'Approvals' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/rules', icon: SlidersHorizontal, label: 'Rules' },
  { to: '/admin/ledger', icon: ScrollText, label: 'Ledger' },
  { to: '/admin/gateway', icon: Globe, label: 'Gateway' },
  { to: '/admin/markets', icon: LineChart, label: 'Markets' },
]

export default function AdminLayout() {
  return (
    <div className="min-h-dvh max-w-md mx-auto px-5 pb-28">
      <Outlet />
      <BottomNav items={items} />
    </div>
  )
}
