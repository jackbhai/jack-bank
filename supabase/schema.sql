-- ============================================================
--  JACK BANK — Supabase schema v2 (jb_ prefixed to avoid clashes)
-- ============================================================

-- ============================================================
create table if not exists public.jb_settings (
  id int primary key default 1 check (id = 1),
  bank_name text not null default 'Jack Bank',
  upi_domain text not null default 'jackbank',
  ifsc_prefix text not null default 'JACK',
  branch text not null default 'Jack Bank, Saket, New Delhi',
  txn_fee_pct numeric not null default 0.5,
  txn_fee_min numeric not null default 1,
  txn_fee_cap numeric not null default 50,
  cashback_pct numeric not null default 0.5,
  welcome_bonus numeric not null default 500,
  min_balance numeric not null default 0,
  per_txn_limit numeric not null default 50000,
  daily_limit numeric not null default 200000,
  loan_interest_rate numeric not null default 12,
  loan_processing_pct numeric not null default 1,
  min_loan_amount numeric not null default 1000,
  max_loan_amount numeric not null default 200000,
  max_loan_tenure int not null default 24,
  credit_card_interest_rate numeric not null default 36,
  savings_interest_rate numeric not null default 3.5,
  fd_interest_rate numeric not null default 7,
  default_credit_limit numeric not null default 50000
);
insert into public.jb_settings (id) values (1) on conflict do nothing;

-- ============================================================
create table if not exists public.jb_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  upi_id text unique not null,
  account_number text unique not null,
  ifsc text,
  branch text,
  account_type text not null default 'Savings',
  pin text not null default '1234',
  balance numeric(16,2) not null default 0,
  kyc_status text not null default 'pending',
  status text not null default 'active',
  rewards int not null default 0,
  avatar_hue int not null default 260,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

create or replace function public.jb_handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.jb_profiles (id, name, email, upi_id, account_number, ifsc, branch, avatar_hue)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    split_part(new.email, '@', 1) || '@jackbank',
    '1000' || lpad(floor(random()*100000000)::int::text, 8, '0'),
    'JACK' || lpad(floor(random()*10000000)::int::text, 7, '0'),
    'Jack Bank, Saket, New Delhi',
    180 + floor(random()*180)::int
  );
  return new;
end;
$$;

drop trigger if exists jb_on_auth_user_created on auth.users;
create trigger jb_on_auth_user_created
  after insert on auth.users
  for each row execute function public.jb_handle_new_user();

-- ============================================================
create table if not exists public.jb_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.jb_profiles(id) on delete cascade,
  type text not null,
  number text not null,
  holder_name text,
  expiry text,
  cvv text,
  network text,
  status text not null default 'active',
  credit_limit numeric,
  due_amount numeric default 0,
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.jb_fds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.jb_profiles(id) on delete cascade,
  amount numeric(16,2) not null,
  months int not null,
  rate numeric not null,
  maturity_at timestamptz,
  maturity_value numeric,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.jb_transactions (
  id uuid primary key default gen_random_uuid(),
  ref_no text,
  type text not null,
  amount numeric(16,2) not null,
  from_user uuid references public.jb_profiles(id),
  to_user uuid references public.jb_profiles(id),
  note text,
  method text,
  status text not null default 'success',
  fee numeric default 0,
  created_at timestamptz not null default now()
);
create index if not exists jb_txn_from_idx on public.jb_transactions(from_user);
create index if not exists jb_txn_to_idx on public.jb_transactions(to_user);
create index if not exists jb_txn_created_idx on public.jb_transactions(created_at desc);

create table if not exists public.jb_loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.jb_profiles(id) on delete cascade,
  amount numeric(16,2) not null,
  months int not null,
  rate numeric not null,
  emi numeric not null,
  status text not null default 'pending',
  disbursed_at timestamptz,
  emis_paid int not null default 0,
  total_payable numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.jb_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  user_id uuid not null references public.jb_profiles(id) on delete cascade,
  amount numeric,
  meta jsonb default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  note text
);

