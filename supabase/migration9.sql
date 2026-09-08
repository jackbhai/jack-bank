-- ============================================================
--  JACK BANK — migration 9 : debit card + gateway pro-max
--  · debit card becomes a real payment method (like credit)
--  · OTP-based cross-device gateway payments (UPI ID / card)
--  · gateway events + settlement history + merchant controls
-- ============================================================

-- ---------- gateway order: OTP challenge columns ----------
alter table public.jb_gateway_orders
  add column if not exists otp text,
  add column if not exists otp_expires_at timestamptz,
  add column if not exists otp_method text,
  add column if not exists otp_upi_id text,
  add column if not exists otp_card_id uuid;

-- ---------- gateway event log ----------
create table if not exists public.jb_gateway_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.jb_gateway_orders(id) on delete cascade,
  merchant_id uuid references public.jb_merchants(id) on delete cascade,
  event text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists jb_gwevents_order_idx on public.jb_gateway_events(order_id);

-- ---------- settlement history ----------
create table if not exists public.jb_gateway_settlements (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.jb_merchants(id) on delete cascade,
  amount numeric(16,2) not null default 0,
  orders int not null default 0,
  settled_at timestamptz not null default now()
);

alter table public.jb_gateway_events enable row level security;
alter table public.jb_gateway_settlements enable row level security;
drop policy if exists "jb_gwevents_select" on public.jb_gateway_events;
create policy "jb_gwevents_select" on public.jb_gateway_events for select to authenticated using (public.jb_is_admin());
drop policy if exists "jb_gwsettle_select" on public.jb_gateway_settlements;
create policy "jb_gwsettle_select" on public.jb_gateway_settlements for select to authenticated using (public.jb_is_admin());

-- ---------- helper: log a gateway event ----------
create or replace function public.jb_gw_event(p_order uuid, p_merchant uuid, p_event text, p_meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.jb_gateway_events (order_id, merchant_id, event, meta) values (p_order, p_merchant, p_event, p_meta);
end;
$$;

-- ---------- debit card charge helper (balance-backed) ----------
create or replace function public.jb_charge_debit(p_user uuid, p_amount numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_card jb_cards%rowtype; v_u jb_profiles%rowtype;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid amount');
  end if;
  select * into v_card from public.jb_cards where user_id = p_user and type = 'debit' limit 1;
  if v_card.id is null then return jsonb_build_object('ok', false, 'error', 'No debit card found'); end if;
  if v_card.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'Debit card is not active'); end if;
  select * into v_u from public.jb_profiles where id = p_user;
  if v_u.balance < p_amount then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
  update public.jb_profiles set balance = balance - p_amount where id = p_user;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------- transfer: balance / debit card / credit card ----------
create or replace function public.jb_transfer_money(p_from uuid, p_to uuid, p_amount numeric, p_note text default null, p_method text default 'upi', p_source text default 'balance')
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_fee numeric := 0; v_cashback numeric := 0; v_settings jb_settings%rowtype;
  v_from jb_profiles%rowtype; v_to jb_profiles%rowtype; v_ref text; v_res jsonb; v_mth text;
begin
  if p_from is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_from = p_to then return jsonb_build_object('ok', false, 'error', 'Cannot transfer to yourself'); end if;
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('ok', false, 'error', 'Enter a valid amount'); end if;
  select * into v_from from public.jb_profiles where id = p_from;
  select * into v_to from public.jb_profiles where id = p_to;
  if v_from.id is null or v_to.id is null then return jsonb_build_object('ok', false, 'error', 'Account not found'); end if;
  if v_from.status = 'blocked' then return jsonb_build_object('ok', false, 'error', 'Your account is blocked'); end if;
  if v_to.status = 'blocked' then return jsonb_build_object('ok', false, 'error', 'Receiver account is blocked'); end if;
  select * into v_settings from public.jb_settings where id = 1;

  if p_method = 'upi' then
    v_fee := least(greatest(round(p_amount * v_settings.txn_fee_pct / 100, 2), v_settings.txn_fee_min), v_settings.txn_fee_cap);
  end if;
  v_ref := public.jb_gen_ref_no();

  v_mth := p_method;
  if p_source = 'card' then
    v_res := public.jb_charge_card(p_from, p_amount + v_fee, p_note);
    if v_res->>'ok' <> 'true' then return v_res; end if;
    v_mth := 'card';
  elsif p_source = 'debit' then
    v_res := public.jb_charge_debit(p_from, p_amount + v_fee, p_note);
    if v_res->>'ok' <> 'true' then return v_res; end if;
    v_mth := 'card';
  else
    if v_from.balance < p_amount + v_fee then
      return jsonb_build_object('ok', false, 'error', format('Insufficient balance (fee %s)', v_fee));
    end if;
    update public.jb_profiles set balance = balance - p_amount - v_fee where id = p_from;
    v_cashback := round(p_amount * v_settings.cashback_pct / 100, 2);
    if v_cashback > 0 then
      update public.jb_profiles set balance = balance + v_cashback, rewards = rewards + floor(p_amount / 100)::int where id = p_from;
    else
      update public.jb_profiles set rewards = rewards + floor(p_amount / 100)::int where id = p_from;
    end if;
  end if;

  update public.jb_profiles set balance = balance + p_amount where id = p_to;

  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, status, fee)
    values (v_ref, 'transfer', p_amount, p_from, p_to, p_note, v_mth, 'success', v_fee);
  if v_fee > 0 then
    insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, status)
      values (v_ref, 'fee', v_fee, p_from, null, 'Transaction fee', v_mth, 'success');
  end if;
  if v_cashback > 0 then
    insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, status)
      values (v_ref, 'cashback', v_cashback, null, p_from, 'Cashback on transfer', 'account', 'success');
  end if;

  insert into public.jb_notifications (user_id, title, body)
    values (p_to, 'Money received', format('You received %s from %s', p_amount::text, v_from.name)),
           (p_from, 'Payment sent', format('You paid %s to %s%s', p_amount::text, v_to.name,
             case when p_source in ('card','debit') then ' (' || case when p_source='debit' then 'debit card' else 'credit card' end || ')' else '' end));
  return jsonb_build_object('ok', true, 'ref', v_ref);
