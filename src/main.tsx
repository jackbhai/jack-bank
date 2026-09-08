import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { useTheme } from './store'
import { unlockAudio, fxTap } from './lib/fx'

const el = document.documentElement
el.setAttribute('data-theme', useTheme.getState().theme)
useTheme.subscribe((s) => {
  if (s.theme !== el.getAttribute('data-theme')) el.setAttribute('data-theme', s.theme)
})

/* Unlock audio + play a soft tap on any interactive element press. */
const isInteractive = (node: EventTarget | null): boolean => {
  let cur = node as Element | null
  while (cur && cur !== document.body) {
    if (cur instanceof HTMLElement) {
      if (cur.hasAttribute('data-fx-none')) return false
      const tag = cur.tagName
      const role = cur.getAttribute('role')
      if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || role === 'button' || cur.hasAttribute('data-fx')) return true
    }
    cur = cur.parentElement
  }
  return false
}

document.addEventListener(
  'pointerdown',
  (e) => {
    unlockAudio()
    if (isInteractive(e.target)) fxTap()
  },
  { passive: true },
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
