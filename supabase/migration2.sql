-- ============ MIGRATION 2: auth helpers + realtime ============

-- tighten profiles select: own row only (+ admin sees all)
drop policy if exists "jb_profiles_select" on public.jb_profiles;
create policy "jb_profiles_select" on public.jb_profiles for select to authenticated
  using (id = auth.uid() or public.jb_is_admin());

-- admin PIN
update public.jb_profiles set pin = '2468' where role = 'admin';

-- public directory for the login screen (anon-callable)
create or replace function public.jb_public_directory()
returns table(id uuid, name text, upi_id text, avatar_hue int, status text)
language plpgsql security definer set search_path = public
as $$
begin
  return query select p.id, p.name, p.upi_id, p.avatar_hue, p.status
    from public.jb_profiles p where p.role <> 'admin' order by p.name;
end;
$$;

create or replace function public.jb_verify_pin(p_user uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_p jb_profiles%rowtype;
begin
  select * into v_p from public.jb_profiles where id = p_user;
  if v_p.id is null then return jsonb_build_object('ok', false, 'error', 'Account not found'); end if;
  if v_p.status = 'blocked' then return jsonb_build_object('ok', false, 'error', 'Account blocked. Contact admin.'); end if;
  if v_p.pin is distinct from p_pin then return jsonb_build_object('ok', false, 'error', 'Incorrect PIN'); end if;
  return jsonb_build_object('ok', true, 'email', v_p.email, 'role', v_p.role, 'id', v_p.id);
end;
$$;

create or replace function public.jb_verify_admin_pin(p_pin text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_p jb_profiles%rowtype;
begin
  select * into v_p from public.jb_profiles where role = 'admin' limit 1;
  if v_p.id is null then return jsonb_build_object('ok', false, 'error', 'No admin account configured'); end if;
  if v_p.pin is distinct from p_pin then return jsonb_build_object('ok', false, 'error', 'Incorrect admin PIN'); end if;
  return jsonb_build_object('ok', true, 'email', v_p.email, 'role', 'admin', 'id', v_p.id);
end;
$$;

-- friends directory for authenticated users (no pin/email leaked)
create or replace function public.jb_friends()
returns table(id uuid, name text, upi_id text, account_number text, ifsc text, phone text, avatar_hue int, status text)
language plpgsql security definer set search_path = public
as $$
begin
  return query select p.id, p.name, p.upi_id, p.account_number, p.ifsc, p.phone, p.avatar_hue, p.status
    from public.jb_profiles p where p.id <> auth.uid() and p.role <> 'admin' order by p.name;
end;
$$;

-- demo reset (owner only)
create or replace function public.jb_reset_demo()
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Owner only'); end if;
  delete from public.jb_transactions;
  delete from public.jb_loans;
  delete from public.jb_fds;
  delete from public.jb_cards;
  delete from public.jb_requests;
  delete from public.jb_money_requests;
  delete from public.jb_notifications;
  delete from public.jb_announcements;
  update public.jb_profiles set balance = 0, rewards = 0, kyc_status = 'pending', status = 'active' where role <> 'admin';
  insert into public.jb_announcements (text) values ('Demo data has been reset by the owner.');
  return jsonb_build_object('ok', true);
end;
$$;

-- realtime publication
do $$ begin alter publication supabase_realtime add table public.jb_profiles; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.jb_transactions; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.jb_notifications; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.jb_requests; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.jb_money_requests; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.jb_cards; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.jb_fds; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.jb_loans; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.jb_announcements; exception when others then null; end $$;