end;
$$;

-- ---------- stock buy: balance / debit / credit (market orders) ----------
create or replace function public.jb_stock_place_order(
  p_user uuid, p_stock uuid, p_side text, p_type text, p_qty int, p_limit_price numeric default null, p_source text default 'balance'
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_u jb_profiles%rowtype; v_s jb_stocks%rowtype; h record; v_cost numeric; oid uuid; v_res jsonb;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into v_u from jb_profiles where id = p_user;
  select * into v_s from jb_stocks where id = p_stock;
  if v_s.id is null then return jsonb_build_object('ok', false, 'error', 'Stock not found'); end if;
  if p_qty <= 0 then return jsonb_build_object('ok', false, 'error', 'Enter a valid quantity'); end if;
  if p_type = 'limit' and (p_limit_price is null or p_limit_price <= 0) then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid limit price');
  end if;

  if p_type = 'market' then
    if p_side = 'buy' then
      v_cost := round(p_qty * v_s.price, 2);
      if p_source = 'card' then
        v_res := public.jb_charge_card(p_user, v_cost, format('Bought %s × %s', p_qty, v_s.symbol));
        if v_res->>'ok' <> 'true' then return v_res; end if;
      elsif p_source = 'debit' then
        v_res := public.jb_charge_debit(p_user, v_cost, format('Bought %s × %s', p_qty, v_s.symbol));
        if v_res->>'ok' <> 'true' then return v_res; end if;
      else
        if v_u.balance < v_cost then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
        update public.jb_profiles set balance = balance - v_cost where id = p_user;
      end if;
      select * into h from jb_stock_holdings where user_id = p_user and stock_id = p_stock;
      if h.id is null then
        insert into public.jb_stock_holdings (user_id, stock_id, qty, avg_price) values (p_user, p_stock, p_qty, v_s.price);
      else
        update public.jb_stock_holdings
          set qty = qty + p_qty,
              avg_price = round(((qty * avg_price) + (p_qty * v_s.price)) / (qty + p_qty), 2)
          where user_id = p_user and stock_id = p_stock;
      end if;
      insert into public.jb_stock_orders (user_id, stock_id, side, type, qty, status, filled_qty, avg_price)
        values (p_user, p_stock, p_side, p_type, p_qty, 'filled', p_qty, v_s.price);
      insert into public.jb_stock_trades (user_id, stock_id, side, qty, price, amount)
        values (p_user, p_stock, p_side, p_qty, v_s.price, v_cost);
      insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
        values (public.jb_gen_ref_no(), 'stock_buy', v_cost, p_user, null, format('Bought %s × %s', p_qty, v_s.symbol),
                case when p_source in ('card','debit') then 'card' else 'account' end);
    else
      select * into h from jb_stock_holdings where user_id = p_user and stock_id = p_stock;
      if h.id is null or h.qty < p_qty then return jsonb_build_object('ok', false, 'error', 'Insufficient shares'); end if;
      v_cost := round(p_qty * v_s.price, 2);
      update public.jb_stock_holdings set qty = qty - p_qty where user_id = p_user and stock_id = p_stock;
      update public.jb_profiles set balance = balance + v_cost where id = p_user;
      insert into public.jb_stock_orders (user_id, stock_id, side, type, qty, status, filled_qty, avg_price)
        values (p_user, p_stock, p_side, p_type, p_qty, 'filled', p_qty, v_s.price);
      insert into public.jb_stock_trades (user_id, stock_id, side, qty, price, amount)
        values (p_user, p_stock, p_side, p_qty, v_s.price, v_cost);
      insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
        values (public.jb_gen_ref_no(), 'stock_sell', v_cost, null, p_user, format('Sold %s × %s', p_qty, v_s.symbol), 'account');
    end if;
    return jsonb_build_object('ok', true);
  end if;

  -- limit orders (balance only)
  if p_side = 'buy' then
    v_cost := round(p_qty * p_limit_price, 2);
    if v_u.balance < v_cost then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
    update public.jb_profiles set balance = balance - v_cost where id = p_user;
  else
    select * into h from jb_stock_holdings where user_id = p_user and stock_id = p_stock;
    if h.id is null or h.qty < p_qty then return jsonb_build_object('ok', false, 'error', 'Insufficient shares'); end if;
    update public.jb_stock_holdings set qty = qty - p_qty where user_id = p_user and stock_id = p_stock;
  end if;
  insert into public.jb_stock_orders (user_id, stock_id, side, type, qty, limit_price, status)
    values (p_user, p_stock, p_side, p_type, p_qty, p_limit_price, 'open')
    returning id into oid;
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Limit order placed', format('%s %s × %s at %s', p_side, (select symbol from jb_stocks where id = p_stock), p_qty, p_limit_price::text));
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------- mutual fund buy: balance / debit / credit ----------
create or replace function public.jb_mf_buy(p_user uuid, p_fund uuid, p_amount numeric, p_source text default 'balance')
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_u jb_profiles%rowtype; v_f jb_mf_funds%rowtype; v_units numeric; v_nav numeric; h record; v_res jsonb;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into v_u from jb_profiles where id = p_user;
  select * into v_f from jb_mf_funds where id = p_fund;
  if v_f.id is null then return jsonb_build_object('ok', false, 'error', 'Fund not found'); end if;
  if p_amount < v_f.min_lumpsum then return jsonb_build_object('ok', false, 'error', format('Minimum investment is %s', v_f.min_lumpsum::text)); end if;
  v_nav := v_f.nav;
  v_units := round(p_amount / v_nav, 4);
  select * into h from jb_mf_holdings where user_id = p_user and fund_id = p_fund;
  if h.id is null then
    insert into public.jb_mf_holdings (user_id, fund_id, units, invested, avg_nav)
      values (p_user, p_fund, v_units, p_amount, v_nav);
  else
    update public.jb_mf_holdings
      set units = units + v_units,
          invested = invested + p_amount,
          avg_nav = round((invested + p_amount) / nullif(units + v_units, 0), 4)
      where user_id = p_user and fund_id = p_fund;
  end if;
  if p_source = 'card' then
    v_res := public.jb_charge_card(p_user, p_amount, 'Mutual fund: ' || v_f.name);
    if v_res->>'ok' <> 'true' then return v_res; end if;
  elsif p_source = 'debit' then
    v_res := public.jb_charge_debit(p_user, p_amount, 'Mutual fund: ' || v_f.name);
    if v_res->>'ok' <> 'true' then return v_res; end if;
  else
    if v_u.balance < p_amount then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
    update public.jb_profiles set balance = balance - p_amount where id = p_user;
  end if;
  insert into public.jb_mf_txns (user_id, fund_id, kind, units, nav, amount)
    values (p_user, p_fund, 'lumpsum', v_units, v_nav, p_amount);
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
    values (public.jb_gen_ref_no(), 'mf_buy', p_amount, p_user, null, 'Mutual fund: ' || v_f.name,
            case when p_source in ('card','debit') then 'card' else 'account' end);
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Mutual fund purchase', format('%s units of %s allotted at NAV %s', v_units::text, v_f.name, v_nav::text));
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------- gateway pay (logged-in): balance / debit / credit ----------
create or replace function public.jb_gateway_pay(p_pay_token text, p_user uuid, p_source text default 'balance')
returns jsonb language plpgsql security definer set search_path = public
as $$
declare o record; m record; v_u jb_profiles%rowtype; v_s jb_settings%rowtype; v_fee numeric; v_net numeric; v_res jsonb; v_mth text;
begin
  if p_user is distinct from auth.uid() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  select * into o from jb_gateway_orders where pay_token = p_pay_token;
  if o.id is null then return jsonb_build_object('ok', false, 'error', 'Order not found'); end if;
  if o.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'Order already ' || o.status); end if;
  select * into m from jb_merchants where id = o.merchant_id;
  select * into v_u from jb_profiles where id = p_user;
  select * into v_s from jb_settings where id = 1;
  if m.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'Merchant is not accepting payments'); end if;

  if p_source = 'card' then
    v_res := public.jb_charge_card(p_user, o.amount, 'Gateway: ' || m.name || ' · ' || o.order_ref);
    if v_res->>'ok' <> 'true' then return v_res; end if;
    v_mth := 'card';
  elsif p_source = 'debit' then
    v_res := public.jb_charge_debit(p_user, o.amount, 'Gateway: ' || m.name || ' · ' || o.order_ref);
    if v_res->>'ok' <> 'true' then return v_res; end if;
    v_mth := 'card';
  else
    if v_u.balance < o.amount then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
    update public.jb_profiles set balance = balance - o.amount where id = p_user;
    v_mth := 'upi';
  end if;

  v_fee := round(o.amount * (v_s.gateway_fee_pct / 100), 2);
  v_net := o.amount - v_fee;
  update public.jb_merchants set settlement = settlement + v_net where id = m.id;
  update public.jb_gateway_orders
    set status = 'paid', payer_id = p_user, paid_at = now(), pay_method = p_source, fee = v_fee, otp = null, otp_expires_at = null
    where id = o.id;
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, fee)
    values (public.jb_gen_ref_no(), 'gateway_pay', o.amount, p_user, null, 'Gateway: ' || m.name || ' · ' || o.order_ref, v_mth, v_fee);
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Payment successful', format('%s paid to %s', o.amount::text, m.name));
  perform public.jb_gw_event(o.id, m.id, 'paid', jsonb_build_object('method', p_source, 'fee', v_fee));
  return jsonb_build_object('ok', true, 'amount', o.amount, 'merchant', m.name, 'order_ref', o.order_ref, 'fee', v_fee);
