-- ============================================================
--  JACK BANK — migration 8 : gateway ultimate upgrade
--  · capture pay method + gateway fee per order
--  · settlement tracking (settled_at)
--  · refunds (admin)
-- ============================================================

alter table public.jb_gateway_orders
  add column if not exists pay_method text,
  add column if not exists fee numeric not null default 0,
  add column if not exists settled_at timestamptz;

-- widen status check to include 'refunded'
alter table public.jb_gateway_orders drop constraint if exists jb_gateway_orders_status_check;
alter table public.jb_gateway_orders add constraint jb_gateway_orders_status_check
  check (status in ('pending', 'paid', 'failed', 'expired', 'refunded'));

-- ---------- pay: record method + fee ----------
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
  update public.jb_gateway_orders
    set status = 'paid', payer_id = p_user, paid_at = now(), pay_method = p_source, fee = v_fee
    where id = o.id;
  insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method, fee)
    values (public.jb_gen_ref_no(), 'gateway_pay', o.amount, p_user, null, 'Gateway: ' || m.name || ' · ' || o.order_ref,
            case when p_source = 'card' then 'card' else 'upi' end, v_fee);
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Payment successful', format('%s paid to %s', o.amount::text, m.name));
  return jsonb_build_object('ok', true, 'amount', o.amount, 'merchant', m.name, 'order_ref', o.order_ref, 'fee', v_fee);
end;
$$;

-- ---------- settle: also mark orders settled ----------
create or replace function public.jb_gateway_settle(p_merchant uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare m record; amt numeric; v_count int;
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  select * into m from jb_merchants where id = p_merchant;
  if m.id is null then return jsonb_build_object('ok', false, 'error', 'Merchant not found'); end if;
  amt := m.settlement;
  update public.jb_merchants set settlement = 0 where id = p_merchant;
  update public.jb_gateway_orders set settled_at = now() where merchant_id = p_merchant and status = 'paid' and settled_at is null;
  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'amount', amt, 'orders_settled', v_count);
end;
$$;

-- ---------- refund: admin reverses a paid order ----------
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
  return jsonb_build_object('ok', true);
end;
$$;
