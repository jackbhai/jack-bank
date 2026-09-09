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

## Correction (migration13.sql) — OTP verification lives in the owner's panel, never on the gateway site
- User's rule: "Otp jiska account hai uske pas nhi Jaa rha gateway pe hi popup aa rha hai... jaha login hai waha user panel pe otp our verification popup ho naki gateway site pe."
- `jb_gateway_initiate` re-written: it never returns the OTP. It replies `{ok, method, to, expires_in}` only and inserts a `Payment verification request` notification whose body has NO OTP; the OTP lives only in `meta.pay_token`-referenced order row until the owner approves.
- `jb_notifications.meta jsonb` + `jb_mark_notif_read(p_notif)` (owner-only, single-notification read).
- `VerificationPopup.tsx` — global owner-panel popup (zustand `useVerify`); watches the realtime `notifications` stream, pops on unread verification notif, `Approve` calls `gatewayOtpApprove(meta.pay_token)` to reveal OTP with copy + countdown; Approve/Decline mark it read.
- `GatewayPay.tsx` — public page now only says "Verification request sent to {otpTo}" + "Approve it in the account owner's Jack Bank app to reveal the OTP, then enter it here." Old approval modal removed.
- `Notifications.tsx` — verification requests are tappable (opens the same popup via `useVerify.setNotif`).

## Verify (done)
Cross-device headless E2E (gateway page + owner app in separate tabs, same backend): public page shows "Verification request sent" and does NOT contain the OTP → owner app pops "Payment verification request" via realtime → Approve reveals OTP → clipboard copy == DB OTP → entering OTP on gateway page → "Payment Successful". No page errors. Build clean, deployed (commit cef734a, run 34296865118, live index-GLZexQus.js).