end;
$$;

-- ---------- gateway create order: log event ----------
create or replace function public.jb_gateway_create_order(p_api_key text, p_api_secret text, p_order_ref text, p_amount numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare m record; o record;
begin
  select * into m from jb_merchants where api_key = p_api_key and api_secret = p_api_secret;
  if m.id is null or m.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'Invalid API credentials'); end if;
  if p_amount <= 0 then return jsonb_build_object('ok', false, 'error', 'Invalid amount'); end if;
  insert into public.jb_gateway_orders (merchant_id, order_ref, amount, note, status)
    values (m.id, p_order_ref, p_amount, p_note, 'pending')
    on conflict (merchant_id, order_ref) do update set amount = excluded.amount, note = excluded.note, status = 'pending', pay_token = public.jb_gateway_orders.pay_token, otp = null, otp_expires_at = null
    returning id, pay_token, amount, status into o;
  perform public.jb_gw_event(o.id, m.id, 'created', jsonb_build_object('amount', o.amount));
  return jsonb_build_object('ok', true, 'order', jsonb_build_object(
    'id', o.id, 'pay_token', o.pay_token, 'order_ref', p_order_ref, 'amount', o.amount, 'currency', 'INR',
    'status', o.status, 'pay_url', 'https://jackbhai.github.io/jack-bank/#/gateway/' || o.pay_token));
