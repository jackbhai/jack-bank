-- ═══════════════════════════════════════════════════════════════
-- migration15: merchant payouts (game withdrawals / winnings)
--
--   jb_gateway_payout(p_api_key, p_api_secret, p_order_ref,
--                     p_amount, p_idempotency_key, p_note?)
--     → pays from the merchant's UNSETTLED balance into the wallet of
--       the user who paid that order (payer). Idempotent per
--       (merchant, idempotency_key): same key returns the first result.
--     → errors: Invalid API credentials / Invalid amount /
--       Idempotency key required / Order not found / Order is not paid /
--       Order has no payer / Insufficient merchant balance
--
--   jb_gateway_payout_status(p_api_key, p_api_secret, p_idempotency_key)
--     → { ok, payout_id, amount, status } or { ok:false, error }
-- ═══════════════════════════════════════════════════════════════

-- ---------- payouts ledger (RPC-only, admin-readable) ----------
create table if not exists public.jb_gateway_payouts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.jb_merchants(id) on delete cascade,
  order_id uuid references public.jb_gateway_orders(id) on delete set null,
  payer_id uuid references public.jb_profiles(id) on delete set null,
  amount numeric(16,2) not null check (amount > 0),
  idempotency_key text not null,
  note text,
  status text not null default 'paid' check (status in ('paid')),
  created_at timestamptz not null default now(),
  unique (merchant_id, idempotency_key)
);
create index if not exists jb_gwpay_merchant_idx
  on public.jb_gateway_payouts (merchant_id, created_at desc);
alter table public.jb_gateway_payouts enable row level security;
drop policy if exists "jb_gwpay_select" on public.jb_gateway_payouts;
create policy "jb_gwpay_select" on public.jb_gateway_payouts
  for select to authenticated using (public.jb_is_admin());

-- ---------- payout: merchant settlement -> payer wallet ----------
create or replace function public.jb_gateway_payout(
  p_api_key text, p_api_secret text, p_order_ref text,
  p_amount numeric, p_idempotency_key text, p_note text default null
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare m record; o record; p record; v_amt numeric; v_pid uuid;
begin
  select * into m from jb_merchants where api_key = p_api_key and api_secret = p_api_secret;
  if m.id is null or m.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'Invalid API credentials'); end if;

  v_amt := round(coalesce(p_amount, 0), 2);
  if v_amt <= 0 then return jsonb_build_object('ok', false, 'error', 'Invalid amount'); end if;
  if coalesce(trim(p_idempotency_key), '') = '' then return jsonb_build_object('ok', false, 'error', 'Idempotency key required'); end if;

  -- idempotent replay: same key returns the original result, never double-pays
  select * into p from jb_gateway_payouts where merchant_id = m.id and idempotency_key = p_idempotency_key;
  if p.id is not null then
    return jsonb_build_object('ok', true, 'payout_id', p.id, 'amount', p.amount, 'status', p.status, 'duplicate', true);
  end if;

  -- the payout target is proven by a PAID order: winnings go to whoever paid
  select * into o from jb_gateway_orders where merchant_id = m.id and order_ref = p_order_ref;
  if o.id is null then return jsonb_build_object('ok', false, 'error', 'Order not found'); end if;
  if o.status <> 'paid' then return jsonb_build_object('ok', false, 'error', 'Order is not paid'); end if;
  if o.payer_id is null then return jsonb_build_object('ok', false, 'error', 'Order has no payer'); end if;

  -- atomic debit: concurrent payouts can never overdraw the pool
  update public.jb_merchants set settlement = settlement - v_amt where id = m.id and settlement >= v_amt;
  if not found then return jsonb_build_object('ok', false, 'error', 'Insufficient merchant balance'); end if;

  update public.jb_profiles set balance = balance + v_amt where id = o.payer_id;
  insert into public.jb_gateway_payouts (merchant_id, order_id, payer_id, amount, idempotency_key, note)
    values (m.id, o.id, o.payer_id, v_amt, p_idempotency_key, p_note)
    returning id into v_pid;
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
    values (public.jb_gen_ref_no(), 'gateway_payout', v_amt, null, o.payer_id, 'Payout: ' || m.name || ' · ' || o.order_ref, 'upi');
  insert into public.jb_notifications (user_id, title, body)
    values (o.payer_id, 'Payout received', format('%s received from %s', v_amt::text, m.name));
  perform public.jb_gw_event(o.id, m.id, 'payout', jsonb_build_object('amount', v_amt, 'payout_id', v_pid));
  return jsonb_build_object('ok', true, 'payout_id', v_pid, 'amount', v_amt, 'status', 'paid');

exception when unique_violation then
  -- lost a race with an identical retry: return the winner, never error the merchant
  select * into p from jb_gateway_payouts where merchant_id = m.id and idempotency_key = p_idempotency_key;
  if p.id is not null then
    return jsonb_build_object('ok', true, 'payout_id', p.id, 'amount', p.amount, 'status', p.status, 'duplicate', true);
  end if;
  return jsonb_build_object('ok', false, 'error', 'Payout failed, retry with a new key');
end;
$$;

-- ---------- payout status (safe to poll after a timeout) ----------
create or replace function public.jb_gateway_payout_status(p_api_key text, p_api_secret text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare m record; p record;
begin
  select * into m from jb_merchants where api_key = p_api_key and api_secret = p_api_secret;
  if m.id is null or m.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'Invalid API credentials'); end if;
  select * into p from jb_gateway_payouts where merchant_id = m.id and idempotency_key = p_idempotency_key;
  if p.id is null then return jsonb_build_object('ok', false, 'error', 'Payout not found'); end if;
  return jsonb_build_object('ok', true, 'payout_id', p.id, 'amount', p.amount, 'status', p.status);
end;
$$;
