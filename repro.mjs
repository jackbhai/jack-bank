const url = 'https://nksthsgrxudptwdbytoh.supabase.co'
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rc3Roc2dyeHVkcHR3ZGJ5dG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NjczOTcsImV4cCI6MjEwNDQ0MzM5N30.W171nRjLBdWrXFaEF_56jgdQIAnaIIKTRY4pp5iWOig'

const email = `repro${Date.now()}@example.com`

// 1. signup
const su = await fetch(`${url}/auth/v1/signup`, {
  method: 'POST',
  headers: { apikey: anon, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: 'Repro@12345', data: { name: 'Repro User', phone: '9876500000', pin: '1234' } }),
}).then(r => r.json())
console.log('1. signup ok:', !!su.access_token, '| user id:', su.user?.id, '| error:', su.error_description || su.msg || 'none')

const token = su.access_token
const uid = su.user?.id
const H = { apikey: anon, Authorization: `Bearer ${token}` }

// 2. profile lookup (refreshUsers meRow)
const me = await fetch(`${url}/rest/v1/jb_profiles?select=*&id=eq.${uid}`, { headers: H }).then(r => r.json())
console.log('2. meRow:', Array.isArray(me) && me[0] ? `FOUND upi=${me[0].upi_id} ac=${me[0].account_number} pin=${me[0].pin}` : `NOT FOUND -> ${JSON.stringify(me)}`)

// 3. jb_friends rpc
const fr = await fetch(`${url}/rest/v1/rpc/jb_friends`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.json())
console.log('3. friends:', Array.isArray(fr) ? `count=${fr.length}` : `ERR ${JSON.stringify(fr)}`)

// 4. transactions
const tx = await fetch(`${url}/rest/v1/jb_transactions?select=*&or=(from_user.eq.${uid},to_user.eq.${uid})&order=created_at.desc&limit=400`, { headers: H }).then(r => r.json())
console.log('4. txns:', Array.isArray(tx) ? `count=${tx.length}` : `ERR ${JSON.stringify(tx)}`)

// 5. cards
const cards = await fetch(`${url}/rest/v1/jb_cards?select=*&user_id=eq.${uid}`, { headers: H }).then(r => r.json())
console.log('5. cards:', Array.isArray(cards) ? `count=${cards.length}` : `ERR ${JSON.stringify(cards)}`)
