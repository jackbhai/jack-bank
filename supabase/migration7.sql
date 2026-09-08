-- ============================================================
--  JACK BANK — migration 7 : real credit card + skins shop
--  · Credit card becomes a real payment method (balance OR card)
--  · Card billing: due date, minimum due, interest + late fee
--  · Skins shop: QR skins + colour themes (buy with balance, equip)
-- ============================================================

-- ---------- settings: card billing knobs ----------
alter table public.jb_settings add column if not exists card_late_fee numeric not null default 250;
alter table public.jb_settings add column if not exists card_min_due_pct numeric not null default 5;

-- ============================================================
--  Card charge helper (no transaction row — callers record it)
-- ============================================================
create or replace function public.jb_charge_card(p_user uuid, p_amount numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_card jb_cards%rowtype; v_avail numeric;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid amount');
  end if;
  select * into v_card from public.jb_cards where user_id = p_user and type = 'credit' limit 1;
  if v_card.id is null then return jsonb_build_object('ok', false, 'error', 'No credit card found'); end if;
  if v_card.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'Credit card is not active'); end if;
  v_avail := coalesce(v_card.credit_limit, 0) - coalesce(v_card.due_amount, 0);
  if p_amount > v_avail then
    return jsonb_build_object('ok', false, 'error',
      format('Credit limit exceeded — available %s', v_avail::text));
  end if;
  update public.jb_cards
    set due_amount = coalesce(due_amount, 0) + p_amount,
        due_date = coalesce(due_date, (date_trunc('month', now()) + interval '1 month - 1 day')::date)
    where id = v_card.id;
  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
--  transfer: pay by balance OR credit card
-- ============================================================
create or replace function public.jb_transfer_money(p_from uuid, p_to uuid, p_amount numeric, p_note text default null, p_method text default 'upi', p_source text default 'balance')
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_fee numeric := 0; v_cashback numeric := 0; v_settings jb_settings%rowtype;
  v_from jb_profiles%rowtype; v_to jb_profiles%rowtype; v_ref text; v_res jsonb;
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

  if p_source = 'card' then
    v_res := public.jb_charge_card(p_from, p_amount + v_fee, p_note);
    if v_res->>'ok' <> 'true' then return v_res; end if;
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
    values (v_ref, 'transfer', p_amount, p_from, p_to, p_note, case when p_source = 'card' then 'card' else p_method end, 'success', v_fee);
  if v_fee > 0 then
    insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, status)
      values (v_ref, 'fee', v_fee, p_from, null, 'Transaction fee', case when p_source = 'card' then 'card' else 'account' end, 'success');
  end if;
  if v_cashback > 0 then
    insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, status)
      values (v_ref, 'cashback', v_cashback, null, p_from, 'Cashback on transfer', 'account', 'success');
  end if;

  insert into public.jb_notifications (user_id, title, body)
    values (p_to, 'Money received', format('You received %s from %s', p_amount::text, v_from.name)),
           (p_from, 'Payment sent', format('You paid %s to %s%s', p_amount::text, v_to.name,
             case when p_source = 'card' then ' (credit card)' else '' end));
  return jsonb_build_object('ok', true, 'ref', v_ref);
end;
$$;

-- ============================================================
--  stock buy: pay by balance OR credit card (market orders)
-- ============================================================
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
                case when p_source = 'card' then 'card' else 'account' end);
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

  -- limit orders (funds must be reserved from balance; card not applicable)
  if p_side = 'buy' then
    v_cost := round(p_qty * p_limit_price, 2);
    if v_u.balance < v_cost then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
    update public.jb_profiles set balance = balance - v_cost where id = p_user;  -- block funds
  else
    select * into h from jb_stock_holdings where user_id = p_user and stock_id = p_stock;
    if h.id is null or h.qty < p_qty then return jsonb_build_object('ok', false, 'error', 'Insufficient shares'); end if;
    update public.jb_stock_holdings set qty = qty - p_qty where user_id = p_user and stock_id = p_stock;  -- block shares
  end if;
  insert into public.jb_stock_orders (user_id, stock_id, side, type, qty, limit_price, status)
    values (p_user, p_stock, p_side, p_type, p_qty, p_limit_price, 'open')
    returning id into oid;
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Limit order placed', format('%s %s × %s at %s', p_side, (select symbol from jb_stocks where id = p_stock), p_qty, p_limit_price::text));
  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
