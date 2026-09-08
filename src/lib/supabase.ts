import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
})

// Demo accounts share this password; PIN is the app-level second factor.
export const DEMO_PASSWORD = 'JackBank@12345'
