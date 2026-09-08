# Jack Bank

A friends-only virtual banking simulation. Friends trade virtual money with each other through a complete banking system — UPI ID, account number, IFSC, debit/credit cards, loans, FDs, QR codes, statements — with a separate **Owner (admin) console** that controls approvals, charges and every rule of the bank.

**Stack:** React 18 + Vite 5 + TypeScript + Tailwind CSS v4 + Zustand + Lucide (SVG icons) + Supabase (Postgres + Auth + Realtime). Mobile-first, AMOLED dark theme by default (Dark and Light too).

## Live backend

- Supabase project: `nksthsgrxudptwdbytoh` (ap-northeast-2) — dedicated project, no demo data
- Schema: `supabase/schema.sql` · auth helpers: `supabase/migration2.sql` · user flows: `supabase/migration3.sql`
- All Jack Bank tables are `jb_`-prefixed. Row Level Security on every table + 25+ `SECURITY DEFINER` RPC functions as the banking engine (fees, cashback, EMI, approvals — all server-side).

## Run locally

```bash
npm install
cp .env.example .env   # fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
npm run build
```

`.env` is gitignored. The preview/deployed build needs the same two vars.

## How people join

- **Owner (admin):** created for the app owner. Controls approvals, rules, charges and can add friends directly.
- **Friends:** sign up themselves (name, email, phone, password, 4-digit UPI PIN) — auto-confirmed, they instantly get a UPI ID, account number, IFSC and a debit card.
- **Owner adds a friend:** Admin panel → Users → **Add** — creates the account and shares the credentials.

Login is **email + password**. The 4-digit UPI PIN is required to confirm payments (and can be changed in Settings).

## What's inside

### User panel (friends)
- Home dashboard: balance, UPI ID copy, quick actions, pending money requests, recent activity, announcements
- Send money (UPI ID / account+IFSC / phone) with UPI-PIN confirmation
- Request money from a friend
- Scan & Pay (simulated scanner) + My QR (real UPI `upi://pay` QR, fixed amount, share/copy link)
- Debit card (freeze/unfreeze, reveal number) + Credit card (flip for CVV, simulate spend, pay bill)
- Loans: pre-approved eligibility, apply, EMI schedule, pay EMI
- Fixed deposits: book, maturity value, break early
- Statement: search, credit/debit filter, CSV export
- Profile: account details, credit score, rewards, KYC
- Notifications, Settings (theme toggle + change PIN)

### Admin panel (owner)
- Dashboard: stats, 14-day volume chart, broadcast announcements
- Approvals: deposit, withdrawal, loan, KYC, card requests — approve/reject
- Users: view all accounts, add friend, block/unblock, manual credit/debit
- Rules: fees, cashback, limits, loan/card/FD interest rates, bank identity — all editable
- Ledger: every transaction + CSV export

## Architecture notes
- Data lives in Supabase — friends on different phones trade in real time (Realtime subscriptions).
- The banking engine runs server-side in Postgres functions, so it can't be cheated from the client.
- To ship a native app, wrap the same build with Capacitor.

## Notes
- All money is virtual. No real funds are involved.