--  mutual fund buy: pay by balance OR credit card
-- ============================================================
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
  else
    if v_u.balance < p_amount then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
    update public.jb_profiles set balance = balance - p_amount where id = p_user;
  end if;
  insert into public.jb_mf_txns (user_id, fund_id, kind, units, nav, amount)
    values (p_user, p_fund, 'lumpsum', v_units, v_nav, p_amount);
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
    values (public.jb_gen_ref_no(), 'mf_buy', p_amount, p_user, null, 'Mutual fund: ' || v_f.name,
            case when p_source = 'card' then 'card' else 'account' end);
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Mutual fund purchase', format('%s units of %s allotted at NAV %s', v_units::text, v_f.name, v_nav::text));
  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
--  gateway pay: pay by balance OR credit card
-- ============================================================
create or replace function public.jb_gateway_pay(p_pay_token text, p_user uuid, p_source text default 'balance')
returns jsonb language plpgsql security definer set search_path = public
as $$
declare o record; m record; v_u jb_profiles%rowtype; v_s jb_settings%rowtype; v_fee numeric; v_net numeric; v_res jsonb;
begin
  if p_user is distinct from auth.uid() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  select * into o from jb_gateway_orders where pay_token = p_pay_token;
  if o.id is null then return jsonb_build_object('ok', false, 'error', 'Order not found'); end if;
  if o.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'Order already ' || o.status); end if;
  select * into m from jb_merchants where id = o.merchant_id;
  select * into v_u from jb_profiles where id = p_user;
  select * into v_s from jb_settings where id = 1;
  if p_source = 'card' then
    v_res := public.jb_charge_card(p_user, o.amount, 'Gateway: ' || m.name || ' · ' || o.order_ref);
    if v_res->>'ok' <> 'true' then return v_res; end if;
  else
    if v_u.balance < o.amount then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
    update public.jb_profiles set balance = balance - o.amount where id = p_user;
  end if;
  v_fee := round(o.amount * (v_s.gateway_fee_pct / 100), 2);
  v_net := o.amount - v_fee;
  update public.jb_merchants set settlement = settlement + v_net where id = m.id;
  update public.jb_gateway_orders set status = 'paid', payer_id = p_user, paid_at = now() where id = o.id;
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, fee)
    values (public.jb_gen_ref_no(), 'gateway_pay', o.amount, p_user, null, 'Gateway: ' || m.name || ' · ' || o.order_ref,
            case when p_source = 'card' then 'card' else 'upi' end, v_fee);
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Payment successful', format('%s paid to %s', o.amount::text, m.name));
  return jsonb_build_object('ok', true, 'amount', o.amount, 'merchant', m.name);
end;
$$;

-- ============================================================
--  card bill payment: also tag as 'card' method + notification
-- ============================================================
create or replace function public.jb_pay_card_bill(p_user uuid, p_amount numeric)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_card jb_cards%rowtype; v_u jb_profiles%rowtype; v_pay numeric;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into v_card from public.jb_cards where user_id = p_user and type = 'credit' limit 1;
  select * into v_u from public.jb_profiles where id = p_user;
  if v_card.id is null then return jsonb_build_object('ok', false, 'error', 'No credit card found'); end if;
  v_pay := least(coalesce(v_card.due_amount, 0), p_amount);
  if v_pay <= 0 then return jsonb_build_object('ok', false, 'error', 'No dues to pay'); end if;
  if v_u.balance < v_pay then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
  update public.jb_profiles set balance = balance - v_pay where id = p_user;
  update public.jb_cards set due_amount = coalesce(due_amount, 0) - v_pay where id = v_card.id;
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
    values (public.jb_gen_ref_no(), 'card_payment', v_pay, p_user, null, 'Credit card bill payment', 'card');
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Bill paid', format('%s paid towards your credit card bill', v_pay::text));
  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
