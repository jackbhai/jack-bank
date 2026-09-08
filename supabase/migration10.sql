-- ============================================================
--  JACK BANK — migration 10 : gateway OTP confirm fixes
--  · cross-device credit-card OTP confirm charged inline
--    (jb_charge_card requires auth.uid(), which is absent for
--     anonymous OTP payers — so charge the card directly here)
--  · debit/credit charge helpers now pick an ACTIVE card first
-- ============================================================

-- ---------- debit charge: always pick an active debit card ----------
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
  select * into v_card from public.jb_cards where user_id = p_user and type = 'debit' and status = 'active' limit 1;
  if v_card.id is null then return jsonb_build_object('ok', false, 'error', 'No active debit card found'); end if;
  select * into v_u from public.jb_profiles where id = p_user;
  if v_u.balance < p_amount then return jsonb_build_object('ok', false, 'error', 'Insufficient balance'); end if;
  update public.jb_profiles set balance = balance - p_amount where id = p_user;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------- credit charge: always pick an active credit card ----------
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
  select * into v_card from public.jb_cards where user_id = p_user and type = 'credit' and status = 'active' limit 1;
  if v_card.id is null then return jsonb_build_object('ok', false, 'error', 'No active credit card found'); end if;
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

-- ---------- gateway confirm: inline card charge for anonymous OTP payers ----------
create or replace function public.jb_gateway_confirm(p_pay_token text, p_otp text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare o record; m record; v_u jb_profiles%rowtype; v_c jb_cards%rowtype; v_s jb_settings%rowtype; v_fee numeric; v_net numeric; v_mth text; v_payer uuid; v_avail numeric;
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
    if v_c.id is null then return jsonb_build_object('ok', false, 'error', 'Card not found'); end if;
    if v_c.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'Card is not active'); end if;
    v_payer := v_c.user_id;
    select * into v_u from public.jb_profiles where id = v_c.user_id;
    if v_c.type = 'credit' then
      v_avail := coalesce(v_c.credit_limit, 0) - coalesce(v_c.due_amount, 0);
      if o.amount > v_avail then
        return jsonb_build_object('ok', false, 'error', format('Credit limit exceeded — available %s', v_avail::text));
      end if;
      update public.jb_cards
        set due_amount = coalesce(due_amount, 0) + o.amount,
            due_date = coalesce(due_date, (date_trunc('month', now()) + interval '1 month - 1 day')::date)
        where id = v_c.id;
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
