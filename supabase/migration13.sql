-- ============================================================
--  JACK BANK — migration 13 : OTP verification goes to the owner's app
--  · jb_gateway_initiate now sends a "Payment verification request"
--    notification WITHOUT the OTP (OTP is only revealed in the
--    owner's logged-in panel after they approve — never on the
--    public gateway page)
--  · notification meta carries the pay_token + order info for the
--    in-app verification popup
-- ============================================================

alter table public.jb_notifications add column if not exists meta jsonb not null default '{}'::jsonb;

-- mark a single notification read (owner only)
create or replace function public.jb_mark_notif_read(p_notif uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.jb_notifications set read = true where id = p_notif and user_id = auth.uid();
end;
$$;

-- ---------- gateway initiate: request verification on the owner's device ----------
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
  insert into public.jb_notifications (user_id, title, body, meta)
    values (v_payer, 'Payment verification request',
      format('%s to %s · approve to reveal the OTP', o.amount::text, m.name),
      jsonb_build_object('pay_token', o.pay_token, 'amount', o.amount, 'merchant', m.name,
        'order_ref', o.order_ref, 'method', p_method, 'to', v_upi));
  perform public.jb_gw_event(o.id, m.id, 'otp_sent', jsonb_build_object('method', p_method, 'to', v_upi));
  return jsonb_build_object('ok', true, 'method', p_method, 'to', v_upi, 'expires_in', 300);
end;
$$;