create table if not exists public.jb_money_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.jb_profiles(id) on delete cascade,
  to_user uuid not null references public.jb_profiles(id) on delete cascade,
  amount numeric(16,2) not null,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.jb_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.jb_profiles(id) on delete cascade,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists jb_notif_user_idx on public.jb_notifications(user_id, created_at desc);

create table if not exists public.jb_announcements (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
--  HELPERS (after tables so SQL bodies can reference them)
-- ============================================================
create or replace function public.jb_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.jb_profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.jb_gen_ref_no()
returns text language sql
as $$
  select 'JK' || to_char(now(), 'YYMMDDHH24MISS') || lpad(floor(random()*999)::int::text, 3, '0');
$$;

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table public.jb_profiles enable row level security;
alter table public.jb_cards enable row level security;
alter table public.jb_fds enable row level security;
alter table public.jb_transactions enable row level security;
alter table public.jb_loans enable row level security;
alter table public.jb_requests enable row level security;
alter table public.jb_money_requests enable row level security;
alter table public.jb_notifications enable row level security;
alter table public.jb_announcements enable row level security;
alter table public.jb_settings enable row level security;

drop policy if exists "jb_profiles_select" on public.jb_profiles;
create policy "jb_profiles_select" on public.jb_profiles for select to authenticated using (true);
drop policy if exists "jb_profiles_update_own" on public.jb_profiles;
create policy "jb_profiles_update_own" on public.jb_profiles for update to authenticated using (id = auth.uid());
drop policy if exists "jb_profiles_admin" on public.jb_profiles;
create policy "jb_profiles_admin" on public.jb_profiles for update to authenticated using (public.jb_is_admin());

drop policy if exists "jb_cards_select" on public.jb_cards;
create policy "jb_cards_select" on public.jb_cards for select to authenticated using (user_id = auth.uid() or public.jb_is_admin());
drop policy if exists "jb_fds_select" on public.jb_fds;
create policy "jb_fds_select" on public.jb_fds for select to authenticated using (user_id = auth.uid() or public.jb_is_admin());
drop policy if exists "jb_loans_select" on public.jb_loans;
create policy "jb_loans_select" on public.jb_loans for select to authenticated using (user_id = auth.uid() or public.jb_is_admin());

drop policy if exists "jb_txn_select" on public.jb_transactions;
create policy "jb_txn_select" on public.jb_transactions for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid() or public.jb_is_admin());

drop policy if exists "jb_requests_select" on public.jb_requests;
create policy "jb_requests_select" on public.jb_requests for select to authenticated
  using (user_id = auth.uid() or public.jb_is_admin());

drop policy if exists "jb_money_requests_select" on public.jb_money_requests;
create policy "jb_money_requests_select" on public.jb_money_requests for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid() or public.jb_is_admin());

drop policy if exists "jb_notif_select" on public.jb_notifications;
create policy "jb_notif_select" on public.jb_notifications for select to authenticated
  using (user_id = auth.uid() or public.jb_is_admin());
drop policy if exists "jb_notif_update" on public.jb_notifications;
create policy "jb_notif_update" on public.jb_notifications for update to authenticated using (user_id = auth.uid());

drop policy if exists "jb_announce_select" on public.jb_announcements;
create policy "jb_announce_select" on public.jb_announcements for select to authenticated using (true);
drop policy if exists "jb_announce_admin" on public.jb_announcements;
create policy "jb_announce_admin" on public.jb_announcements for insert to authenticated with check (public.jb_is_admin());

drop policy if exists "jb_settings_select" on public.jb_settings;
create policy "jb_settings_select" on public.jb_settings for select to authenticated using (true);
drop policy if exists "jb_settings_update" on public.jb_settings;
create policy "jb_settings_update" on public.jb_settings for update to authenticated using (public.jb_is_admin());

-- ============================================================
--  BANKING ENGINE
-- ============================================================

