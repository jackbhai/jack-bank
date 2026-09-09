-- ============================================================
--  JACK BANK — migration 12 : per-user payment gateway
--  · merchants link to a user account
--  · users apply for their own gateway; admin approves
--  · keys (api_key + api_secret) visible to the owner only
--    AFTER admin approval (status = 'active')
-- ============================================================

alter table public.jb_merchants
  add column if not exists user_id uuid references public.jb_profiles(id) on delete set null;

create unique index if not exists jb_merchants_user_uniq on public.jb_merchants(user_id) where user_id is not null;

-- ---------- user applies for their own gateway ----------
create or replace function public.jb_merchant_apply(p_name text, p_app text, p_callback text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); m record;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'Sign in required'); end if;
  if p_name is null or btrim(p_name) = '' then return jsonb_build_object('ok', false, 'error', 'Enter a business name'); end if;
  if p_app is null or btrim(p_app) = '' then return jsonb_build_object('ok', false, 'error', 'Enter an app or game name'); end if;
  select * into m from public.jb_merchants where user_id = v_uid;
  if m.id is not null then
    if m.status in ('active', 'blocked') then return jsonb_build_object('ok', false, 'error', 'You already have a gateway'); end if;
    if m.status = 'pending' then return jsonb_build_object('ok', false, 'error', 'Your application is pending admin approval'); end if;
    update public.jb_merchants set name = p_name, app_name = p_app, callback_url = p_callback, status = 'pending' where id = m.id;
    return jsonb_build_object('ok', true, 'merchant', jsonb_build_object('id', m.id, 'status', 'pending'));
  end if;
  insert into public.jb_merchants (name, app_name, callback_url, user_id, status)
    values (p_name, p_app, p_callback, v_uid, 'pending')
    returning id into m;
  return jsonb_build_object('ok', true, 'merchant', jsonb_build_object('id', m.id, 'status', 'pending'));
end;
$$;

-- ---------- user's own app + keys (secret only after admin approval) ----------
create or replace function public.jb_merchant_my_app()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); m record; v_orders int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'Sign in required'); end if;
  select * into m from public.jb_merchants where user_id = v_uid;
  if m.id is null then return jsonb_build_object('ok', true, 'merchant', null); end if;
  select count(*) into v_orders from public.jb_gateway_orders where merchant_id = m.id;
  return jsonb_build_object('ok', true, 'merchant', jsonb_build_object(
    'id', m.id, 'name', m.name, 'app_name', m.app_name, 'callback_url', m.callback_url,
    'status', m.status, 'settlement', m.settlement, 'created_at', m.created_at, 'orders', v_orders,
    'api_key', m.api_key,
    'api_secret', case when m.status = 'active' then m.api_secret else null end));
end;
$$;

-- ---------- user's own recent orders ----------
create or replace function public.jb_merchant_my_orders()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); m record;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'Sign in required'); end if;
  select id into m from public.jb_merchants where user_id = v_uid;
  if m.id is null then return jsonb_build_object('ok', true, 'orders', '[]'::jsonb); end if;
  return jsonb_build_object('ok', true, 'orders', coalesce((
    select jsonb_agg(jsonb_build_object(
      'order_ref', o.order_ref, 'amount', o.amount, 'status', o.status,
      'pay_method', o.pay_method, 'fee', o.fee, 'created_at', o.created_at))
    from (select * from public.jb_gateway_orders where merchant_id = m.id order by created_at desc limit 20) o
  ), '[]'::jsonb));
end;
$$;

-- ---------- admin approves / rejects a merchant application ----------
create or replace function public.jb_merchant_review(p_merchant uuid, p_decision text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare m record;
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  select * into m from public.jb_merchants where id = p_merchant;
  if m.id is null then return jsonb_build_object('ok', false, 'error', 'Merchant not found'); end if;
  if p_decision = 'approve' then
    update public.jb_merchants set status = 'active' where id = m.id;
    perform public.jb_gw_event(null, m.id, 'activated', jsonb_build_object('by', 'admin'));
  elsif p_decision = 'reject' then
    update public.jb_merchants set status = 'rejected' where id = m.id;
    perform public.jb_gw_event(null, m.id, 'blocked', jsonb_build_object('by', 'admin'));
  else
    return jsonb_build_object('ok', false, 'error', 'Bad decision');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
