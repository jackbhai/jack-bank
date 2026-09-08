// Theme-skin accent engine: a purchasable theme skin overrides the app's
// accent colours (--primary / --primary2 / --accent) via inline CSS variables
// on <html>, which win over the base [data-theme] rules.

export interface ThemeSkinMeta {
  primary?: string
  primary2?: string
  accent?: string
}

export interface QrSkinMeta {
  bg?: string[]
  fg?: string
}

export function applyThemeSkin(meta: ThemeSkinMeta | null | undefined) {
  const el = document.documentElement
  if (!meta) {
    el.style.removeProperty('--primary')
    el.style.removeProperty('--primary2')
    el.style.removeProperty('--accent')
    return
  }
  if (meta.primary) el.style.setProperty('--primary', meta.primary)
  if (meta.primary2) el.style.setProperty('--primary2', meta.primary2)
  if (meta.accent) el.style.setProperty('--accent', meta.accent)
}
