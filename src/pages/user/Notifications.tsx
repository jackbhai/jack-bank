import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Bell, BellOff, ShieldCheck } from 'lucide-react'
import { useBank } from '../../store'
import { fmtDateTime } from '../../lib/utils'
import { Empty, TopBar, RefreshButton } from '../../components/ui'
import { useVerify } from '../../components/VerificationPopup'

export default function Notifications() {
  const nav = useNavigate()
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const notifs = useBank((s) => s.notifications)
  const markNotifsRead = useBank((s) => s.markNotifsRead)
  const refreshNotifs = useBank((s) => s.refreshNotifs)
  const [refreshing, setRefreshing] = useState(false)

  const me = users.find((u) => u.id === session?.userId)!
  const mine = notifs.filter((n) => n.userId === me.id).sort((a, b) => b.createdAt - a.createdAt)

  const doRefresh = async () => {
    setRefreshing(true)
    await refreshNotifs()
    setRefreshing(false)
  }

  useEffect(() => {
    markNotifsRead(me.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="pt-3">
      <TopBar
        title="Notifications"
        left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>}
        right={<RefreshButton onClick={doRefresh} refreshing={refreshing} />}
      />

      <div className="mt-3 flex flex-col gap-2">
        {mine.length === 0 && <Empty icon={BellOff} title="No notifications" sub="You're all caught up" />}
        {mine.map((n) => {
          const isVerify = n.title === 'Payment verification request' || !!(n.meta && n.meta.pay_token)
          const Inner = (
            <>
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isVerify ? 'bg-warning/12 text-warning' : 'bg-primary/12 text-primary'}`}>
                {isVerify ? <ShieldCheck size={17} /> : <Bell size={17} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-text">{n.title}</p>
                <p className="text-[12.5px] text-muted mt-0.5 leading-snug">{n.body}</p>
                <p className="text-[11px] text-faint mt-1.5">{fmtDateTime(n.createdAt)}</p>
                {isVerify && (
                  <p className="text-[11px] font-bold text-primary mt-1">Tap to approve &amp; view OTP</p>
                )}
              </div>
            </>
          )
          return isVerify ? (
            <button key={n.id} onClick={() => useVerify.getState().setNotif(n)} className="card p-4 flex gap-3 text-left active:bg-surface2 transition-colors">
              {Inner}
            </button>
          ) : (
            <div key={n.id} className="card p-4 flex gap-3">
              {Inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
