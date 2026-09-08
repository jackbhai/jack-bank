-- ============ MIGRATION 3: real-user support (no demo data) ============

-- trigger reads signup metadata (name, phone, pin) and builds a clean UPI id
create or replace function public.jb_handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_name text := coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1));
  v_handle text := lower(regexp_replace(v_name, '[^a-zA-Z0-9]', '', 'g'));
  v_upi text; v_count int;
  v_pin text := coalesce(nullif(new.raw_user_meta_data->>'pin',''), '1234');
  v_phone text := nullif(new.raw_user_meta_data->>'phone','');
begin
  if v_handle = '' or length(v_handle) < 3 then v_handle := 'user'; end if;
  v_upi := v_handle || '@jackbank';
  loop
    select count(*) into v_count from public.jb_profiles where upi_id = v_upi;
    exit when v_count = 0;
    v_upi := v_handle || floor(random()*99999)::int::text || '@jackbank';
  end loop;
  insert into public.jb_profiles (id, name, email, phone, upi_id, account_number, ifsc, branch, pin, avatar_hue)
  values (new.id, v_name, new.email, v_phone, v_upi,
    '1000' || lpad(floor(random()*100000000)::int::text, 8, '0'),
    'JACK' || lpad(floor(random()*10000000)::int::text, 7, '0'),
    'Jack Bank, Saket, New Delhi', v_pin, 180 + floor(random()*180)::int);
  return new;
end;
$$;

-- owner adds a friend directly (real auth user, email-confirmed)
create or replace function public.jb_admin_create_user(p_email text, p_password text, p_name text, p_phone text default null, p_pin text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Owner only'); end if;
  if p_email is null or p_email = '' then return jsonb_build_object('ok', false, 'error', 'Email required'); end if;
  if p_password is null or length(p_password) < 6 then return jsonb_build_object('ok', false, 'error', 'Password must be 6+ characters'); end if;
  if exists (select 1 from auth.users where email = lower(p_email)) then
    return jsonb_build_object('ok', false, 'error', 'Email already registered');
  end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token, email_change_confirm_status)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)), now(),
    jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
    jsonb_build_object('name', p_name, 'phone', p_phone, 'pin', p_pin),
    now(), now(), '', '', '', '', '', '', '', '', 0)
  returning id into v_id;
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', lower(p_email), 'email_verified', true), 'email', now(), now(), now());
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