end;
$$;

-- ---------- gateway initiate OTP (cross-device; anon OK) ----------
create or replace function public.jb_gateway_initiate(p_pay_token text, p_method text, p_upi_id text default null, p_card_number text default null, p_expiry text default null, p_cvv text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare o record; m record; v_u jb_profiles%rowtype; v_c jb_cards%rowtype; v_otp text; v_payer uuid; v_upi text; v_card uuid;
begin
  select * into o from jb_gateway_orders where pay_token = p_pay_token;
  if o.id is null then return jsonb_build_object('ok', false, 'error', 'Order not found'); end if;
  if o.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'Order already ' || o.status); end if;
  select * into m from jb_merchants where id = o.merchant_id;
  if m.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'Merchant is not accepting payments'); end if;

  if p_method = 'upi' then
    select * into v_u from public.jb_profiles where upi_id = trim(coalesce(p_upi_id, '')) limit 1;
    if v_u.id is null then return jsonb_build_object('ok', false, 'error', 'UPI ID not found'); end if;
    if v_u.status = 'blocked' then return jsonb_build_object('ok', false, 'error', 'That account is blocked'); end if;
    v_payer := v_u.id; v_upi := v_u.upi_id; v_card := null;
  elsif p_method = 'card' then
    select * into v_c from public.jb_cards where replace(number, ' ', '') = replace(coalesce(p_card_number, ''), ' ', '') limit 1;
    if v_c.id is null then return jsonb_build_object('ok', false, 'error', 'Card not found'); end if;
    if v_c.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'Card is not active'); end if;
    v_payer := v_c.user_id; v_upi := '•••• ' || right(v_c.number, 4); v_card := v_c.id;
  else
    return jsonb_build_object('ok', false, 'error', 'Bad payment method');
  end if;

  v_otp := lpad(floor(random() * 1000000)::int::text, 6, '0');
  update public.jb_gateway_orders
    set otp = v_otp, otp_expires_at = now() + interval '5 minutes', otp_method = p_method, otp_upi_id = v_upi, otp_card_id = v_card
    where id = o.id;
  insert into public.jb_notifications (user_id, title, body)
    values (v_payer, 'Payment verification OTP', format('OTP %s to pay %s to %s (order %s). Valid 5 minutes.', v_otp, o.amount::text, m.name, o.order_ref));
  perform public.jb_gw_event(o.id, m.id, 'otp_sent', jsonb_build_object('method', p_method, 'to', v_upi));
  return jsonb_build_object('ok', true, 'method', p_method, 'to', v_upi, 'expires_in', 300);
