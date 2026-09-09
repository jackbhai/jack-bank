import { Outlet } from 'react-router-dom'
import { Home, QrCode, CreditCard, ReceiptText, LayoutGrid } from 'lucide-react'
import { BottomNav } from './ui'
import Sidebar from './Sidebar'
import VerificationPopup from './VerificationPopup'

const items = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/scan', icon: QrCode, label: 'Scan' },
  { to: '/cards', icon: CreditCard, label: 'Cards' },
  { to: '/statement', icon: ReceiptText, label: 'Statement' },
  { to: '/more', icon: LayoutGrid, label: 'More' },
]

export default function Layout() {
  return (
    <div className="min-h-dvh max-w-md mx-auto px-5 pb-28">
      <Outlet />
      <BottomNav items={items} />
      <Sidebar />
      <VerificationPopup />
    </div>
  )
}
