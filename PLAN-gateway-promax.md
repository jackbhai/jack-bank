# Jack Bank — "Debit card + premium cards + gateway pro-max" Plan

## 1. Debit card as real payment method (like credit card)
- New source `debit` in transfer / money-request / stock buy / MF buy / gateway pay.
- `jb_charge_debit(p_user, amount)` helper: active debit card required, funds come from balance.
- Recorded as method 'card' with "Debit card" note. Same OTP rules on gateway.

## 2. Premium card visuals + back view (flip) for BOTH cards
- Rewrite DebitCard + CreditCard: glass gradient, chip, contactless, embossed number,
  hologram, magnetic stripe + signature + CVV on back, tap-to-flip both.

## 3. Gateway pay page — ultra pro-max + theme toggle
- Header theme toggle (dark/light) via useTheme.
- Methods:
  - Logged-in → direct pay (Balance / Debit card / Credit card) with PIN.
  - UPI ID → OTP to owner device → enter OTP → paid from owner balance (cross-device).
  - Card (manual) → OTP to card owner device → enter OTP → paid (debit=balance, credit=dues).
- OTP: 6 boxes, auto-advance, countdown, resend.
- Order summary + breakdown + secure footer.

## 4. Gateway admin — pro-max
- Stats: GMV, fees, success rate, refunds, today, merchants.
- Search + status tabs + CSV export.
- Merchant detail: orders, revenue, unsettled, settlement history, block/unblock,
  rotate API keys, test pay.
- Order detail: full event timeline (created/otp/paid/settled/refunded), pay method, refund.
- Inline gateway fee setting.

## 5. DB (migration9.sql)
- jb_gateway_orders: otp, otp_expires_at, otp_method, otp_upi_id, otp_card_id.
- New tables jb_gateway_events + jb_gateway_settlements.
- RPCs: jb_charge_debit, jb_gateway_initiate, jb_gateway_confirm, merchant set_status,
  rotate_keys; events on create/pay/confirm/settle/refund; transfer/stock/mf source 'debit'.

## Rules
- No emojis; lucide SVG icons. Fictional names. Server-side via RPC. OTP = simulation
  delivered via in-app notification (works across devices). Plan→build→verify→deploy.
