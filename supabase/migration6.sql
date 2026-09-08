-- ============================================================
--  JACK BANK — migration 6 : live markets
--  · pg_cron auto-tick every minute (stocks + MF NAVs)
--  · updated_at columns for freshness tracking
-- ============================================================

alter table public.jb_stocks add column if not exists updated_at timestamptz not null default now();
alter table public.jb_mf_funds add column if not exists updated_at timestamptz not null default now();

-- ---------- NAV tick (with updated_at) ----------
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

-- ---------- market tick (with updated_at) ----------
create or replace function public.jb_market_tick()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare s record; o record; newp numeric; h record; v_cost numeric; ts bigint; vol numeric;
begin
  ts := extract(epoch from now())::bigint;
  for s in select * from public.jb_stocks loop
    vol := case when s.kind = 'crypto' then 0.11 else 0.055 end;
    newp := round(greatest(1, s.price * (1 + ((random() - 0.5) * vol)))::numeric, 2);
    update public.jb_stocks
      set prev_close = case when s.day_open = 0 then s.price else s.prev_close end,
          day_open = case when s.day_open = 0 then s.price else s.day_open end,
          day_high = greatest(coalesce(s.day_high, newp), newp),
          day_low = case when s.day_low = 0 then newp else least(s.day_low, newp) end,
          volume = volume + (random() * 100000)::bigint,
          high_52w = greatest(high_52w, newp),
          low_52w = case when low_52w = 0 then newp else least(low_52w, newp) end,
          price = newp,
          updated_at = now(),
          history = case
            when jsonb_array_length(history) > 240
            then (history || jsonb_build_array(jsonb_build_object('t', ts, 'p', newp))) - 0
            else history || jsonb_build_array(jsonb_build_object('t', ts, 'p', newp))
          end
      where id = s.id;
  end loop;

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
--  realtime : broadcast market tables so live prices push to
--  every open client without a reload
-- ============================================================
alter publication supabase_realtime add table public.jb_stocks;
alter publication supabase_realtime add table public.jb_mf_funds;
alter publication supabase_realtime add table public.jb_stock_orders;

-- ============================================================
--  pg_cron : tick the market every minute
-- ============================================================
create extension if not exists pg_cron with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'jack-stock-tick') then
    perform cron.unschedule('jack-stock-tick');
  end if;
  if exists (select 1 from cron.job where jobname = 'jack-nav-tick') then
    perform cron.unschedule('jack-nav-tick');
  end if;
end $$;

select cron.schedule('jack-stock-tick', '* * * * *', 'select public.jb_market_tick()');
select cron.schedule('jack-nav-tick', '* * * * *', 'select public.jb_mf_nav_tick()');