create or replace function public.jb_transfer_money(p_from uuid, p_to uuid, p_amount numeric, p_note text default null, p_method text default 'upi')
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_fee numeric := 0; v_cashback numeric := 0; v_settings jb_settings%rowtype;
  v_from jb_profiles%rowtype; v_to jb_profiles%rowtype; v_ref text;
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
  if v_from.balance < p_amount + v_fee then
    return jsonb_build_object('ok', false, 'error', format('Insufficient balance (fee %s)', v_fee));
  end if;
  v_cashback := round(p_amount * v_settings.cashback_pct / 100, 2);
  v_ref := public.jb_gen_ref_no();

  update public.jb_profiles set balance = balance - p_amount - v_fee + v_cashback,
    rewards = rewards + floor(p_amount / 100)::int where id = p_from;
  update public.jb_profiles set balance = balance + p_amount where id = p_to;

  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, status, fee)
    values (v_ref, 'transfer', p_amount, p_from, p_to, p_note, p_method, 'success', v_fee);
  if v_fee > 0 then
    insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, status)
      values (v_ref, 'fee', v_fee, p_from, null, 'Transaction fee', 'account', 'success');
  end if;
  if v_cashback > 0 then
    insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, status)
      values (v_ref, 'cashback', v_cashback, null, p_from, 'Cashback on transfer', 'account', 'success');
  end if;

  insert into public.jb_notifications (user_id, title, body)
    values (p_to, 'Money received', format('You received %s from %s', p_amount::text, v_from.name)),
           (p_from, 'Payment sent', format('You paid %s to %s', p_amount::text, v_to.name));

  return jsonb_build_object('ok', true, 'ref', v_ref);
end;
$$;

