import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, QrCode, Keyboard, Camera, RefreshCw, SwitchCamera } from 'lucide-react'
import jsQR from 'jsqr'
import { useBank } from '../../store'
import { Avatar, Modal, Segmented, inputCls } from '../../components/ui'
import { fxScan, fxError } from '../../lib/fx'

type CamState = 'idle' | 'starting' | 'active' | 'denied' | 'unsupported'

export default function Scan() {
  const nav = useNavigate()
  const session = useBank((s) => s.session)
  const users = useBank((s) => s.users)
  const me = users.find((u) => u.id === session?.userId)!
  const friends = users.filter((u) => u.id !== me.id)

  const [tab, setTab] = useState<'scan' | 'enter'>('scan')
  const [cam, setCam] = useState<CamState>('idle')
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [found, setFound] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [manual, setManual] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const lockedRef = useRef(false)

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCam('idle')
  }

  const startCamera = async () => {
    setScanError(null)
    lockedRef.current = false
    if (!navigator.mediaDevices?.getUserMedia) {
      setCam('unsupported')
      return
    }
    setCam('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play().catch(() => {})
      setCam('active')
      tick()
    } catch (e) {
      setCam('denied')
    }
  }

  const tick = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    const scale = Math.min(1, 360 / w)
    canvas.width = Math.floor(w * scale)
    canvas.height = Math.floor(h * scale)
    const ctx2d = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx2d) return
    ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height)
    const img = ctx2d.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(img.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' })
    if (code && code.data && !lockedRef.current) {
      lockedRef.current = true
      handleScan(code.data)
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const handleScan = (raw: string) => {
    const { pa, am, tn } = parseUpi(raw)
    const q = (pa || raw).trim().toLowerCase()
    if (!q) {
      resumeScan('Could not read that QR. Try again.')
      return
    }
    if (q === me.upiId.toLowerCase()) {
      resumeScan('This is your own QR code.')
      return
    }
    const f = users.find(
      (u) => u.id !== me.id && (u.upiId.toLowerCase() === q || u.accountNumber === q || u.phone === q),
    )
    if (!f) {
      resumeScan('This QR is not a Jack Bank friend.')
      return
    }
    // success
    fxScan()
    stopCamera()
    const qs = new URLSearchParams()
    if (am) qs.set('am', am)
    if (tn) qs.set('tn', tn)
    nav(`/pay/${f.id}${qs.toString() ? `?${qs.toString()}` : ''}`)
  }

  const resumeScan = (msg: string) => {
    stopCamera()
    setScanError(msg)
    fxError()
  }

  const retry = () => {
    setScanError(null)
    startCamera()
  }

  const resolveManual = () => {
    const q = manual.trim().toLowerCase()
    const f = users.find(
      (u) => u.id !== me.id && (u.upiId.toLowerCase() === q || u.accountNumber === q || u.phone === q),
    )
    if (f) nav(`/pay/${f.id}`)
    else {
      setFound('__none__')
      fxError()
    }
  }

  // keep camera alive only while the Scanner tab is open
  useEffect(() => {
    if (tab !== 'scan') stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useEffect(() => () => stopCamera(), [])

  const scanning = cam === 'active'

  return (
    <div className="pt-3">
      <div className="text-center">
        <h1 className="font-semibold text-[16px] text-text">Scan &amp; Pay</h1>
        <p className="text-[12.5px] text-muted mt-0.5">Point your camera at a friend's Jack Bank QR</p>
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
            {/* live video */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${scanning ? 'opacity-100' : 'opacity-0'}`}
            />
            {/* hidden decode canvas */}
            <canvas ref={canvasRef} className="hidden" />

            {/* idle / start overlay */}
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-faint bg-[radial-gradient(circle_at_50%_45%,rgba(139,92,246,0.12),transparent_60%)]">
                <Camera size={38} />
                <p className="text-[12px] px-8 text-center">
                  {cam === 'starting'
                    ? 'Opening camera…'
                    : cam === 'denied'
                      ? 'Camera access denied. Allow camera permission, or type the ID instead.'
                      : cam === 'unsupported'
                        ? 'Camera not available on this device. Type the ID instead.'
                        : scanError || 'Tap to open the camera'}
                </p>
                {cam === 'denied' || cam === 'unsupported' ? (
                  <button
                    onClick={() => setTab('enter')}
                    className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-primary"
                  >
                    <Keyboard size={15} /> Type ID instead
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-primary"
                  >
                    <ScanLine size={15} /> Open camera
                  </button>
                )}
              </div>
            )}

            {/* scanning frame */}
            {scanning && (
              <>
                <div className="absolute inset-0 bg-black/25" />
                <div className="absolute top-8 left-8 w-14 h-14 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                <div className="absolute top-8 right-8 w-14 h-14 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                <div className="absolute bottom-8 left-8 w-14 h-14 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                <div className="absolute bottom-8 right-8 w-14 h-14 border-b-4 border-r-4 border-primary rounded-br-2xl" />
                <div className="scan-line absolute inset-x-8 h-0.5 bg-primary shadow-[0_0_12px_2px_rgba(139,92,246,0.8)]" />
                <p className="absolute bottom-3 inset-x-0 text-center text-[11px] font-medium text-white/85">
                  Hold steady — scanning…
                </p>
              </>
            )}
          </div>

          {scanning && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFacing((f) => (f === 'environment' ? 'user' : 'environment'))
                  stopCamera()
                  setTimeout(() => startCamera(), 250)
                }}
                className="flex items-center gap-1.5 bg-surface2 border border-line rounded-xl px-3.5 py-2.5 text-[12.5px] font-semibold text-text"
              >
                <SwitchCamera size={15} /> Flip camera
              </button>
              <button
                onClick={stopCamera}
                className="flex items-center gap-1.5 bg-surface2 border border-line rounded-xl px-3.5 py-2.5 text-[12.5px] font-semibold text-text"
              >
                Cancel
              </button>
            </div>
          )}

          {!scanning && scanError && (
            <div className="w-full max-w-[320px] flex flex-col gap-2 items-center">
              <p className="text-[12.5px] text-danger text-center">{scanError}</p>
              <button
                onClick={retry}
                className="flex items-center gap-1.5 bg-surface2 border border-line rounded-xl px-4 py-2.5 text-[12.5px] font-semibold text-text"
              >
                <RefreshCw size={15} /> Scan again
              </button>
            </div>
          )}

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
              onKeyDown={(e) => e.key === 'Enter' && resolveManual()}
              placeholder="name@jackbank"
              className={inputCls + ' pl-10'}
            />
          </div>
          <button
            onClick={resolveManual}
            className="w-full bg-primary text-white font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-all"
          >
            Find &amp; Pay
          </button>
          {found === '__none__' && (
            <p className="text-center text-[12.5px] text-danger">No friend found with that ID</p>
          )}
        </div>
      )}

      <Modal open={!!found && found !== '__none__'} onClose={() => setFound(null)}>
        {found && found !== '__none__' && (() => {
          const f = friends.find((u) => u.id === found)!
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

function parseUpi(raw: string): { pa: string; pn: string; am: string; tn: string } {
  const s = raw.trim()
  let params: URLSearchParams = new URLSearchParams()
  try {
    if (s.includes('://')) params = new URL(s).searchParams
    else if (s.includes('=')) params = new URLSearchParams(s)
  } catch {
    params = new URLSearchParams()
  }
  return {
    pa: params.get('pa') || (s.includes('://') || s.includes('=') ? '' : s),
    pn: params.get('pn') || '',
    am: params.get('am') || params.get('amount') || '',
    tn: params.get('tn') || '',
  }
}