--  card billing: interest + late fee on overdue dues (daily cron)
-- ============================================================
create or replace function public.jb_card_billing()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare c record; v_s jb_settings%rowtype; v_int numeric; v_late numeric; v_total numeric;
begin
  select * into v_s from public.jb_settings where id = 1;
  for c in select * from public.jb_cards where type = 'credit' and status = 'active' and coalesce(due_amount, 0) > 0 loop
    if c.due_date is not null and c.due_date < current_date then
      v_int := round(c.due_amount * (coalesce(v_s.credit_card_interest_rate, 36) / 1200), 2);
      v_late := coalesce(v_s.card_late_fee, 250);
      v_total := v_int + v_late;
      update public.jb_cards
        set due_amount = due_amount + v_total,
            due_date = c.due_date + interval '1 month'
        where id = c.id;
      insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
        values (public.jb_gen_ref_no(), 'interest', v_int, c.user_id, null, 'Credit card interest (overdue)', 'card');
      insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
        values (public.jb_gen_ref_no(), 'fee', v_late, c.user_id, null, 'Credit card late fee', 'card');
      insert into public.jb_notifications (user_id, title, body)
        values (c.user_id, 'Card dues overdue',
                format('Interest %s + late fee %s added to your credit card dues', v_int::text, v_late::text));
    end if;
  end loop;
  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
--  Skins shop
-- ============================================================
create table if not exists public.jb_skins (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('qr', 'theme')),
  name text not null unique,
  price numeric not null default 0,
  meta jsonb not null default '{}'::jsonb,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.jb_user_skins (
  user_id uuid not null references public.jb_profiles(id) on delete cascade,
  skin_id uuid not null references public.jb_skins(id) on delete cascade,
  bought_at timestamptz not null default now(),
  primary key (user_id, skin_id)
);

alter table public.jb_skins enable row level security;
alter table public.jb_user_skins enable row level security;
drop policy if exists "jb_skins_select" on public.jb_skins;
create policy "jb_skins_select" on public.jb_skins for select to authenticated using (true);
drop policy if exists "jb_user_skins_select" on public.jb_user_skins;
create policy "jb_user_skins_select" on public.jb_user_skins for select to authenticated
  using (user_id = auth.uid() or public.jb_is_admin());

