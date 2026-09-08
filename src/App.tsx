import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useBank } from './store'
import { Toasts } from './components/ui'
import { BankLogo } from './components/Cards'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/user/Home'
import Send from './pages/user/Send'
import Request from './pages/user/Request'
import Withdraw from './pages/user/Withdraw'
import Scan from './pages/user/Scan'
import Pay from './pages/user/Pay'
import MyQR from './pages/user/MyQR'
import Cards from './pages/user/Cards'
import Statement from './pages/user/Statement'
import More from './pages/user/More'
import Profile from './pages/user/Profile'
import Loans from './pages/user/Loans'
import FD from './pages/user/FD'
import Settings from './pages/user/Settings'
import Notifications from './pages/user/Notifications'
import AdminDash from './pages/admin/Dashboard'
import AdminApprovals from './pages/admin/Approvals'
import AdminUsers from './pages/admin/Users'
import AdminRules from './pages/admin/Rules'
import AdminLedger from './pages/admin/Ledger'

function RequireAuth({ children, role }: { children: JSX.Element; role: 'user' | 'admin' }) {
  const session = useBank((s) => s.session)
  const loc = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: loc }} />
  if (session.role !== role) return <Navigate to={session.role === 'admin' ? '/admin' : '/'} replace />
  return children
}

export default function App() {
  const booting = useBank((s) => s.booting)
  const init = useBank((s) => s.init)

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (booting) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-bg">
        <div className="rounded-3xl p-2 brand-gradient-2 shadow-2xl shadow-primary/30">
          <BankLogo size={64} />
        </div>
        <p className="text-[14px] font-semibold text-muted">Jack Bank</p>
      </div>
    )
  }

  return (
    <HashRouter>
      <Toasts />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/"
          element={
            <RequireAuth role="user">
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Home />} />
          <Route path="send" element={<Send />} />
          <Route path="request" element={<Request />} />
          <Route path="withdraw" element={<Withdraw />} />
          <Route path="scan" element={<Scan />} />
          <Route path="pay/:toId" element={<Pay />} />
          <Route path="myqr" element={<MyQR />} />
          <Route path="cards" element={<Cards />} />
          <Route path="statement" element={<Statement />} />
          <Route path="more" element={<More />} />
          <Route path="profile" element={<Profile />} />
          <Route path="loans" element={<Loans />} />
          <Route path="fd" element={<FD />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireAuth role="admin">
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AdminDash />} />
          <Route path="approvals" element={<AdminApprovals />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="rules" element={<AdminRules />} />
          <Route path="ledger" element={<AdminLedger />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  )
}
