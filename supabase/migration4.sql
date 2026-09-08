-- ============================================================
--  JACK BANK — migration 4 : deep financial markets + gateway
--  KYC · Mutual Funds · Stock Market · Payment Gateway
-- ============================================================

-- ---------- settings: add gateway fee ----------
alter table public.jb_settings add column if not exists gateway_fee_pct numeric not null default 1.5;

-- ============================================================
-- KYC documents
-- ============================================================
create table if not exists public.jb_kyc (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.jb_profiles(id) on delete cascade,
  pan text,
  aadhaar_masked text,
  dob text,
  gender text,
  occupation text,
  income_band text,
  address text,
  city text,
  state text,
  pincode text,
  nominee_name text,
  nominee_relation text,
  status text not null default 'pending',
  submitted_at timestamptz not null default now()
);

-- ============================================================
-- Mutual funds
-- ============================================================
create table if not exists public.jb_mf_funds (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  fund_house text not null,
  category text not null,
  risk text not null default 'Moderate',
  nav numeric(14,4) not null,
  prev_nav numeric(14,4) not null default 0,
  aum numeric(16,2) not null default 0,
  expense_ratio numeric(6,2) not null default 1.0,
  min_lumpsum numeric not null default 500,
  min_sip numeric not null default 100,
  ret_1y numeric(6,2) not null default 0,
  ret_3y numeric(6,2) not null default 0,
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists public.jb_mf_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.jb_profiles(id) on delete cascade,
  fund_id uuid not null references public.jb_mf_funds(id) on delete cascade,
  units numeric(16,4) not null default 0,
  invested numeric(16,2) not null default 0,
  avg_nav numeric(14,4) not null default 0,
  sip_active boolean not null default false,
  sip_amount numeric,
  sip_day int,
  unique (user_id, fund_id)
);

create table if not exists public.jb_mf_txns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.jb_profiles(id) on delete cascade,
  fund_id uuid not null references public.jb_mf_funds(id) on delete cascade,
  kind text not null,
  units numeric(16,4) not null,
  nav numeric(14,4) not null,
  amount numeric(16,2) not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Stock market
-- ============================================================
create table if not exists public.jb_stocks (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  name text not null,
  sector text not null,
  price numeric(14,2) not null,
  prev_close numeric(14,2) not null default 0,
  day_open numeric(14,2) not null default 0,
  day_high numeric(14,2) not null default 0,
  day_low numeric(14,2) not null default 0,
  volume bigint not null default 0,
  market_cap numeric(18,2) not null default 0,
  pe numeric(8,2) not null default 0,
  high_52w numeric(14,2) not null default 0,
  low_52w numeric(14,2) not null default 0,
  history jsonb not null default '[]'::jsonb
);

create table if not exists public.jb_stock_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.jb_profiles(id) on delete cascade,
  stock_id uuid not null references public.jb_stocks(id) on delete cascade,
  side text not null check (side in ('buy', 'sell')),
  type text not null check (type in ('market', 'limit')),
  qty int not null,
  limit_price numeric(14,2),
  status text not null default 'open' check (status in ('open', 'filled', 'cancelled')),
  filled_qty int not null default 0,
  avg_price numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.jb_stock_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.jb_profiles(id) on delete cascade,
  stock_id uuid not null references public.jb_stocks(id) on delete cascade,
  qty int not null default 0,
  avg_price numeric(14,2) not null default 0,
  unique (user_id, stock_id)
);

create table if not exists public.jb_stock_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.jb_profiles(id) on delete cascade,
  stock_id uuid not null references public.jb_stocks(id) on delete cascade,
  side text not null,
  qty int not null,
  price numeric(14,2) not null,
  amount numeric(16,2) not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Payment gateway
