import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Bell, BellOff } from 'lucide-react'
import { useBank } from '../../store'
import { fmtDateTime } from '../../lib/utils'
import { Empty, TopBar } from '../../components/ui'

export default function Notifications() {
  const nav = useNavigate()
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const notifs = useBank((s) => s.notifications)
  const markNotifsRead = useBank((s) => s.markNotifsRead)

  const me = users.find((u) => u.id === session?.userId)!
  const mine = notifs.filter((n) => n.userId === me.id).sort((a, b) => b.createdAt - a.createdAt)

  useEffect(() => {
    markNotifsRead(me.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="pt-3">
      <TopBar title="Notifications" left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} />

      <div className="mt-3 flex flex-col gap-2">
        {mine.length === 0 && <Empty icon={BellOff} title="No notifications" sub="You're all caught up" />}
        {mine.map((n) => (
          <div key={n.id} className="card p-4 flex gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Bell size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-text">{n.title}</p>
              <p className="text-[12.5px] text-muted mt-0.5 leading-snug">{n.body}</p>
              <p className="text-[11px] text-faint mt-1.5">{fmtDateTime(n.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
