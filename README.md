# Jack Bank

A friends-only virtual banking simulation. Friends trade virtual money with each other through a complete banking system — UPI ID, account number, IFSC, debit/credit cards, loans, FDs, QR codes, statements — with a separate **Owner (admin) console** that controls approvals, charges and every rule of the bank.

**Stack:** React 18 + Vite 5 + TypeScript + Tailwind CSS v4 + Zustand + Lucide (SVG icons) + Supabase (Postgres + Auth + Realtime). Mobile-first, AMOLED dark theme by default (Dark and Light too).

## Live backend

- Supabase project: `ghdwhgrqnedimudaeidc` (ap-northeast-2)
- Schema: `supabase/schema.sql` · seed: `supabase/seed.sql`
- All Jack Bank tables are `jb_`-prefixed (the project hosts another app too, so we namespaced everything).
- Security: Row Level Security on every table + 25+ `SECURITY DEFINER` RPC functions as the banking engine.

## Run locally

```bash
npm install
cp .env.example .env   # fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
npm run build
```

`.env` is gitignored. The deployed/preview build needs the same two vars.

## Demo logins

| Role | Who | PIN |
|------|-----|-----|
| Friends | Aarav, Priya, Rohan, Sneha, Kabir | `1234` |
| Owner (admin) | The one who built the app | `2468` |

PIN is verified server-side (`jb_verify_pin` / `jb_verify_admin_pin`), then a real Supabase session is established, so every read/write goes through RLS. Demo auth accounts share the password `JackBank@12345` (change it in `src/lib/supabase.ts`).

## What's inside

### User panel (friends)
- Home dashboard: balance, UPI ID copy, quick actions, pending money requests, recent activity, announcements
- Send money (UPI ID / account+IFSC / phone) with PIN confirmation
- Request money from a friend
- Scan & Pay (simulated scanner) + My QR (real UPI `upi://pay` QR, fixed amount, share/copy link)
- Debit card (freeze/unfreeze, reveal number) + Credit card (flip for CVV, simulate spend, pay bill)
- Loans: pre-approved eligibility, apply, EMI schedule, pay EMI
- Fixed deposits: book, maturity value, break early
- Statement: search, credit/debit filter, CSV export
- Profile: account details, credit score, rewards, KYC
- Notifications, Settings (theme toggle + change PIN), Reset demo data

### Admin panel (owner)
- Dashboard: stats, 14-day volume chart, broadcast announcements
- Approvals: deposit, withdrawal, loan, KYC, card requests — approve/reject
- Users: view all accounts, block/unblock, manual credit/debit
- Rules: fees, cashback, limits, loan/card/FD interest rates, bank identity — all editable
- Ledger: every transaction + CSV export

## Architecture notes
- Data lives in Supabase (multi-device: friends on different phones trade in real time via Realtime subscriptions).
- The banking engine (fees, cashback, EMI math, approval side-effects) runs **server-side** in Postgres functions, so it can't be cheated from the client.
- Swap `src/lib/supabase.ts` to point at your own project; run the two SQL files to provision it.
- To ship a native app, wrap the same build with Capacitor — the codebase is 100% web-standard.

## Notes
- All money is virtual. No real funds are involved.
