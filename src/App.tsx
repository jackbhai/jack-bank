import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useBank } from './store'
import { Toasts } from './components/ui'
import { BankLogo } from './components/Cards'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'

/* Route-level code splitting keeps the first paint tiny & fast. */
const Home = lazy(() => import('./pages/user/Home'))
const Send = lazy(() => import('./pages/user/Send'))
const Request = lazy(() => import('./pages/user/Request'))
const Withdraw = lazy(() => import('./pages/user/Withdraw'))
const Scan = lazy(() => import('./pages/user/Scan'))
const Pay = lazy(() => import('./pages/user/Pay'))
const MyQR = lazy(() => import('./pages/user/MyQR'))
const Cards = lazy(() => import('./pages/user/Cards'))
const Statement = lazy(() => import('./pages/user/Statement'))
const More = lazy(() => import('./pages/user/More'))
const Profile = lazy(() => import('./pages/user/Profile'))
const Loans = lazy(() => import('./pages/user/Loans'))
const FD = lazy(() => import('./pages/user/FD'))
const Settings = lazy(() => import('./pages/user/Settings'))
const Notifications = lazy(() => import('./pages/user/Notifications'))
const MutualFunds = lazy(() => import('./pages/user/MutualFunds'))
const Stocks = lazy(() => import('./pages/user/Stocks'))
const Skins = lazy(() => import('./pages/user/Skins'))
const GatewayPay = lazy(() => import('./pages/user/GatewayPay'))
const AdminDash = lazy(() => import('./pages/admin/Dashboard'))
const AdminApprovals = lazy(() => import('./pages/admin/Approvals'))
const AdminUsers = lazy(() => import('./pages/admin/Users'))
const AdminUserDetail = lazy(() => import('./pages/admin/UserDetail'))
const AdminRules = lazy(() => import('./pages/admin/Rules'))
const AdminLedger = lazy(() => import('./pages/admin/Ledger'))
const AdminGateway = lazy(() => import('./pages/admin/Gateway'))
const AdminMarkets = lazy(() => import('./pages/admin/Markets'))

function PageFallback() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted">
        <span className="w-7 h-7 rounded-full border-2 border-line border-t-primary animate-spin" />
        <span className="text-[12px] font-medium">Loading…</span>
      </div>
    </div>
  )
}

function RequireAuth({ children, role }: { children: ReactNode; role: 'user' | 'admin' }) {
  const session = useBank((s) => s.session)
  const loc = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: loc }} />
  if (session.role !== role) return <Navigate to={session.role === 'admin' ? '/admin' : '/'} replace />
  return <>{children}</>
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
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/gateway/:token" element={<GatewayPay />} />

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
            <Route path="mf" element={<MutualFunds />} />
            <Route path="stocks" element={<Stocks />} />
            <Route path="skins" element={<Skins />} />
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
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="rules" element={<AdminRules />} />
            <Route path="ledger" element={<AdminLedger />} />
            <Route path="gateway" element={<AdminGateway />} />
            <Route path="markets" element={<AdminMarkets />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
