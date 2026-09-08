# Jack Bank — Logo + OTP approval popup (plan)

## 1. New logo (best-to-best brand mark)
- Rewrite `BankLogo` in `src/components/Cards.tsx` as a premium geometric **"JB" monogram tile**:
  - Gradient tile (violet #8b5cf6 → deep violet #6d28d9 → cyan #22d3ee), gloss highlight, thin inner ring.
  - Crisp white "JB" built from rounded strokes/rects (sharp at any size, scales as favicon too).
- Add `public/favicon.svg` (static version) + `<link rel="icon">` in `index.html` + apple-touch/theme-color.
- Keep the same `{ size }` API so Login/Signup/Splash/Cards/Home/GatewayPay/admin all update automatically.

## 2. OTP screen: popup → approval → OTP shows
- Backend `migration11.sql`: `jb_gateway_otp_approve(p_pay_token)` RPC — verifies pending order + live OTP, logs `otp_approved` event, returns `{ otp, method, to, expires_in }` (anon-safe, security definer).
- Store: add `gatewayOtpApprove` action.
- `GatewayPay.tsx`: after "Send OTP" succeeds open a centered **Modal**:
  - Step 1 approval — shield icon, "Approve this payment?", amount + merchant + "OTP sent to X", **Approve / Decline**.
  - Step 2 reveal — big monospace OTP with countdown, copy button, auto-fills the 6-box input, Done.
  - Decline resets the OTP stage. Resend re-opens the popup.
- Admin `Gateway.tsx`: add `otp_approved` event label to the timeline map.

## Verify
- Build clean, browser-test the full OTP popup flow (UPI + card), commit, push, deploy, live smoke check.
