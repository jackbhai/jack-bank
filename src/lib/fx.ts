import { create } from 'zustand'

/* ------------------------------------------------------------------ */
/*  Jack Bank — sound + haptics engine (Web Audio synth, no assets)    */
/* ------------------------------------------------------------------ */

const SOUND_KEY = 'jack-bank-sound'
const HAPTIC_KEY = 'jack-bank-haptics'

interface FxState {
  sound: boolean
  haptics: boolean
  setSound: (v: boolean) => void
  setHaptics: (v: boolean) => void
}

export const useFx = create<FxState>((set) => ({
  sound: localStorage.getItem(SOUND_KEY) !== 'off',
  haptics: localStorage.getItem(HAPTIC_KEY) !== 'off',
  setSound: (v) => {
    localStorage.setItem(SOUND_KEY, v ? 'on' : 'off')
    set({ sound: v })
  },
  setHaptics: (v) => {
    localStorage.setItem(HAPTIC_KEY, v ? 'on' : 'off')
    set({ haptics: v })
  },
}))

/* ---------------------------- vibration --------------------------- */

export function buzz(pattern: number | number[]) {
  if (!useFx.getState().haptics) return
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}

/* ----------------------------- audio ------------------------------ */

let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    if (!ctx) ctx = new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Must be called from a user gesture to unlock audio on mobile. */
export function unlockAudio() {
  ac()
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.16) {
  const c = ac()
  if (!c || !useFx.getState().sound) return
  const t0 = c.currentTime + start
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g)
  g.connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.03)
}

/* ------------------------- public effects ------------------------- */

/** Soft tick for any button / nav press. */
export function fxTap() {
  buzz(8)
  tone(2400, 0, 0.045, 'sine', 0.05)
}

/** Keypad press — crisp like a real UPI pinpad. */
export function fxKey() {
  buzz(10)
  tone(1600, 0, 0.05, 'square', 0.05)
}

/** Success — bright ascending arpeggio. */
export function fxSuccess() {
  buzz([25, 40, 25])
  tone(659.25, 0, 0.12, 'sine', 0.16)
  tone(880, 0.09, 0.14, 'sine', 0.16)
  tone(1318.5, 0.18, 0.22, 'sine', 0.14)
}

/** Error — low double buzz. */
export function fxError() {
  buzz([90, 50, 90])
  tone(220, 0, 0.16, 'sawtooth', 0.1)
  tone(185, 0.06, 0.2, 'sawtooth', 0.09)
}

/** QR code locked — quick double beep. */
export function fxScan() {
  buzz(40)
  tone(1174.7, 0, 0.09, 'square', 0.1)
  tone(1760, 0.09, 0.14, 'square', 0.1)
}

/** Cash / transfer success — coin-like chime. */
export function fxCoin() {
  buzz([30, 30, 60])
  tone(1567.98, 0, 0.09, 'triangle', 0.15)
  tone(2093, 0.08, 0.16, 'triangle', 0.12)
  tone(2637, 0.16, 0.24, 'sine', 0.08)
}