create or replace function public.jb_request_money(p_from uuid, p_to uuid, p_amount numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_to jb_profiles%rowtype;
begin
  if p_from is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('ok', false, 'error', 'Enter a valid amount'); end if;
  select * into v_to from public.jb_profiles where id = p_to;
  if v_to.id is null then return jsonb_build_object('ok', false, 'error', 'User not found'); end if;
  insert into public.jb_money_requests (from_user, to_user, amount, note) values (p_from, p_to, p_amount, p_note);
  insert into public.jb_notifications (user_id, title, body)
    values (p_to, 'Money request', format('%s requested %s from you', (select name from jb_profiles where id = p_from), p_amount::text));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_respond_money_request(p_req uuid, p_action text)
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
    v_res := public.jb_transfer_money(v_req.to_user, v_req.from_user, v_req.amount, coalesce(v_req.note, 'Money request'), 'upi');
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

create or replace function public.jb_add_money_request(p_user uuid, p_amount numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('ok', false, 'error', 'Enter a valid amount'); end if;
  insert into public.jb_requests (kind, user_id, amount, note) values ('deposit', p_user, p_amount, p_note);
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Deposit requested', format('Your add-money request of %s is pending approval', p_amount::text));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_withdraw_request(p_user uuid, p_amount numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_u jb_profiles%rowtype;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into v_u from jb_profiles where id = p_user;
  if v_u.balance < p_amount then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
  insert into public.jb_requests (kind, user_id, amount, note) values ('withdrawal', p_user, p_amount, p_note);
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Withdrawal requested', format('Your withdrawal of %s is pending approval', p_amount::text));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_apply_loan(p_user uuid, p_amount numeric, p_months int, p_purpose text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_s jb_settings%rowtype;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into v_s from jb_settings where id = 1;
  if p_amount < v_s.min_loan_amount then return jsonb_build_object('ok', false, 'error', format('Minimum loan is %s', v_s.min_loan_amount)); end if;
  if p_amount > v_s.max_loan_amount then return jsonb_build_object('ok', false, 'error', format('Maximum loan is %s', v_s.max_loan_amount)); end if;
  if p_months > v_s.max_loan_tenure then return jsonb_build_object('ok', false, 'error', format('Max tenure is %s months', v_s.max_loan_tenure)); end if;
  insert into public.jb_requests (kind, user_id, amount, meta) values ('loan', p_user, p_amount, jsonb_build_object('months', p_months, 'purpose', p_purpose));
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Loan application', format('Your loan application of %s is under review', p_amount::text));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_request_card(p_user uuid, p_card_type text, p_limit numeric default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  insert into public.jb_requests (kind, user_id, meta) values ('card', p_user, jsonb_build_object('cardType', p_card_type, 'requestedLimit', p_limit));
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Card request', format('Your %s card request is pending approval', p_card_type));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_request_kyc(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  insert into public.jb_requests (kind, user_id) values ('kyc', p_user);
  insert into public.jb_notifications (user_id, title, body) values (p_user, 'KYC submitted', 'Your KYC documents are under review');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_decide_request(p_req uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_req jb_requests%rowtype; v_u jb_profiles%rowtype; v_s jb_settings%rowtype;
  v_emi numeric; v_months int; v_num text; v_prefix text; v_exp text; v_net text;
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Owner only'); end if;
  select * into v_req from public.jb_requests where id = p_req;
  if v_req.id is null then return jsonb_build_object('ok', false, 'error', 'Not found'); end if;
  if v_req.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'Already decided'); end if;
  select * into v_u from public.jb_profiles where id = v_req.user_id;
  select * into v_s from public.jb_settings where id = 1;

  if p_approve then
    if v_req.kind = 'deposit' then
      update public.jb_profiles set balance = balance + v_req.amount where id = v_req.user_id;
      insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
        values (public.jb_gen_ref_no(), 'deposit', v_req.amount, null, v_req.user_id, coalesce(v_req.note, 'Add money'), 'admin');
      insert into public.jb_notifications (user_id, title, body)
        values (v_req.user_id, 'Deposit approved', format('%s credited to your account', v_req.amount::text));

    elsif v_req.kind = 'withdrawal' then
      if v_u.balance < v_req.amount then
        update public.jb_requests set status = 'rejected', decided_at = now() where id = p_req;
        return jsonb_build_object('ok', false, 'error', 'Insufficient balance at approval time');
      end if;
      update public.jb_profiles set balance = balance - v_req.amount where id = v_req.user_id;
      insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
        values (public.jb_gen_ref_no(), 'withdrawal', v_req.amount, v_req.user_id, null, coalesce(v_req.note, 'Withdrawal'), 'admin');
      insert into public.jb_notifications (user_id, title, body)
        values (v_req.user_id, 'Withdrawal approved', format('%s debited from your account', v_req.amount::text));

    elsif v_req.kind = 'loan' then
      v_months := coalesce((v_req.meta->>'months')::int, 12);
      v_emi := round((v_req.amount * (v_s.loan_interest_rate/1200) * power(1 + (v_s.loan_interest_rate/1200), v_months)) /
                     nullif(power(1 + (v_s.loan_interest_rate/1200), v_months) - 1, 0), 2);
      insert into public.jb_loans (user_id, amount, months, rate, emi, status, disbursed_at, total_payable)
        values (v_req.user_id, v_req.amount, v_months, v_s.loan_interest_rate, v_emi, 'active', now(), round(v_emi * v_months, 2));
      update public.jb_profiles set balance = balance + v_req.amount where id = v_req.user_id;
      insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
        values (public.jb_gen_ref_no(), 'loan_disbursal', v_req.amount, null, v_req.user_id, 'Loan disbursed', 'admin');
      insert into public.jb_notifications (user_id, title, body)
        values (v_req.user_id, 'Loan approved', format('%s disbursed. EMI %s/month', v_req.amount::text, v_emi::text));

    elsif v_req.kind = 'kyc' then
      update public.jb_profiles set kyc_status = 'approved' where id = v_req.user_id;
      insert into public.jb_notifications (user_id, title, body) values (v_req.user_id, 'KYC approved', 'Your KYC is now verified');

    elsif v_req.kind = 'card' then
      v_prefix := case when v_req.meta->>'cardType' = 'credit' then '5408' else '4539' end;
      v_num := v_prefix || lpad(floor(random()*1000000000000)::bigint::text, 12, '0');
      v_num := substring(v_num,1,4)||' '||substring(v_num,5,4)||' '||substring(v_num,9,4)||' '||substring(v_num,13,4);
      v_exp := to_char(now() + interval '48 months', 'MM/YY');
      v_net := (array['Visa','Mastercard','RuPay'])[1 + floor(random()*3)::int];
      insert into public.jb_cards (user_id, type, number, holder_name, expiry, cvv, network, status, credit_limit, due_amount, due_date)
        values (v_req.user_id, v_req.meta->>'cardType', v_num, upper(v_u.name), v_exp, lpad(floor(random()*1000)::int::text, 3, '0'), v_net, 'active',
          case when v_req.meta->>'cardType' = 'credit' then coalesce((v_req.meta->>'requestedLimit')::numeric, v_s.default_credit_limit) else null end,
          case when v_req.meta->>'cardType' = 'credit' then 0 else null end,
          case when v_req.meta->>'cardType' = 'credit' then (now() + interval '30 days')::date else null end);
      insert into public.jb_notifications (user_id, title, body)
        values (v_req.user_id, 'Card issued', format('Your %s card has been issued', v_req.meta->>'cardType'));
    end if;
  else
    insert into public.jb_notifications (user_id, title, body)
      values (v_req.user_id, 'Request rejected', format('Your %s request was rejected', v_req.kind));
  end if;

  update public.jb_requests set status = case when p_approve then 'approved' else 'rejected' end, decided_at = now() where id = p_req;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_credit_card_spend(p_user uuid, p_amount numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_card jb_cards%rowtype; v_due numeric;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into v_card from public.jb_cards where user_id = p_user and type = 'credit' limit 1;
  if v_card.id is null then return jsonb_build_object('ok', false, 'error', 'No credit card found'); end if;
  if v_card.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'Credit card is not active'); end if;
  v_due := coalesce(v_card.due_amount, 0) + p_amount;
  if v_due > coalesce(v_card.credit_limit, 0) then
    return jsonb_build_object('ok', false, 'error', format('Credit limit exceeded (limit %s)', v_card.credit_limit::text));
  end if;
  update public.jb_cards set due_amount = v_due where id = v_card.id;
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
    values (public.jb_gen_ref_no(), 'card_spend', p_amount, p_user, null, p_note, 'card');
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Card spend', format('%s spent on your credit card', p_amount::text));
  return jsonb_build_object('ok', true);
end;
$$;

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
    values (public.jb_gen_ref_no(), 'card_payment', v_pay, p_user, null, 'Credit card bill payment', 'account');
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Bill paid', format('%s paid towards your credit card bill', v_pay::text));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_set_card_status(p_user uuid, p_card uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_card jb_cards%rowtype;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into v_card from public.jb_cards where id = p_card and user_id = p_user;
  if v_card.id is null then return jsonb_build_object('ok', false, 'error', 'Card not found'); end if;
  update public.jb_cards set status = p_status where id = p_card;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_change_pin(p_user uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  if p_pin is null or p_pin !~ '^\d{4}$' then return jsonb_build_object('ok', false, 'error', 'PIN must be 4 digits'); end if;
  update public.jb_profiles set pin = p_pin where id = p_user;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_open_fd(p_user uuid, p_amount numeric, p_months int)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_u jb_profiles%rowtype; v_s jb_settings%rowtype; v_mat numeric;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into v_u from jb_profiles where id = p_user;
  select * into v_s from jb_settings where id = 1;
  if p_amount <= 0 then return jsonb_build_object('ok', false, 'error', 'Enter a valid amount'); end if;
  if v_u.balance < p_amount then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
  v_mat := round(p_amount * (1 + (v_s.fd_interest_rate / 100) * (p_months / 12.0)), 2);
  update public.jb_profiles set balance = balance - p_amount where id = p_user;
  insert into public.jb_fds (user_id, amount, months, rate, maturity_at, maturity_value)
    values (p_user, p_amount, p_months, v_s.fd_interest_rate, now() + make_interval(months => p_months), v_mat);
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
    values (public.jb_gen_ref_no(), 'fd_open', p_amount, p_user, null, format('Fixed deposit (%s months)', p_months), 'account');
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'FD booked', format('%s locked in FD at %s%% p.a.', p_amount::text, v_s.fd_interest_rate::text));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_break_fd(p_user uuid, p_fd uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_fd jb_fds%rowtype;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into v_fd from public.jb_fds where id = p_fd and user_id = p_user;
  if v_fd.id is null or v_fd.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'FD not found'); end if;
  update public.jb_fds set status = 'broken' where id = p_fd;
  update public.jb_profiles set balance = balance + v_fd.amount where id = p_user;
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
    values (public.jb_gen_ref_no(), 'fd_break', v_fd.amount, null, p_user, 'FD broken early (principal)', 'account');
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'FD broken', format('%s (principal) credited back', v_fd.amount::text));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_repay_loan(p_user uuid, p_loan uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_l jb_loans%rowtype; v_u jb_profiles%rowtype; v_closed boolean;
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  select * into v_l from public.jb_loans where id = p_loan and user_id = p_user;
  select * into v_u from public.jb_profiles where id = p_user;
  if v_l.id is null or v_l.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'Loan not found'); end if;
  if v_u.balance < v_l.emi then return jsonb_build_object('ok', false, 'error', format('Insufficient balance for EMI (%s)', v_l.emi::text)); end if;
  v_closed := (v_l.emis_paid + 1) >= v_l.months;
  update public.jb_profiles set balance = balance - v_l.emi where id = p_user;
  update public.jb_loans set emis_paid = emis_paid + 1, status = case when v_closed then 'closed' else 'active' end where id = p_loan;
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
    values (public.jb_gen_ref_no(), 'emi', v_l.emi, p_user, null, 'Loan EMI payment', 'account');
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, case when v_closed then 'Loan closed' else 'EMI paid' end,
      case when v_closed then 'Congratulations! Your loan is fully repaid.'
      else format('EMI of %s paid. %s remaining.', v_l.emi::text, (v_l.months - v_l.emis_paid - 1)::text) end);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_block_user(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Owner only'); end if;
  update public.jb_profiles set status = 'blocked' where id = p_user;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_unblock_user(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Owner only'); end if;
  update public.jb_profiles set status = 'active' where id = p_user;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_admin_adjust(p_user uuid, p_amount numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_u jb_profiles%rowtype;
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Owner only'); end if;
  select * into v_u from public.jb_profiles where id = p_user;
  if v_u.id is null then return jsonb_build_object('ok', false, 'error', 'User not found'); end if;
  if p_amount < 0 and v_u.balance < -p_amount then return jsonb_build_object('ok', false, 'error', 'Balance cannot go negative'); end if;
  update public.jb_profiles set balance = balance + p_amount where id = p_user;
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
    values (public.jb_gen_ref_no(), 'adjustment', abs(p_amount), case when p_amount < 0 then p_user else null end, case when p_amount > 0 then p_user else null end, coalesce(p_note, 'Admin adjustment'), 'admin');
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Balance adjusted', format('%s %s by admin', case when p_amount > 0 then 'Credited' else 'Debited' end, abs(p_amount)::text));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_add_announcement(p_text text)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Owner only'); end if;
  insert into public.jb_announcements (text) values (p_text);
  insert into public.jb_notifications (user_id, title, body)
    select id, 'Announcement', p_text from public.jb_profiles;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_mark_notifs_read(p_user uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.jb_notifications set read = true where user_id = p_user and read = false;
end;
$$;
