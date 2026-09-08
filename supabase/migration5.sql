-- ============================================================
--  JACK BANK — migration 5
--  · Full Indian-style stock universe (fictional names) + crypto
--  · Per-user 100+ parameter settings engine
--  · Admin: reset pin, issue card, card limit, approve KYC, delete
-- ============================================================

-- ---------- stocks: add asset kind (equity / crypto) ----------
alter table public.jb_stocks add column if not exists kind text not null default 'equity';
create index if not exists jb_stocks_kind_idx on public.jb_stocks(kind);

-- ============================================================
--  Per-user settings engine (JSONB config, 100+ parameters)
-- ============================================================
create table if not exists public.jb_user_settings (
  user_id uuid primary key references public.jb_profiles(id) on delete cascade,
  cfg jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.jb_user_settings enable row level security;
drop policy if exists "jb_usettings_select" on public.jb_user_settings;
create policy "jb_usettings_select" on public.jb_user_settings for select to authenticated
  using (user_id = auth.uid() or public.jb_is_admin());

create or replace function public.jb_user_settings_get(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare cfg jsonb;
begin
  select s.cfg into cfg from public.jb_user_settings s where s.user_id = p_user;
  return coalesce(cfg, '{}'::jsonb);
end;
$$;

create or replace function public.jb_user_set_setting(p_user uuid, p_key text, p_value jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if p_user is distinct from auth.uid() and not public.jb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;
  insert into public.jb_user_settings (user_id, cfg)
    values (p_user, jsonb_build_object(p_key, p_value))
    on conflict (user_id) do update set cfg = jb_user_settings.cfg || jsonb_build_object(p_key, p_value), updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
--  Admin management RPCs
-- ============================================================

create or replace function public.jb_admin_reset_pin(p_user uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  if p_pin !~ '^[0-9]{4}$' then return jsonb_build_object('ok', false, 'error', 'PIN must be 4 digits'); end if;
  update public.jb_profiles set pin = p_pin where id = p_user;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_admin_issue_card(p_user uuid, p_type text, p_limit numeric default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_u jb_profiles%rowtype; card_num text; exp text; cvv text; net text;
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  select * into v_u from jb_profiles where id = p_user;
  if v_u.id is null then return jsonb_build_object('ok', false, 'error', 'User not found'); end if;
  card_num := '4' || lpad(floor(random() * 1e15)::bigint::text, 15, '0');
  exp := to_char(now() + interval '5 years', 'MM/YY');
  cvv := lpad(floor(random() * 1000)::int::text, 3, '0');
  net := case when p_type = 'credit' then 'RuPay' else 'Visa' end;
  insert into public.jb_cards (user_id, type, number, holder_name, expiry, cvv, network, status, credit_limit)
    values (p_user, p_type, card_num, upper(v_u.name), exp, cvv, net, 'active',
            case when p_type = 'credit' then coalesce(p_limit, 50000) else null end);
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'Card issued', format('%s card issued by the bank owner', p_type));
  return jsonb_build_object('ok', true, 'number', card_num, 'expiry', exp, 'cvv', cvv, 'network', net);
end;
$$;

create or replace function public.jb_admin_set_card_limit(p_card uuid, p_limit numeric)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  update public.jb_cards set credit_limit = p_limit where id = p_card;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_admin_approve_kyc(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  update public.jb_profiles set kyc_status = 'approved' where id = p_user;
  update public.jb_kyc set status = 'approved' where user_id = p_user;
  update public.jb_requests set status = 'approved', decided_at = now() where user_id = p_user and kind = 'kyc' and status = 'pending';
  insert into public.jb_notifications (user_id, title, body)
    values (p_user, 'KYC approved', 'Your KYC verification was approved by the bank owner.');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.jb_admin_delete_user(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.jb_is_admin() then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;
  if exists (select 1 from jb_profiles where id = p_user and role = 'admin') then
    return jsonb_build_object('ok', false, 'error', 'Cannot delete an admin account');
  end if;
  delete from public.jb_notifications where user_id = p_user;
  delete from auth.users where id = p_user;
  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
--  Market tick: crypto moves with higher volatility
-- ============================================================
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
--  Seed: full fictional Indian market (60 equities)
-- ============================================================
insert into public.jb_stocks (symbol, name, sector, kind, price, prev_close, day_open, day_high, day_low, volume, market_cap, pe, high_52w, low_52w) values
('PIOIND','Pio Industries','Conglomerate','equity',2845.60,2810.10,2815.00,2860.00,2790.00,4823100,1902400,26.4,3120.00,2100.00),
('PIOFIN','Pio Financial','Fintech','equity',385.90,382.40,383.00,390.50,379.20,9123000,150800,48.2,455.00,230.00),
('DADASTEEL','Dada Steel','Metals & Mining','equity',342.15,340.50,341.00,345.90,338.20,5342000,289400,9.8,420.00,245.00),
('DADAMOTORS','Dada Motors','Automobile','equity',985.40,978.20,980.00,995.00,971.50,3887000,312500,18.7,1150.00,720.00),
('DADAPOWER','Dada Power','Power & Energy','equity',412.30,409.10,410.00,418.50,406.30,4210500,138200,21.3,480.00,290.00),
('DADACS','Dada Consultancy','Information Technology','equity',3987.10,3945.00,3950.00,4010.00,3920.00,1620400,1438000,31.2,4350.00,3110.00),
('DADACONSUMER','Dada Consumer','FMCG','equity',1155.20,1148.00,1150.00,1162.00,1140.00,2140800,121500,42.5,1290.00,920.00),
('SKYTEL','SkyTel Communications','Telecom','equity',512.35,508.90,510.00,516.80,506.20,8214000,1482300,24.1,610.00,398.00),
('BHARATSTATE','Bharat State Bank','Banking','equity',785.60,780.10,782.00,790.00,776.00,7241000,700400,11.8,860.00,540.00),
('ICEBANK','Iceberg Bank','Banking','equity',1689.45,1675.00,1678.00,1702.00,1665.00,2310500,1020800,21.6,1810.00,1320.00),
('AXLEBANK','Axle Bank','Banking','equity',934.70,928.40,930.00,942.00,922.50,3950800,518600,15.2,1050.00,720.00),
('KATALBANK','Katal Bank','Banking','equity',1890.25,1875.00,1880.00,1905.00,1865.00,1840300,524900,18.9,2010.00,1520.00),
('HIMBANK','Himalaya Bank','Banking','equity',1495.80,1488.00,1490.00,1508.00,1478.00,2150800,395800,16.4,1610.00,1180.00),
('DATASYS','DataSys Technologies','Information Technology','equity',1670.90,1662.00,1665.00,1682.00,1650.00,2540800,620400,28.5,1820.00,1280.00),
('BRIGHTLOOP','BrightLoop Software','Information Technology','equity',545.30,540.80,542.00,550.00,536.00,4310500,255800,24.8,610.00,410.00),
('HELIXTECH','Helix Tech','Information Technology','equity',1420.75,1410.00,1412.00,1432.00,1400.00,3210500,385400,26.9,1550.00,1010.00),
('MAHASOFT','MahaSoft','Information Technology','equity',1525.40,1515.00,1518.00,1535.00,1505.00,1980500,415200,27.3,1680.00,1120.00),
('MINDOAK','MindOak Consulting','Information Technology','equity',4820.10,4780.00,4790.00,4860.00,4750.00,985200,170200,38.8,5350.00,3890.00),
('OILBHARAT','OilBharat Exploration','Oil & Gas','equity',286.40,284.90,285.00,290.50,282.00,6241000,315800,9.2,340.00,210.00),
('KOYLA','Koyla India','Metals & Mining','equity',462.85,459.00,460.00,468.00,455.00,7884000,288700,7.4,540.00,320.00),
('PETROBHARAT','PetroBharat','Oil & Gas','equity',388.60,385.20,386.00,393.00,382.00,5120800,352600,10.6,440.00,290.00),
('BHARATFUEL','BharatFuel','Oil & Gas','equity',512.90,509.00,510.00,518.00,505.00,3980500,226800,12.8,580.00,380.00),
('URGAPOWER','Urga Power','Power & Energy','equity',348.25,345.80,346.50,352.00,342.00,4921000,168400,15.9,395.00,240.00),
('GRIDCORP','GridCorp','Power & Energy','equity',285.40,283.10,284.00,289.00,280.00,6210500,152800,17.2,320.00,195.00),
('VAANYU','Vaan Aerospace','Defence','equity',4210.60,4170.00,4180.00,4260.00,4140.00,742100,185300,44.6,4800.00,2810.00),
('DESHELEC','Desh Electronics','Defence','equity',285.35,283.00,284.00,289.50,280.20,5810400,198400,41.2,320.00,168.00),
('URJAWORKS','UrjaWorks Heavy','Capital Goods','equity',224.80,222.60,223.00,228.00,220.00,7310500,152600,25.7,260.00,140.00),
('BRIDGETECH','BridgeTech','Infrastructure','equity',3685.55,3650.00,3660.00,3720.00,3620.00,1080400,428900,32.4,4050.00,2680.00),
('GEARWORKS','GearWorks','Auto Ancillary','equity',3125.00,3098.00,3100.00,3160.00,3075.00,884200,128500,30.5,3410.00,2210.00),
('VOLTSYS','VoltSys','Capital Goods','equity',6840.00,6780.00,6790.00,6920.00,6740.00,512300,158400,33.8,7500.00,4520.00),
('GRIDBOX','GridBox','Capital Goods','equity',7420.50,7350.00,7370.00,7500.00,7310.00,298400,168900,39.2,8150.00,4980.00),
('TORQUETECH','TorqueTech','Capital Goods','equity',3610.20,3580.00,3590.00,3650.00,3550.00,684100,142500,28.9,3980.00,2450.00),
('KILAFORGE','Kila Forge','Auto Ancillary','equity',1480.75,1468.00,1470.00,1495.00,1455.00,1520400,125800,35.4,1620.00,980.00),
('ASHOKA','Ashoka Trucks','Automobile','equity',234.15,232.00,233.00,238.00,230.00,5941000,128400,21.8,265.00,150.00),
('VROOM','Vroom Motors','Automobile','equity',2485.90,2460.00,2470.00,2510.00,2440.00,1280500,148700,42.1,2750.00,1710.00),
('MAUSAM','Mausam Motors','Automobile','equity',11890.00,11780.00,11800.00,11950.00,11690.00,342100,398500,27.5,12900.00,9100.00),
('CHAMPION','Champion Bikes','Automobile','equity',5210.30,5160.00,5180.00,5250.00,5120.00,584200,168400,25.2,5690.00,3980.00),
('RUKKAAUTO','Rukka Auto','Automobile','equity',9855.75,9760.00,9780.00,9920.00,9720.00,684100,298500,24.9,10700.00,7420.00),
('RUKKAFIN','Rukka Finance','Financial Services','equity',7420.60,7350.00,7370.00,7490.00,7310.00,428100,435800,31.7,8120.00,5480.00),
('RIDER','Rider Motors','Automobile','equity',3840.25,3810.00,3820.00,3880.00,3780.00,495100,142800,26.3,4210.00,2890.00),
('SURYAPHARMA','Surya Pharma','Pharmaceuticals','equity',1568.45,1558.00,1560.00,1580.00,1548.00,1850400,378400,36.2,1710.00,1120.00),
('DRVERMA','Dr. Verma''s Labs','Pharmaceuticals','equity',6230.85,6180.00,6200.00,6290.00,6150.00,384100,148500,38.5,6850.00,4520.00),
('SEHATLABS','Sehat Labs','Pharmaceuticals','equity',1485.20,1475.00,1478.00,1500.00,1465.00,1650400,118500,25.8,1620.00,1050.00),
('PRAVAH','Pravah Pharma','Pharmaceuticals','equity',3325.60,3300.00,3310.00,3360.00,3280.00,684100,168400,33.4,3650.00,2380.00),
('AYURLABS','AyurLabs','Pharmaceuticals','equity',985.75,978.00,980.00,998.00,972.00,2150400,125800,29.6,1080.00,720.00),
('LOOMLABS','Loom Labs','Pharmaceuticals','equity',2210.40,2195.00,2200.00,2240.00,2175.00,884100,152600,34.8,2430.00,1580.00),
('AURAPHARMA','AuraPharma','Pharmaceuticals','equity',1120.30,1112.00,1115.00,1132.00,1105.00,1280400,138400,22.4,1230.00,850.00),
('CHEMCORE','ChemCore','Pharmaceuticals','equity',4210.80,4180.00,4190.00,4250.00,4150.00,284100,118500,41.8,4650.00,3010.00),
('GANGACARE','GangaCare','FMCG','equity',2620.50,2600.00,2610.00,2650.00,2585.00,1280400,528400,55.2,2890.00,2120.00),
('NOVAFOODS','NovaFoods','FMCG','equity',2490.75,2470.00,2480.00,2520.00,2455.00,984100,218500,48.9,2750.00,1980.00),
('HERBROOT','HerbRoot','FMCG','equity',585.40,581.00,582.00,592.00,578.00,2680400,102400,44.3,645.00,468.00),
('BISCUIT','BiscuitBharat','FMCG','equity',5220.15,5170.00,5180.00,5270.00,5140.00,328100,128900,52.6,5740.00,4210.00),
('SUBAH','Subah Fresh','FMCG','equity',468.30,465.00,466.00,474.00,461.00,5210400,318500,26.4,515.00,372.00),
('BAAZAAR','BaazaarMart','Retail','equity',3985.60,3950.00,3960.00,4020.00,3920.00,1520400,268400,48.5,4380.00,3120.00),
('TRENDBAZAAR','TrendBazaar','Retail','equity',6850.40,6790.00,6800.00,6920.00,6750.00,428100,225800,58.7,7540.00,5010.00),
('GLOWKART','GlowKart','Retail','equity',178.25,176.80,177.00,182.00,174.50,8141000,168500,38.4,205.00,128.00),
('BHOJAN','Bhojan Delivery','Consumer Services','equity',262.40,260.20,261.00,268.00,258.00,9821000,198400,89.2,295.00,112.00),
('KHANARUSH','KhanaRush','Consumer Services','equity',348.90,346.00,347.00,354.00,342.00,7684000,98500,72.5,392.00,158.00),
('CASHMELA','CashMela','Fintech','equity',845.30,838.00,840.00,852.00,832.00,5120400,268400,58.1,935.00,428.00),
('BIMA','BimaBazaar','Fintech','equity',1580.40,1565.00,1570.00,1598.00,1555.00,3120400,142500,66.8,1750.00,985.00),
('RAILBOOK','RailBook','Travel & Tourism','equity',985.60,978.00,980.00,994.00,972.00,2841000,152800,54.9,1085.00,648.00),
('SKYWINGS','SkyWings Air','Travel & Tourism','equity',4230.15,4190.00,4200.00,4280.00,4160.00,684100,128400,32.8,4650.00,3010.00),
('ZESTYJET','ZestyJet','Travel & Tourism','equity',68.40,67.90,68.00,70.50,66.80,15408000,15200,44.6,78.00,42.00),
('CINEMAX','CinemaMax','Media & Entertainment','equity',1420.85,1410.00,1415.00,1438.00,1402.00,2480400,118500,39.4,1560.00,1050.00),
('ADVAITPORTS','Advait Ports','Infrastructure','equity',1285.40,1275.00,1278.00,1302.00,1268.00,3120400,278500,31.7,1410.00,915.00),
('ADVAITGREEN','Advait Green','Power & Energy','equity',1680.70,1665.00,1670.00,1705.00,1655.00,4281000,348600,49.5,1845.00,1120.00),
('ADVAITENTER','Advait Enterprises','Conglomerate','equity',2850.30,2825.00,2830.00,2885.00,2810.00,1850400,315800,36.8,3150.00,2210.00),
('MINERVA','Minerva Metals','Metals & Mining','equity',448.60,445.20,446.00,454.00,441.00,6510400,268500,12.4,512.00,315.00),
('ALUBHARAT','AluBharat','Metals & Mining','equity',512.40,508.00,510.00,518.50,505.00,4821000,148500,13.7,585.00,368.00),
('JHANKAR','Jhankar Steel','Metals & Mining','equity',895.30,888.00,890.00,905.00,883.00,3841000,238500,14.2,1015.00,612.00),
('MEGACEM','MegaCem','Cement','equity',9850.40,9760.00,9780.00,9950.00,9720.00,284100,268400,38.9,10850.00,7420.00),
('CEMBHARAT','CemBharat','Cement','equity',585.60,581.00,582.00,592.00,578.00,3821000,128500,31.5,645.00,428.00),
('CEMSURE','CemSure','Cement','equity',2650.25,2630.00,2640.00,2680.00,2610.00,584100,152800,42.7,2910.00,1980.00),
('SHIVCEM','ShivCem','Cement','equity',2685.00,2660.00,2670.00,2715.00,2645.00,482100,138400,36.4,2950.00,2010.00),
('SUTRA','Sutra Industries','Textiles','equity',2480.35,2460.00,2470.00,2510.00,2445.00,684100,118500,45.8,2720.00,1810.00),
('CHITRA','Chitra Paints','Consumer Durables','equity',2985.60,2960.00,2970.00,3020.00,2945.00,984100,248500,58.4,3280.00,2350.00),
('BONDTITE','BondTite','Chemicals','equity',3120.45,3090.00,3100.00,3155.00,3075.00,428100,138500,63.2,3430.00,2410.00),
('SPARKELEC','SparkElec','Consumer Durables','equity',1620.85,1608.00,1610.00,1640.00,1600.00,1850400,125800,42.8,1780.00,1280.00),
('ATLASWATCH','Atlas Watches','Consumer Durables','equity',3240.30,3210.00,3220.00,3285.00,3195.00,984100,268400,61.5,3560.00,2620.00),
('MEDICITY','MediCity Hospitals','Healthcare','equity',6850.60,6790.00,6800.00,6920.00,6750.00,428100,148500,52.4,7540.00,5010.00),
('JEEVAN','JeevanSure Life','Insurance','equity',1480.25,1470.00,1472.00,1500.00,1462.00,2180400,168400,44.9,1630.00,1120.00)
on conflict (symbol) do nothing;

-- ============================================================
--  Seed: fictional cryptocurrencies (12)
-- ============================================================
insert into public.jb_stocks (symbol, name, sector, kind, price, prev_close, day_open, day_high, day_low, volume, market_cap, pe, high_52w, low_52w) values
('NOVACOIN','NovaCoin','Cryptocurrency','crypto',5240000.00,5185000.00,5190000.00,5320000.00,5120000.00,4521000,98840000,0,6890000.00,3100000.00),
('AURUMCOIN','AurumCoin','Cryptocurrency','crypto',245000.00,242500.00,243000.00,251000.00,240000.00,6120000,29840000,0,315000.00,142000.00),
('GANGACOIN','GangaCoin','Cryptocurrency','crypto',128.40,126.80,127.00,133.00,124.50,12508000,4520000,0,168.00,82.00),
('PIOCOIN','PioCoin','Cryptocurrency','crypto',6850.00,6790.00,6800.00,7120.00,6720.00,3184000,6840000,0,9450.00,4280.00),
('DADATOKEN','DadaToken','Cryptocurrency','crypto',85.40,84.10,84.50,90.20,82.80,16840000,3850000,0,124.00,52.00),
('HIMCOIN','HimCoin','Cryptocurrency','crypto',1240.00,1228.00,1230.00,1295.00,1210.00,5420000,4980000,0,1620.00,780.00),
('SAGARCOIN','SagarCoin','Cryptocurrency','crypto',64.20,63.50,63.80,67.40,62.10,21840000,2840000,0,92.00,41.00),
('VAJRACOIN','VajraCoin','Cryptocurrency','crypto',3850.00,3810.00,3820.00,4050.00,3780.00,2840000,6120000,0,5210.00,2410.00),
('BHARATCHAIN','BharatChain','Cryptocurrency','crypto',28.60,28.30,28.40,30.10,27.80,31840000,1520000,0,42.00,18.00),
('LOTUSTOKEN','LotusToken','Cryptocurrency','crypto',12.40,12.28,12.30,13.10,12.05,41200000,984000,0,18.50,7.20),
('PEACOCK','PeacockCoin','Cryptocurrency','crypto',1.85,1.83,1.84,2.05,1.79,58400000,685000,0,3.10,1.10),
('TIGERCOIN','TigerCoin','Cryptocurrency','crypto',95.75,94.80,95.00,102.00,93.50,14840000,4280000,0,138.00,58.00)
on conflict (symbol) do nothing;
