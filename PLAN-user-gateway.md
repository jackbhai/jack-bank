# Jack Bank — per-user payment gateway + sidebar (plan)

## Goal
1. Every user gets their own payment gateway (merchant app) linked to their account.
2. Admin must approve it before it goes live (and before keys are visible).
3. A **sidebar** lists all features (incl. this new "Payment Gateway").
4. After approval the user can always see all keys in full — Gateway anon key, merchant API key, merchant API secret — and copy each with a single tap (viewing still requires the admin's approval = active status).

## Backend (migration12.sql)
- `jb_merchants.user_id` (nullable, → jb_profiles) + unique index on non-null user_id.
- `jb_merchant_apply(name, app, callback)` — auth.uid(), creates `pending` merchant (re-apply allowed from `rejected`).
- `jb_merchant_my_app()` — returns the user's merchant; `api_secret` returned **only when status='active'** (admin-approved).
- `jb_merchant_my_orders()` — user's own recent orders (for their dashboard).
- `jb_merchant_review(id, 'approve'|'reject')` — admin only, logs event.

## Frontend
- `Sidebar.tsx` — left drawer with ALL features + "Payment Gateway" + logout (zustand `useSidebar`).
- Home header: hamburger button opens the sidebar. `Layout` mounts `<Sidebar/>`.
- More page: add "Payment Gateway" tile.
- New `pages/user/Gateway.tsx` — apply form → pending → (approved) keys dashboard: anon key / api key / api secret full + single-tap copy + stats + recent orders + docs.
- Admin `Gateway.tsx` — pending merchants get Approve/Reject + owner name shown.
- Store: `myMerchant` state, `merchantApply/merchantGetMine/merchantMyOrders/merchantReview` actions, `Merchant.userId`.

## Verify
Build clean → browser-test user apply + admin approve + keys/copy + sidebar → cleanup test data → commit/push/deploy → live smoke.
