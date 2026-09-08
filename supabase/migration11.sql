-- ============================================================
--  JACK BANK — migration 11 : OTP approval gate
--  · new RPC jb_gateway_otp_approve: the OTP is only revealed
--    after the payer explicitly approves the request on the
--    pay screen (logs an `otp_approved` event for the timeline)
-- ============================================================

create or replace function public.jb_gateway_otp_approve(p_pay_token text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare o record;
begin
  select * into o from jb_gateway_orders where pay_token = p_pay_token;
  if o.id is null then return jsonb_build_object('ok', false, 'error', 'Order not found'); end if;
  if o.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'Order already ' || o.status); end if;
  if o.otp is null then return jsonb_build_object('ok', false, 'error', 'Request an OTP first'); end if;
  if o.otp_expires_at is null or o.otp_expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'OTP expired — request a new one');
  end if;
  perform public.jb_gw_event(o.id, o.merchant_id, 'otp_approved', jsonb_build_object('method', o.otp_method));
  return jsonb_build_object(
    'ok', true,
    'otp', o.otp,
    'method', o.otp_method,
    'to', o.otp_upi_id,
    'expires_in', greatest(0, extract(epoch from (o.otp_expires_at - now()))::int)
  );
end;
$$;
