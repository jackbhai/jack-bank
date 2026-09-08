# Jack Bank — "Gateway Ultimate Upgrade + Full Transaction Details" Plan

## Goal
1. Har payment/transaction pe click → full detail (user Statement, Home history, Cards statement, admin Ledger).
2. Gateway ultimate: order detail view, fee + pay-method captured, refunds, settlement tracking.

## DB (migration8.sql)
- `jb_gateway_orders` + `pay_method` (balance/card), `fee numeric`, `settled_at timestamptz`.
- `jb_gateway_pay` records pay_method + fee.
- `jb_gateway_settle` marks paid orders settled_at = now().
- `jb_gateway_refund(p_order)`: admin-only; refunds payer balance, reverses merchant settlement, marks 'refunded'.
- status check widened to include 'refunded'.

## Frontend
- New reusable `TxnDetail` sheet (component): icon, type, signed amount, status, ref+copy,
  date/time, from/to (name + UPI), note, method badge, fee, txn id.
- Statement: clickable rows → TxnDetail; day headers show count + net total.
- Home: recent transactions clickable → TxnDetail.
- Cards: card statement rows clickable → TxnDetail.
- Admin Ledger: rows clickable → TxnDetail (from + to both shown).
- Admin Gateway: order rows clickable → OrderDetail sheet (timeline created→paid→settled,
  payer, pay method, fee, net, note, copy pay link, refund button).
- store: gatewayRefund action; mapGatewayOrder fields.

## Rules
- No emojis; lucide icons. Server-side refund via RPC. Fictional names. Plan→build→verify→deploy.