end;
$$;

-- ---------- gateway confirm with OTP (anon OK) ----------
create or replace function public.jb_gateway_confirm(p_pay_token text, p_otp text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare o record; m record; v_u jb_profiles%rowtype; v_c jb_cards%rowtype; v_s jb_settings%rowtype; v_fee numeric; v_net numeric; v_mth text; v_payer uuid;
begin
  select * into o from jb_gateway_orders where pay_token = p_pay_token;
  if o.id is null then return jsonb_build_object('ok', false, 'error', 'Order not found'); end if;
  if o.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'Order already ' || o.status); end if;
  if o.otp is null then return jsonb_build_object('ok', false, 'error', 'Request an OTP first'); end if;
  if o.otp <> trim(coalesce(p_otp, '')) then return jsonb_build_object('ok', false, 'error', 'Incorrect OTP'); end if;
  if o.otp_expires_at is null or o.otp_expires_at < now() then return jsonb_build_object('ok', false, 'error', 'OTP expired — request a new one'); end if;
  select * into m from jb_merchants where id = o.merchant_id;
  select * into v_s from jb_settings where id = 1;

  if o.otp_method = 'upi' then
    select * into v_u from public.jb_profiles where upi_id = o.otp_upi_id;
    v_payer := v_u.id;
    if v_u.balance < o.amount then return jsonb_build_object('ok', false, 'error', 'Insufficient balance in that account'); end if;
    update public.jb_profiles set balance = balance - o.amount where id = v_u.id;
    v_mth := 'upi';
  else
    select * into v_c from public.jb_cards where id = o.otp_card_id;
    v_payer := v_c.user_id;
    select * into v_u from public.jb_profiles where id = v_c.user_id;
    if v_c.type = 'credit' then
      declare v_res jsonb;
      begin
        v_res := public.jb_charge_card(v_c.user_id, o.amount, 'Gateway: ' || m.name || ' · ' || o.order_ref);
        if v_res->>'ok' <> 'true' then return v_res; end if;
      end;
      v_mth := 'card';
    else
      if v_u.balance < o.amount then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
      update public.jb_profiles set balance = balance - o.amount where id = v_u.id;
      v_mth := 'card';
    end if;
  end if;

  v_fee := round(o.amount * (v_s.gateway_fee_pct / 100), 2);
  v_net := o.amount - v_fee;
  update public.jb_merchants set settlement = settlement + v_net where id = m.id;
  update public.jb_gateway_orders
    set status = 'paid', payer_id = v_payer, paid_at = now(), pay_method = o.otp_method, fee = v_fee, otp = null, otp_expires_at = null
    where id = o.id;
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, fee)
    values (public.jb_gen_ref_no(), 'gateway_pay', o.amount, v_payer, null, 'Gateway: ' || m.name || ' · ' || o.order_ref, v_mth, v_fee);
  insert into public.jb_notifications (user_id, title, body)
    values (v_payer, 'Payment successful', format('%s paid to %s', o.amount::text, m.name));
  perform public.jb_gw_event(o.id, m.id, 'paid', jsonb_build_object('method', o.otp_method, 'fee', v_fee));
  return jsonb_build_object('ok', true, 'amount', o.amount, 'merchant', m.name, 'order_ref', o.order_ref);