create or replace function public.jb_buy_skin(p_skin uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_s jb_skins%rowtype; v_u jb_profiles%rowtype;
begin
  if p_skin is null then return jsonb_build_object('ok', false, 'error', 'Skin not found'); end if;
  select * into v_s from public.jb_skins where id = p_skin;
  if v_s.id is null then return jsonb_build_object('ok', false, 'error', 'Skin not found'); end if;
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  if exists (select 1 from public.jb_user_skins where user_id = auth.uid() and skin_id = p_skin) then
    return jsonb_build_object('ok', false, 'error', 'You already own this skin');
  end if;
  select * into v_u from public.jb_profiles where id = auth.uid();
  if v_u.balance < v_s.price then
    return jsonb_build_object('ok', false, 'error', format('Insufficient balance (price %s)', v_s.price::text));
  end if;
  update public.jb_profiles set balance = balance - v_s.price where id = auth.uid();
  insert into public.jb_user_skins (user_id, skin_id) values (auth.uid(), p_skin);
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
    values (public.jb_gen_ref_no(), 'skin_buy', v_s.price, auth.uid(), null, 'Bought ' || v_s.name || ' skin', 'account');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_equip_skin(p_skin uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_s jb_skins%rowtype; v_key text;
begin
  if p_skin is null then return jsonb_build_object('ok', false, 'error', 'Skin not found'); end if;
  select * into v_s from public.jb_skins where id = p_skin;
  if v_s.id is null then return jsonb_build_object('ok', false, 'error', 'Skin not found'); end if;
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  if v_s.price > 0 and not exists (select 1 from public.jb_user_skins where user_id = auth.uid() and skin_id = p_skin) then
    return jsonb_build_object('ok', false, 'error', 'Buy this skin first');
  end if;
  v_key := case when v_s.kind = 'qr' then 'active_qr_skin' else 'active_theme_skin' end;
  insert into public.jb_user_settings (user_id, cfg)
    values (auth.uid(), jsonb_build_object(v_key, v_s.id::text))
    on conflict (user_id) do update set cfg = jb_user_settings.cfg || jsonb_build_object(v_key, v_s.id::text), updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------- seed skin catalog (fictional names only) ----------
insert into public.jb_skins (kind, name, price, meta, sort) values
  ('qr',     'Classic',       0,    '{"bg":["#8b5cf6","#22d3ee"],"fg":"#ffffff"}'::jsonb, 1),
  ('qr',     'Midnight',      499,  '{"bg":["#0f172a","#1e293b"],"fg":"#38bdf8"}'::jsonb, 2),
  ('qr',     'Sunset',        799,  '{"bg":["#f43f5e","#f59e0b"],"fg":"#fff7ed"}'::jsonb, 3),
  ('qr',     'Emerald',       999,  '{"bg":["#065f46","#10b981"],"fg":"#ecfdf5"}'::jsonb, 4),
  ('qr',     'Ocean',         1299, '{"bg":["#0c4a6e","#38bdf8"],"fg":"#f0f9ff"}'::jsonb, 5),
  ('qr',     'Gold Foil',     1999, '{"bg":["#92400e","#fbbf24"],"fg":"#451a03"}'::jsonb, 6),
  ('qr',     'Neon',          2499, '{"bg":["#0a0a0a","#111111"],"fg":"#22ff88"}'::jsonb, 7),
  ('theme',  'Classic Violet',0,    '{"primary":"#8b5cf6","primary2":"#c084fc","accent":"#22d3ee"}'::jsonb, 8),
  ('theme',  'Lime',          699,  '{"primary":"#65a30d","primary2":"#a3e635","accent":"#14b8a6"}'::jsonb, 9),
  ('theme',  'Rose',          799,  '{"primary":"#e11d48","primary2":"#fb7185","accent":"#fbbf24"}'::jsonb, 10),
  ('theme',  'Crimson',       899,  '{"primary":"#b91c1c","primary2":"#f87171","accent":"#f59e0b"}'::jsonb, 11),
  ('theme',  'Ocean Blue',    999,  '{"primary":"#2563eb","primary2":"#60a5fa","accent":"#22d3ee"}'::jsonb, 12),
  ('theme',  'Amber Glow',    999,  '{"primary":"#d97706","primary2":"#fbbf24","accent":"#f43f5e"}'::jsonb, 13),
  ('theme',  'Teal Mint',     1199, '{"primary":"#0d9488","primary2":"#5eead4","accent":"#a3e635"}'::jsonb, 14),
  ('theme',  'Royal',         1499, '{"primary":"#7c3aed","primary2":"#a78bfa","accent":"#f472b6"}'::jsonb, 15)
on conflict (name) do nothing;

-- ---------- realtime: broadcast skins? not needed (single-user shop) ----------

-- ============================================================
--  pg_cron : daily card billing
-- ============================================================
do $$
begin
  if exists (select 1 from cron.job where jobname = 'jack-card-billing') then
    perform cron.unschedule('jack-card-billing');
  end if;
end $$;
select cron.schedule('jack-card-billing', '15 0 * * *', 'select public.jb_card_billing()');

-- ============================================================
--  money request: approve pay by balance OR credit card
-- ============================================================
create or replace function public.jb_respond_money_request(p_req uuid, p_action text, p_source text default 'balance')
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_req jb_money_requests%rowtype; v_res jsonb; v_payer jb_profiles%rowtype;
begin
  select * into v_req from public.jb_money_requests where id = p_req;
  if v_req.id is null then return jsonb_build_object('ok', false, 'error', 'Request not found'); end if;
  if v_req.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'Already handled'); end if;
  if v_req.to_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_action = 'pay' then
    v_res := public.jb_transfer_money(v_req.to_user, v_req.from_user, v_req.amount, coalesce(v_req.note, 'Money request'), 'upi', p_source);
    if v_res->>'ok' = 'true' then
      update public.jb_money_requests set status = 'paid' where id = p_req;
      select * into v_payer from jb_profiles where id = v_req.to_user;
      insert into public.jb_notifications (user_id, title, body)
        values (v_req.from_user, 'Request paid', format('%s paid your request of %s', v_payer.name, v_req.amount::text));
    end if;
    return v_res;
  elsif p_action = 'decline' then
    update public.jb_money_requests set status = 'declined' where id = p_req;
    insert into public.jb_notifications (user_id, title, body)
      values (v_req.from_user, 'Request declined', format('Your request of %s was declined', v_req.amount::text));
    return jsonb_build_object('ok', true);
  end if;
  return jsonb_build_object('ok', false, 'error', 'Bad action');
end;
$$;
