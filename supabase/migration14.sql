-- ============================================================================
-- migration14.sql — Gateway settlement must credit the merchant owner's balance
-- ============================================================================
-- Bug: jb_gateway_settle zeroed the merchant's `settlement` pool and recorded
-- history, but never credited the merchant owner's jb_profiles.balance — the
-- settled amount simply vanished.
--
-- Fix: when the merchant has an owner (user_id is not null), credit that
-- profile's balance by the settled amount and record a `gateway_settlement`
-- transaction + a notification. Merchants without an owner (legacy rows,
-- user_id null) keep the old history-only behaviour.

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
    if m.user_id is not null then
      update public.jb_profiles set balance = balance + amt where id = m.user_id;
      insert into public.jb_transactions (ref_no, type, amount, from_user, to_user, note, method)
        values (public.jb_gen_ref_no(), 'gateway_settlement', amt, null, m.user_id, 'Gateway settlement: ' || m.name, 'upi');
      insert into public.jb_notifications (user_id, title, body)
        values (m.user_id, 'Gateway settlement received', format('%s settled to your balance for %s', amt::text, m.name));
    end if;
  end if;
  perform public.jb_gw_event(null, m.id, 'settled', jsonb_build_object('amount', amt, 'orders', v_count));
  return jsonb_build_object('ok', true, 'amount', amt, 'orders_settled', v_count);
end;
$$;