end;
$$;

-- ---------- settle: record settlement history ----------
create or replace function public.jb_gateway_settle(p_merchant uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare m record; amt numeric; v_count int;
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  select * into m from jb_merchants where id = p_merchant;
  if m.id is null then return jsonb_build_object('ok', false, 'error', 'Merchant not found'); end if;
  amt := m.settlement;
  select count(*) into v_count from jb_gateway_orders where merchant_id = p_merchant and status = 'paid' and settled_at is null;
  update public.jb_merchants set settlement = 0 where id = p_merchant;
  update public.jb_gateway_orders set settled_at = now() where merchant_id = p_merchant and status = 'paid' and settled_at is null;
  if amt > 0 then
    insert into public.jb_gateway_settlements (merchant_id, amount, orders) values (p_merchant, amt, v_count);
  end if;
  perform public.jb_gw_event(null, m.id, 'settled', jsonb_build_object('amount', amt, 'orders', v_count));
  return jsonb_build_object('ok', true, 'amount', amt, 'orders_settled', v_count);
end;
$$;

-- ---------- refund: log event ----------
create or replace function public.jb_gateway_refund(p_order uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare o record; v_u jb_profiles%rowtype; v_net numeric;
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  select * into o from jb_gateway_orders where id = p_order;
  if o.id is null then return jsonb_build_object('ok', false, 'error', 'Order not found'); end if;
  if o.status <> 'paid' then return jsonb_build_object('ok', false, 'error', 'Only paid orders can be refunded'); end if;
  v_net := o.amount - o.fee;
  if o.payer_id is not null then
    update public.jb_profiles set balance = balance + o.amount where id = o.payer_id;
  end if;
  update public.jb_merchants set settlement = greatest(0, settlement - v_net) where id = o.merchant_id;
  update public.jb_gateway_orders set status = 'refunded' where id = o.id;
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
    values (public.jb_gen_ref_no(), 'gateway_refund', o.amount, null, o.payer_id, 'Refund: ' || o.order_ref, 'upi');
  if o.payer_id is not null then
    insert into public.jb_notifications (user_id, title, body)
      values (o.payer_id, 'Refund received', format('%s refunded for order %s', o.amount::text, o.order_ref));
  end if;
  perform public.jb_gw_event(o.id, o.merchant_id, 'refunded', jsonb_build_object('amount', o.amount));
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------- merchant controls ----------
create or replace function public.jb_merchant_set_status(p_merchant uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  if p_status not in ('active', 'blocked') then return jsonb_build_object('ok', false, 'error', 'Bad status'); end if;
  update public.jb_merchants set status = p_status where id = p_merchant;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_merchant_rotate_keys(p_merchant uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare m record; nk text; ns text;
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  select * into m from jb_merchants where id = p_merchant;
  if m.id is null then return jsonb_build_object('ok', false, 'error', 'Merchant not found'); end if;
  nk := 'jk_live_' || replace(gen_random_uuid()::text, '-', '');
  ns := 'jk_sec_' || replace(gen_random_uuid()::text, '-', '');
  update public.jb_merchants set api_key = nk, api_secret = ns where id = p_merchant;
  return jsonb_build_object('ok', true, 'api_key', nk, 'api_secret', ns);
end;
$$;
