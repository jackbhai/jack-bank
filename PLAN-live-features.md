# Jack Bank — "Real Credit Card + Skins + Live Features" Plan

## Current state (verified)
- Credit card: `jb_cards` has `credit_limit`, `due_amount`, `due_date`. Spending today is
  a fake "Simulate spend" button (`jb_credit_card_spend`) that just adds dues.
  Bill payment (`jb_pay_card_bill`) already works from balance.
- Payments (`jb_transfer_money`), stock buy (`jb_stock_place_order`), MF buy (`jb_mf_buy`),
  gateway pay (`jb_gateway_pay`) all debit **balance only**.
- Stock history is stored in `jb_stocks.history` (jsonb of `{t, p}`), appended every minute
  by pg_cron (capped at 240 points). Charts currently use a synthetic `seededSeries`.
- Theming is CSS variables in `src/index.css` (`--primary`, `--primary2`, `--accent`).
  Per-user settings already exist via `jb_user_settings` (key/value jsonb) + store.
- `jb_transactions` already records `card_spend` / `card_payment` types (usable as statement).

## Phase 1 — Credit card = real payment method (bilkul real)
1. **Pay by card anywhere money goes out.** Add a `p_source` ('balance' | 'card') param to:
   - `jb_transfer_money` (Send, Pay, money-request approve)
   - `jb_stock_place_order` (market + limit buy)
   - `jb_mf_buy` (lumpsum + SIP setup)
   - `jb_gateway_pay` (merchant checkout)
   When 'card': validate active card + available credit (`credit_limit - due_amount`),
   raise `due_amount`, insert a `card_spend` transaction, notify; recipient still gets
   full amount. When 'balance': existing behaviour.
2. **Real billing** (if "full real" chosen):
   - First spend sets `due_date` = last day of current month.
   - Minimum due = 5% of outstanding (min ₹100).
   - pg_cron daily job `jb_card_billing`: if `due_date` passed and dues remain →
     charge interest (3%/month) + late fee (₹250, configurable in `jb_settings`),
     push `due_date` forward, mark overdue, send notification.
3. **Cards page rework** — remove "Simulate spend". Add:
   - Available credit = limit − outstanding, used %, min due, due date.
   - Card statement (list of `card_spend` / `card_payment` txns).
   - Pay bill: full or minimum due.
4. **UI**: payment-method selector (Balance / Credit Card) in Send, gateway Pay,
   money-request approve, stock buy sheet, MF buy sheet. Show available credit inline.

## Phase 2 — Last 20 prices per stock
- In the stock detail sheet, render a "Last 20 prices" table from real `history`:
  time · price · change vs previous (green/red). Uses the same pg_cron ticks.
- Bonus: 1D chart range switches to real `history` points when ≥ 20 exist
  (longer ranges keep synthetic series).

## Phase 3 — Skins & themes shop (purchasable)
1. New tables:
   - `jb_skins` (catalog): id, kind ('qr' | 'theme'), name, price, meta (colors/design jsonb), sort.
   - `jb_user_skins` (ownership): user_id, skin_id, bought_at.
2. RPCs: `jb_buy_skin(p_skin)` (deduct balance, grant ownership),
   `jb_equip_skin(p_skin)` (store active skin in `jb_user_settings`).
3. Seed a catalog (fictional names only, no brands) — this is a product catalog,
   not demo data; no user owns any skin by default.
   - QR skins: e.g. Midnight, Sunset, Emerald, Gold foil, Neon, Minimal — change the
     My QR card gradient/pattern/border.
   - Theme skins: accent color themes that override `--primary/--primary2/--accent`
     (e.g. Ocean, Rose, Lime, Amber, Sky, Violet).
4. New `/skins` page (link in More): grid with preview, price, Buy (balance), Equip,
   Owned/Equipped badges. Apply instantly (QR page + whole-app accent).

## Phase 4 — Refresh button everywhere
- Reusable `RefreshButton` component (spinning icon while loading).
- Add to Home balance card (refreshes balance/users/txns) + Statement, Cards, Stocks,
  MF, FD, Loans, Notifications, and admin dashboard.

## Rules kept
- No emojis (lucide SVG icons). Fictional names. No demo data (catalog only).
- Server-side logic via RPC (security definer). Simulation disclaimer untouched.
- Plan → build → verify (npm run build + puppeteer) → commit → deploy.