-- ============================================================
create table if not exists public.jb_merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  app_name text not null,
  callback_url text,
  api_key text not null unique default ('jk_live_' || replace(gen_random_uuid()::text, '-', '')),
  api_secret text not null default ('jk_sec_' || replace(gen_random_uuid()::text, '-', '')),
  settlement numeric(16,2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.jb_gateway_orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.jb_merchants(id) on delete cascade,
  order_ref text not null,
  amount numeric(16,2) not null,
  currency text not null default 'INR',
  note text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  payer_id uuid references public.jb_profiles(id) on delete set null,
  pay_token text unique default ('pay_' || replace(gen_random_uuid()::text, '-', '')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (merchant_id, order_ref)
);

-- ============================================================
-- RLS policies
-- ============================================================
alter table public.jb_kyc enable row level security;
alter table public.jb_mf_funds enable row level security;
alter table public.jb_mf_holdings enable row level security;
alter table public.jb_mf_txns enable row level security;
alter table public.jb_stocks enable row level security;
alter table public.jb_stock_orders enable row level security;
alter table public.jb_stock_holdings enable row level security;
alter table public.jb_stock_trades enable row level security;
alter table public.jb_merchants enable row level security;
alter table public.jb_gateway_orders enable row level security;

drop policy if exists "jb_kyc_select" on public.jb_kyc;
create policy "jb_kyc_select" on public.jb_kyc for select to authenticated using (user_id = auth.uid() or public.jb_is_admin());

drop policy if exists "jb_mf_funds_select" on public.jb_mf_funds;
create policy "jb_mf_funds_select" on public.jb_mf_funds for select to authenticated using (true);
drop policy if exists "jb_mf_hold_select" on public.jb_mf_holdings;
create policy "jb_mf_hold_select" on public.jb_mf_holdings for select to authenticated using (user_id = auth.uid() or public.jb_is_admin());
drop policy if exists "jb_mf_txn_select" on public.jb_mf_txns;
create policy "jb_mf_txn_select" on public.jb_mf_txns for select to authenticated using (user_id = auth.uid() or public.jb_is_admin());

drop policy if exists "jb_stocks_select" on public.jb_stocks;
create policy "jb_stocks_select" on public.jb_stocks for select to authenticated using (true);
drop policy if exists "jb_stock_orders_select" on public.jb_stock_orders;
create policy "jb_stock_orders_select" on public.jb_stock_orders for select to authenticated using (user_id = auth.uid() or public.jb_is_admin());
drop policy if exists "jb_stock_hold_select" on public.jb_stock_holdings;
create policy "jb_stock_hold_select" on public.jb_stock_holdings for select to authenticated using (user_id = auth.uid() or public.jb_is_admin());
drop policy if exists "jb_stock_trades_select" on public.jb_stock_trades;
create policy "jb_stock_trades_select" on public.jb_stock_trades for select to authenticated using (user_id = auth.uid() or public.jb_is_admin());

drop policy if exists "jb_merchants_select" on public.jb_merchants;
create policy "jb_merchants_select" on public.jb_merchants for select to authenticated using (public.jb_is_admin());
drop policy if exists "jb_gw_orders_select" on public.jb_gateway_orders;
create policy "jb_gw_orders_select" on public.jb_gateway_orders for select to authenticated using (public.jb_is_admin());

-- ============================================================
-- KYC submit (deep form)
-- ============================================================
create or replace function public.jb_submit_kyc(
  p_user uuid, p_pan text, p_dob text, p_gender text, p_occupation text,
  p_income_band text, p_address text, p_city text, p_state text, p_pincode text,
  p_nominee_name text default null, p_nominee_relation text default null
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_u jb_profiles%rowtype; v_pan text;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into v_u from jb_profiles where id = p_user;
  if v_u.id is null then return jsonb_build_object('ok', false, 'error', 'Account not found'); end if;
  v_pan := upper(trim(p_pan));
  if v_pan = '' or length(v_pan) < 8 then return jsonb_build_object('ok', false, 'error', 'Enter a valid PAN'); end if;
  insert into public.jb_kyc (user_id, pan, aadhaar_masked, dob, gender, occupation, income_band, address, city, state, pincode, nominee_name, nominee_relation, status)
  values (p_user, v_pan, 'XXXX-XXXX-' || right(v_pan, 2), p_dob, p_gender, p_occupation, p_income_band, p_address, p_city, p_state, p_pincode, p_nominee_name, p_nominee_relation, 'pending')
  on conflict (user_id) do update set
    pan = excluded.pan, aadhaar_masked = excluded.aadhaar_masked, dob = excluded.dob,
    gender = excluded.gender, occupation = excluded.occupation, income_band = excluded.income_band,
    address = excluded.address, city = excluded.city, state = excluded.state, pincode = excluded.pincode,
    nominee_name = excluded.nominee_name, nominee_relation = excluded.nominee_relation,
    status = 'pending', submitted_at = now();
  insert into public.jb_requests (kind, user_id, meta) values (
    'kyc', p_user,
    jsonb_build_object('pan', v_pan, 'dob', p_dob, 'occupation', p_occupation, 'income_band', p_income_band, 'city', p_city, 'state', p_state)
  );
  return jsonb_build_object('ok', true);
end;
$$;

-- keep kyc doc status in sync with profile approval
create or replace function public.jb_sync_kyc_status()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.jb_kyc set status = new.kyc_status where user_id = new.id;
  return new;
end;
$$;
drop trigger if exists jb_kyc_status_sync on public.jb_profiles;
create trigger jb_kyc_status_sync after update of kyc_status on public.jb_profiles
for each row execute function public.jb_sync_kyc_status();

-- ============================================================
-- Mutual fund RPCs
-- ============================================================
create or replace function public.jb_mf_buy(p_user uuid, p_fund uuid, p_amount numeric)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_u jb_profiles%rowtype; v_f jb_mf_funds%rowtype; v_units numeric; v_nav numeric; h record;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into v_u from jb_profiles where id = p_user;
  select * into v_f from jb_mf_funds where id = p_fund;
  if v_f.id is null then return jsonb_build_object('ok', false, 'error', 'Fund not found'); end if;
  if p_amount < v_f.min_lumpsum then return jsonb_build_object('ok', false, 'error', format('Minimum investment is %s', v_f.min_lumpsum::text)); end if;
  if v_u.balance < p_amount then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
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
  update public.jb_profiles set balance = balance - p_amount where id = p_user;
  insert into public.jb_mf_txns (user_id, fund_id, kind, units, nav, amount)
    values (p_user, p_fund, 'lumpsum', v_units, v_nav, p_amount);
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
    values (public.jb_gen_ref_no(), 'mf_buy', p_amount, p_user, null, 'Mutual fund: ' || v_f.name, 'account');
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Mutual fund purchase', format('%s units of %s allotted at NAV %s', v_units::text, v_f.name, v_nav::text));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_mf_redeem(p_user uuid, p_fund uuid, p_units numeric)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_f jb_mf_funds%rowtype; h record; v_val numeric;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into h from jb_mf_holdings where user_id = p_user and fund_id = p_fund;
  if h.id is null or h.units < p_units or p_units <= 0 then return jsonb_build_object('ok', false, 'error', 'Insufficient units'); end if;
  select * into v_f from jb_mf_funds where id = p_fund;
  v_val := round(p_units * v_f.nav, 2);
  update public.jb_mf_holdings set units = units - p_units, invested = greatest(0, invested - (p_units * h.avg_nav))
    where user_id = p_user and fund_id = p_fund;
  update public.jb_profiles set balance = balance + v_val where id = p_user;
  insert into public.jb_mf_txns (user_id, fund_id, kind, units, nav, amount)
    values (p_user, p_fund, 'redeem', p_units, v_f.nav, v_val);
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
    values (public.jb_gen_ref_no(), 'mf_redeem', v_val, null, p_user, 'MF redemption: ' || v_f.name, 'account');
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Mutual fund redeemed', format('%s redeemed from %s', v_val::text, v_f.name));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_mf_setup_sip(p_user uuid, p_fund uuid, p_amount numeric, p_day int)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_f jb_mf_funds%rowtype; h record;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into v_f from jb_mf_funds where id = p_fund;
  if v_f.id is null then return jsonb_build_object('ok', false, 'error', 'Fund not found'); end if;
  if p_amount < v_f.min_sip then return jsonb_build_object('ok', false, 'error', format('Minimum SIP is %s', v_f.min_sip::text)); end if;
  if p_day < 1 or p_day > 28 then return jsonb_build_object('ok', false, 'error', 'SIP day must be 1-28'); end if;
  select * into h from jb_mf_holdings where user_id = p_user and fund_id = p_fund;
  if h.id is null then
    insert into public.jb_mf_holdings (user_id, fund_id, units, invested, avg_nav, sip_active, sip_amount, sip_day)
      values (p_user, p_fund, 0, 0, 0, true, p_amount, p_day);
  else
    update public.jb_mf_holdings set sip_active = true, sip_amount = p_amount, sip_day = p_day
      where user_id = p_user and fund_id = p_fund;
  end if;
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'SIP started', format('%s/month into %s on day %s', p_amount::text, v_f.name, p_day::text));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_mf_cancel_sip(p_user uuid, p_fund uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  update public.jb_mf_holdings set sip_active = false where user_id = p_user and fund_id = p_fund;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_mf_nav_tick()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare f record;
begin
  for f in select * from public.jb_mf_funds loop
    update public.jb_mf_funds
      set prev_nav = nav,
          nav = round(greatest(1, nav * (1 + ((random() - 0.5) * 0.04)))::numeric, 4),
          updated_at = now()
      where id = f.id;
  end loop;
  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
-- Stock market RPCs
-- ============================================================
create or replace function public.jb_stock_place_order(
  p_user uuid, p_stock uuid, p_side text, p_type text, p_qty int, p_limit_price numeric default null
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_u jb_profiles%rowtype; v_s jb_stocks%rowtype; h record; v_cost numeric; oid uuid;
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
      if v_u.balance < v_cost then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
      update public.jb_profiles set balance = balance - v_cost where id = p_user;
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
        values (public.jb_gen_ref_no(), 'stock_buy', v_cost, p_user, null, format('Bought %s × %s', p_qty, v_s.symbol), 'account');
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

  -- limit orders
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

create or replace function public.jb_stock_cancel_order(p_user uuid, p_order uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare o record;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into o from jb_stock_orders where id = p_order and user_id = p_user;
  if o.id is null or o.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'Order not found'); end if;
  if o.type = 'limit' and o.side = 'buy' then
    update public.jb_profiles set balance = balance + (o.qty * o.limit_price) where id = p_user;  -- refund
  elsif o.type = 'limit' and o.side = 'sell' then
    update public.jb_stock_holdings set qty = qty + o.qty where user_id = p_user and stock_id = o.stock_id;  -- return shares
  end if;
  update public.jb_stock_orders set status = 'cancelled' where id = p_order;
  return jsonb_build_object('ok', true);
end;
$$;

-- move prices + execute matching limit orders
create or replace function public.jb_market_tick()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare s record; o record; newp numeric; h record; v_cost numeric; ts bigint;
begin
  ts := extract(epoch from now())::bigint;
  for s in select * from public.jb_stocks loop
    newp := round(greatest(1, s.price * (1 + ((random() - 0.5) * 0.06)))::numeric, 2);
    update public.jb_stocks
      set prev_close = case when s.day_open = 0 then s.price else s.prev_close end,
          day_open = case when s.day_open = 0 then s.price else s.day_open end,
          day_high = greatest(coalesce(s.day_high, newp), newp),
          day_low = case when s.day_low = 0 then newp else least(s.day_low, newp) end,
          volume = volume + (random() * 100000)::bigint,
          high_52w = greatest(high_52w, newp),
          low_52w = case when low_52w = 0 then newp else least(low_52w, newp) end,
          price = newp,
          history = case
            when jsonb_array_length(history) > 240
            then (history || jsonb_build_array(jsonb_build_object('t', ts, 'p', newp))) - 0
            else history || jsonb_build_array(jsonb_build_object('t', ts, 'p', newp))
          end
      where id = s.id;
  end loop;

  -- execute crossed limit orders at limit price
  for o in select * from public.jb_stock_orders where status = 'open' and type = 'limit' loop
    select price into newp from public.jb_stocks where id = o.stock_id;
    if o.side = 'buy' and newp <= o.limit_price then
      v_cost := round(o.qty * o.limit_price, 2);
      select * into h from jb_stock_holdings where user_id = o.user_id and stock_id = o.stock_id;
      if h.id is null then
        insert into public.jb_stock_holdings (user_id, stock_id, qty, avg_price) values (o.user_id, o.stock_id, o.qty, o.limit_price);
      else
        update public.jb_stock_holdings
          set qty = qty + o.qty,
              avg_price = round(((qty * avg_price) + (o.qty * o.limit_price)) / (qty + o.qty), 2)
          where user_id = o.user_id and stock_id = o.stock_id;
      end if;
      insert into public.jb_stock_trades (user_id, stock_id, side, qty, price, amount)
        values (o.user_id, o.stock_id, 'buy', o.qty, o.limit_price, v_cost);
      insert into public.jb_notifications (user_id, title, body)
        values (o.user_id, 'Order filled', format('Bought %s × %s at %s', o.qty, (select symbol from jb_stocks where id = o.stock_id), o.limit_price::text));
      update public.jb_stock_orders set status = 'filled', filled_qty = o.qty, avg_price = o.limit_price where id = o.id;
    elsif o.side = 'sell' and newp >= o.limit_price then
      v_cost := round(o.qty * o.limit_price, 2);
      update public.jb_profiles set balance = balance + v_cost where id = o.user_id;
      insert into public.jb_stock_trades (user_id, stock_id, side, qty, price, amount)
        values (o.user_id, o.stock_id, 'sell', o.qty, o.limit_price, v_cost);
      insert into public.jb_notifications (user_id, title, body)
        values (o.user_id, 'Order filled', format('Sold %s × %s at %s', o.qty, (select symbol from jb_stocks where id = o.stock_id), o.limit_price::text));
      update public.jb_stock_orders set status = 'filled', filled_qty = o.qty, avg_price = o.limit_price where id = o.id;
    end if;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
-- Payment gateway RPCs
-- ============================================================
create or replace function public.jb_gateway_register_merchant(p_name text, p_app text, p_callback text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare m record;
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  insert into public.jb_merchants (name, app_name, callback_url)
    values (p_name, p_app, p_callback)
    returning id, name, app_name, callback_url, api_key, api_secret, status into m;
  return jsonb_build_object('ok', true, 'merchant', jsonb_build_object(
    'id', m.id, 'name', m.name, 'app_name', m.app_name, 'callback_url', m.callback_url,
    'api_key', m.api_key, 'api_secret', m.api_secret, 'status', m.status));
end;
$$;

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
    on conflict (merchant_id, order_ref) do update set amount = excluded.amount, note = excluded.note, status = 'pending', pay_token = public.jb_gateway_orders.pay_token
    returning id, pay_token, amount, status into o;
  return jsonb_build_object('ok', true, 'order', jsonb_build_object(
    'id', o.id, 'pay_token', o.pay_token, 'order_ref', p_order_ref, 'amount', o.amount, 'currency', 'INR',
    'status', o.status, 'pay_url', 'https://jackbhai.github.io/jack-bank/#/gateway/' || o.pay_token));
end;
$$;

create or replace function public.jb_gateway_get_order(p_pay_token text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare o record; m record;
begin
  select * into o from jb_gateway_orders where pay_token = p_pay_token;
  if o.id is null then return jsonb_build_object('ok', false, 'error', 'Order not found'); end if;
  select * into m from jb_merchants where id = o.merchant_id;
  return jsonb_build_object('ok', true, 'order', jsonb_build_object(
    'id', o.id, 'order_ref', o.order_ref, 'amount', o.amount, 'currency', o.currency, 'note', o.note,
    'status', o.status, 'merchant_name', m.name, 'app_name', m.app_name, 'created_at', o.created_at));
end;
$$;

create or replace function public.jb_gateway_pay(p_pay_token text, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare o record; m record; v_u jb_profiles%rowtype; v_s jb_settings%rowtype; v_fee numeric; v_net numeric;
begin
  if p_user is distinct from auth.uid() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  select * into o from jb_gateway_orders where pay_token = p_pay_token;
  if o.id is null then return jsonb_build_object('ok', false, 'error', 'Order not found'); end if;
  if o.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'Order already ' || o.status); end if;
  select * into m from jb_merchants where id = o.merchant_id;
  select * into v_u from jb_profiles where id = p_user;
  select * into v_s from jb_settings where id = 1;
  if v_u.balance < o.amount then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
  v_fee := round(o.amount * (v_s.gateway_fee_pct / 100), 2);
  v_net := o.amount - v_fee;
  update public.jb_profiles set balance = balance - o.amount where id = p_user;
  update public.jb_merchants set settlement = settlement + v_net where id = m.id;
  update public.jb_gateway_orders set status = 'paid', payer_id = p_user, paid_at = now() where id = o.id;
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, fee)
    values (public.jb_gen_ref_no(), 'gateway_pay', o.amount, p_user, null, 'Gateway: ' || m.name || ' · ' || o.order_ref, 'upi', v_fee);
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Payment successful', format('%s paid to %s', o.amount::text, m.name));
  return jsonb_build_object('ok', true, 'amount', o.amount, 'merchant', m.name);
end;
$$;

create or replace function public.jb_gateway_verify(p_api_key text, p_api_secret text, p_order_ref text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare m record; o record;
begin
  select * into m from jb_merchants where api_key = p_api_key and api_secret = p_api_secret;
  if m.id is null then return jsonb_build_object('ok', false, 'error', 'Invalid API credentials'); end if;
  select * into o from jb_gateway_orders where merchant_id = m.id and order_ref = p_order_ref;
  if o.id is null then return jsonb_build_object('ok', false, 'error', 'Order not found'); end if;
  return jsonb_build_object('ok', true, 'order_ref', o.order_ref, 'amount', o.amount, 'currency', o.currency,
    'status', o.status, 'paid_at', o.paid_at);
end;
$$;

create or replace function public.jb_gateway_settle(p_merchant uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare m record; amt numeric;
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  select * into m from jb_merchants where id = p_merchant;
  if m.id is null then return jsonb_build_object('ok', false, 'error', 'Merchant not found'); end if;
  amt := m.settlement;
  update public.jb_merchants set settlement = 0 where id = p_merchant;
  return jsonb_build_object('ok', true, 'amount', amt);
end;
$$;

-- ============================================================
-- Seed : fictional mutual funds
-- ============================================================
insert into public.jb_mf_funds (code, name, fund_house, category, risk, nav, prev_nav, aum, expense_ratio, min_lumpsum, min_sip, ret_1y, ret_3y, description) values
('BN-BLUE', 'BharatNivesh Bluechip Fund', 'BharatNivesh AMC', 'equity', 'Moderately High', 128.4500, 127.1000, 12450, 1.12, 500, 100, 14.2, 18.6, 'Large-cap equity fund investing in 30 of the most stable bluechip companies.'),
('HM-MID', 'Himalaya Midcap Growth', 'Himalaya Mutual Fund', 'equity', 'High', 89.3200, 88.0100, 5820, 1.35, 1000, 500, 21.4, 26.9, 'Mid-cap growth fund focused on emerging champions.'),
('SG-LIQ', 'Sagar Liquid Fund', 'Sagar Capital', 'debt', 'Low', 1002.1100, 1001.8900, 21050, 0.18, 100, 100, 6.9, 6.4, 'Overnight & liquid debt instruments for safe parking of funds.'),
('VJ-FLEXI', 'Vajra Flexi Cap', 'Vajra Investments', 'hybrid', 'Moderate', 64.7800, 64.0100, 7430, 1.05, 500, 100, 16.8, 20.1, 'Flexi-cap fund that moves across large, mid and small caps.'),
('BN-ELSS', 'BharatNivesh ELSS Tax Saver', 'BharatNivesh AMC', 'elss', 'Moderately High', 41.2200, 40.8800, 9310, 1.22, 500, 500, 15.7, 19.8, 'Tax-saving equity fund with a 3-year lock-in.'),
('HM-SMALL', 'Himalaya Small Cap', 'Himalaya Mutual Fund', 'equity', 'Very High', 52.6400, 51.9000, 3140, 1.42, 1000, 500, 27.3, 33.5, 'Small-cap fund for aggressive long-term investors.'),
('SG-BOND', 'Sagar Corporate Bond', 'Sagar Capital', 'debt', 'Low to Moderate', 24.8900, 24.8100, 11680, 0.42, 500, 500, 7.8, 7.1, 'AAA-rated corporate bonds for steady accrual.'),
('VJ-IDX50', 'Vajra Index 50', 'Vajra Investments', 'index', 'Moderately High', 205.6700, 203.4500, 18890, 0.10, 100, 100, 12.9, 16.2, 'Low-cost index fund tracking the Jack-50 index.')
on conflict (code) do nothing;

-- ============================================================
-- Seed : fictional listed companies
-- ============================================================
insert into public.jb_stocks (symbol, name, sector, price, prev_close, day_open, day_high, day_low, volume, market_cap, pe, high_52w, low_52w) values
('NIMBUS', 'NimbusSoft Technologies', 'Information Technology', 2845.60, 2810.10, 2815.00, 2860.00, 2790.00, 4823100, 982400, 38.4, 3120.00, 2100.00),
('HIMTEL', 'Himtel Communications', 'Telecom', 512.35, 508.90, 510.00, 516.80, 506.20, 8214000, 1482300, 24.1, 610.00, 398.00),
('SOLARIS', 'Solaris Energy', 'Power & Energy', 1240.75, 1238.40, 1239.00, 1252.00, 1228.50, 1930500, 512900, 29.8, 1410.00, 950.00),
('AURUM', 'Aurum Bank', 'Banking', 689.20, 685.00, 686.50, 692.40, 681.80, 6210000, 789100, 12.6, 745.00, 512.00),
('VAYUMOTO', 'Vayumoto Electric', 'Automobile', 2310.90, 2280.50, 2290.00, 2335.00, 2268.00, 1408000, 668200, 51.7, 2600.00, 1500.00),
('MEDIPHARM', 'Medipharm Labs', 'Pharmaceuticals', 975.40, 970.20, 972.00, 984.00, 964.50, 2510600, 421500, 22.3, 1100.00, 720.00),
('STEELFORGE', 'SteelForge Industries', 'Metals & Mining', 342.15, 340.50, 341.00, 345.90, 338.20, 5342000, 289400, 9.8, 420.00, 245.00),
('RETAILEE', 'RetailEe Commerce', 'Consumer Services', 1580.30, 1565.00, 1570.00, 1592.00, 1554.00, 3120400, 712800, 44.9, 1820.00, 1150.00),
('CLOUDNEST', 'CloudNest Infra', 'Information Technology', 823.55, 819.00, 820.00, 829.00, 812.00, 2761000, 358700, 31.5, 940.00, 610.00),
('AGROGREEN', 'AgroGreen Foods', 'FMCG', 1268.45, 1262.00, 1264.00, 1278.00, 1252.00, 1180900, 493200, 35.2, 1350.00, 980.00)
on conflict (symbol) do nothing;

-- fix: transactions FK cascade so deleting a user cleans their ledger rows
alter table public.jb_transactions drop constraint if exists jb_transactions_from_user_fkey;
alter table public.jb_transactions drop constraint if exists jb_transactions_to_user_fkey;
alter table public.jb_transactions
  add constraint jb_transactions_from_user_fkey foreign key (from_user) references public.jb_profiles(id) on delete cascade;
alter table public.jb_transactions
  add constraint jb_transactions_to_user_fkey foreign key (to_user) references public.jb_profiles(id) on delete cascade;
