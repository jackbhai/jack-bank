import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { useTheme } from './store'

const el = document.documentElement
el.setAttribute('data-theme', useTheme.getState().theme)
useTheme.subscribe((s) => {
  if (s.theme !== el.getAttribute('data-theme')) el.setAttribute('data-theme', s.theme)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
