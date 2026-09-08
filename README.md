# Jack Bank

A friends-only virtual banking simulation. Friends can trade virtual money with each other through a full banking system — UPI ID, account number, IFSC, debit/credit cards, loans, FDs, QR codes, statements — with a separate Owner (admin) console that controls approvals, charges and every rule of the bank.

Built with **React + Vite + TypeScript + Tailwind CSS v4 + Zustand + Lucide (SVG) icons**. Mobile-first, AMOLED dark theme by default (with Dark and Light themes too).

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
```

## Demo logins

| Role | Who | PIN |
|------|-----|-----|
| Friends | Aarav, Priya, Rohan, Sneha, Kabir | `1234` |
| Owner (admin) | The one who built the app | `2468` |

Pick any friend on the login screen, enter the PIN, and you're in. Use the **Admin** tab on login for the owner console.

## What's inside

### User panel (friends)
- Home dashboard: balance, UPI ID, quick actions, pending money requests, recent activity
- Send money (UPI ID / account+IFSC / phone) with PIN confirm
- Request money from a friend
- Scan & Pay (simulated scanner) + My QR (real UPI QR with `upi://pay` link)
- Debit card (freeze/unfreeze, reveal) + Credit card (flip to see CVV, simulate spend, pay bill)
- Loans: pre-approved eligibility, apply, EMI schedule, pay EMI
- Fixed deposits: book, maturity value, break early
- Statement: search, filter credits/debits, CSV export
- Profile: account details, credit score, rewards, KYC
- Notifications, Settings (theme toggle + change PIN), Reset demo data

### Admin panel (owner)
- Dashboard: stats, 14-day volume chart, broadcast announcements
- Approvals: deposit, withdrawal, loan, KYC, card requests — approve/reject
- Users: view all accounts, block/unblock, manual credit/debit
- Rules: fees, cashback, limits, loan/card/FD interest rates, bank identity — all editable
- Ledger: every transaction + CSV export

## Notes
- All money is virtual. No real funds are involved.
- Data is stored per-device in `localStorage` (Zustand persist). All friends can log in from the same device to try it.
- To let friends trade from their own phones, a shared backend (e.g. Supabase) can be plugged in — the store is architected so the engine swaps cleanly.
