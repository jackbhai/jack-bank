import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, QrCode, Keyboard } from 'lucide-react'
import { useBank } from '../../store'
import { Avatar, Modal, Segmented, inputCls } from '../../components/ui'

export default function Scan() {
  const nav = useNavigate()
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const me = users.find((u) => u.id === session?.userId)!
  const friends = users.filter((u) => u.id !== me.id)

  const [tab, setTab] = useState<'scan' | 'enter'>('scan')
  const [scanning, setScanning] = useState(false)
  const [found, setFound] = useState<string | null>(null)
  const [manual, setManual] = useState('')

  const startScan = () => {
    setScanning(true)
    setFound(null)
    setTimeout(() => {
      const friend = friends[Math.floor(Math.random() * friends.length)]
      setScanning(false)
      setFound(friend.id)
    }, 2400)
  }

  const resolveManual = () => {
    const q = manual.trim().toLowerCase()
    const f = users.find(
      (u) => u.id !== me.id && (u.upiId.toLowerCase() === q || u.accountNumber === q || u.phone === q),
    )
    if (f) nav(`/pay/${f.id}`)
    else setFound('__none__')
  }

  return (
    <div className="pt-3">
      <div className="text-center">
        <h1 className="font-semibold text-[16px] text-text">Scan & Pay</h1>
        <p className="text-[12.5px] text-muted mt-0.5">Scan a friend's Jack Bank QR</p>
      </div>

      <div className="mt-4">
        <Segmented
          options={[
            { id: 'scan', label: 'Scanner' },
            { id: 'enter', label: 'Type ID' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'scan' ? (
        <div className="mt-4 flex flex-col items-center gap-4">
          <div className="relative w-full aspect-square max-w-[320px] rounded-3xl overflow-hidden bg-black border border-line">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(139,92,246,0.12),transparent_60%)]" />
            {/* corner brackets */}
            <div className="absolute top-8 left-8 w-14 h-14 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
            <div className="absolute top-8 right-8 w-14 h-14 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
            <div className="absolute bottom-8 left-8 w-14 h-14 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
            <div className="absolute bottom-8 right-8 w-14 h-14 border-b-4 border-r-4 border-primary rounded-br-2xl" />
            {scanning && <div className="scan-line absolute inset-x-8 h-0.5 bg-primary shadow-[0_0_12px_2px_rgba(139,92,246,0.8)]" />}
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-faint">
                <ScanLine size={40} />
                <p className="text-[12px]">Point at a Jack Bank QR</p>
              </div>
            )}
          </div>

          <button
            onClick={startScan}
            disabled={scanning}
            className="w-full max-w-[320px] bg-primary text-white font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {scanning ? 'Scanning…' : 'Start Scan (simulated)'}
          </button>

          <button onClick={() => nav('/myqr')} className="flex items-center gap-2 text-[13px] font-semibold text-primary">
            <QrCode size={16} /> Show my QR instead
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-[12.5px] text-muted">Enter a friend's UPI ID, account number or phone.</p>
          <div className="relative">
            <Keyboard size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="name@jackbank"
              className={inputCls + ' pl-10'}
            />
          </div>
          <button
            onClick={resolveManual}
            className="w-full bg-primary text-white font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-all"
          >
            Find & Pay
          </button>
          {found === '__none__' && (
            <p className="text-center text-[12.5px] text-danger">No friend found with that ID</p>
          )}
        </div>
      )}

      <Modal open={!!found && found !== '__none__'} onClose={() => setFound(null)}>
        {found && found !== '__none__' && (() => {
          const f = users.find((u) => u.id === found)!
          return (
            <div className="flex flex-col items-center text-center gap-3">
              <div className="rounded-2xl bg-white p-2">
                <QrCode size={56} className="text-black" />
              </div>
              <Avatar name={f.name} hue={f.avatarHue} size={56} />
              <p className="text-[16px] font-bold text-text">{f.name}</p>
              <p className="text-[13px] text-muted">{f.upiId}</p>
              <p className="text-[12px] text-success font-semibold">QR detected successfully</p>
              <button
                onClick={() => {
                  setFound(null)
                  nav(`/pay/${f.id}`)
                }}
                className="w-full bg-primary text-white font-semibold py-3 rounded-xl active:scale-[0.98]"
              >
                Pay {f.name.split(' ')[0]}
              </button>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
