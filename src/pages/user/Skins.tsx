import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check, ShoppingBag, Palette, QrCode, Lock } from 'lucide-react'
import { useBank, useToast } from '../../store'
import { inr, inrFull } from '../../lib/utils'
import { Button, Segmented, Sheet, TopBar } from '../../components/ui'
import type { Skin } from '../../lib/types'

export default function Skins() {
  const nav = useNavigate()
  const toast = useToast((s) => s.toast)
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const skins = useBank((s) => s.skins)
  const ownedSkins = useBank((s) => s.ownedSkins)
  const userSettings = useBank((s) => s.userSettings)
  const buySkin = useBank((s) => s.buySkin)
  const equipSkin = useBank((s) => s.equipSkin)

  const me = users.find((u) => u.id === session?.userId)!
  const cfg = userSettings[me.id] || {}

  const [tab, setTab] = useState<'qr' | 'theme'>('qr')
  const [confirm, setConfirm] = useState<Skin | null>(null)

  const list = skins.filter((s) => s.kind === tab)
  const activeQr = cfg.active_qr_skin
  const activeTheme = cfg.active_theme_skin

  const isEquipped = (s: Skin) => (s.kind === 'qr' ? activeQr === s.id : activeTheme === s.id)
  const isOwned = (s: Skin) => s.price <= 0 || ownedSkins.includes(s.id)

  const doBuy = async (s: Skin) => {
    const res = await buySkin(s.id)
    toast(res.ok ? `${s.name} unlocked` : res.error || 'Failed', res.ok ? 'success' : 'error')
    setConfirm(null)
  }

  const doEquip = async (s: Skin) => {
    const res = await equipSkin(s.id)
    toast(res.ok ? `${s.name} applied` : res.error || 'Failed', res.ok ? 'success' : 'error')
  }

  return (
    <div className="pt-3">
      <TopBar title="Skins & Themes" left={<button onClick={() => nav(-1)} className="p-1.5 -ml-1.5"><ChevronLeft size={22} /></button>} />

      <div className="mt-2 card p-3.5 flex items-center justify-between">
        <div>
          <p className="text-[12px] text-muted">Your balance</p>
          <p className="text-[17px] font-bold text-text">{inr(me.balance)}</p>
        </div>
        <p className="text-[11px] text-muted text-right">Customise your QR and app colours.<br />All purchases use virtual money.</p>
      </div>

      <div className="mt-3">
        <Segmented
          options={[
            { id: 'qr', label: 'QR Skins' },
            { id: 'theme', label: 'Themes' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 pb-4">
        {list.map((s) => (
          <div key={s.id} className="card p-3 flex flex-col gap-2.5">
            {s.kind === 'qr' ? (
              <div className="h-20 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${s.meta?.bg?.[0] || '#8b5cf6'}, ${s.meta?.bg?.[1] || '#22d3ee'})` }}>
                <div className="bg-white/95 rounded-lg p-2 flex flex-col items-center gap-1">
                  <QrCode size={26} style={{ color: s.meta?.fg || '#000' }} />
                </div>
              </div>
            ) : (
              <div className="h-20 rounded-xl p-2 flex flex-col gap-1.5" style={{ background: 'var(--surface2)' }}>
                <div className="h-2.5 rounded-full" style={{ background: `linear-gradient(90deg, ${s.meta?.primary}, ${s.meta?.primary2})` }} />
                <div className="h-2.5 rounded-full w-2/3" style={{ background: s.meta?.accent }} />
                <div className="flex gap-1.5 mt-auto">
                  {[s.meta?.primary, s.meta?.primary2, s.meta?.accent].map((c, i) => (
                    <span key={i} className="w-4 h-4 rounded-full border border-black/10" style={{ background: c }} />
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[13px] font-bold text-text">{s.name}</p>
              <p className="text-[11px] text-muted">{s.price > 0 ? inrFull(s.price) : 'Free'}</p>
            </div>
            {isEquipped(s) ? (
              <div className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/12 text-primary text-[12px] font-bold">
                <Check size={14} /> Applied
              </div>
            ) : isOwned(s) ? (
              <Button variant="outline" onClick={() => doEquip(s)} className="!py-2 text-[12.5px]">Apply</Button>
            ) : (
              <Button onClick={() => setConfirm(s)} className="!py-2 text-[12.5px]">
                {s.price > 0 ? <ShoppingBag size={14} /> : <Palette size={14} />} {s.price > 0 ? 'Buy' : 'Get'}
              </Button>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <div className="col-span-2 text-center text-[13px] text-muted py-10 flex flex-col items-center gap-2">
            <Lock size={22} className="text-faint" /> No skins here yet
          </div>
        )}
      </div>

      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Confirm purchase">
        {confirm && (
          <div className="pt-2 flex flex-col gap-3 pb-2">
            <p className="text-[13px] text-muted">
              Buy <span className="font-semibold text-text">{confirm.name}</span> for{' '}
              <span className="font-semibold text-text">{confirm.price > 0 ? inrFull(confirm.price) : 'Free'}</span>?
            </p>
            <p className="text-[12px] text-muted">Your balance: {inr(me.balance)}</p>
            <Button full disabled={me.balance < confirm.price} onClick={() => doBuy(confirm)}>
              <ShoppingBag size={16} /> Confirm {confirm.price > 0 ? inrFull(confirm.price) : 'and unlock'}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
