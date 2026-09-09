import { createClient } from '@supabase/supabase-js'

// Anon key is public by design — safe to ship in the bundle.
// .env overrides locally; fallbacks make GitHub Pages builds work without secrets.
const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://nksthsgrxudptwdbytoh.supabase.co'
const anon =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rc3Roc2dyeHVkcHR3ZGJ5dG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NjczOTcsImV4cCI6MjEwNDQ0MzM5N30.W171nRjLBdWrXFaEF_56jgdQIAnaIIKTRY4pp5iWOig'

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
})

export const ANON_KEY = anon
export const SUPABASE_URL = url
