-- ============================================================
-- RPC Functions — ทุกฟังก์ชันทำงานใน transaction เดียว (atomic)
-- ============================================================

-- ------------------------------------------------------------
-- 0) Bootstrap ร้านใหม่ + master data พื้นฐาน
-- ------------------------------------------------------------
create or replace function public.fn_bootstrap_store(p_store_name text)
returns uuid language plpgsql security definer set search_path = public as $
declare v_store uuid;
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;

  insert into stores (owner_id, name) values (auth.uid(), p_store_name)
  returning id into v_store;

  update profiles set default_store_id = v_store where id = auth.uid();

  insert into units (store_id, code, name_th, kind) values
    (v_store,'slice','แผ่น','count'), (v_store,'egg','ฟอง','count'),
    (v_store,'piece','ชิ้น','count'), (v_store,'box','กล่อง','count'),
    (v_store,'sachet','ซอง','count'), (v_store,'sheet','ใบ','count'),
    (v_store,'g','กรัม','weight'),    (v_store,'kg','กิโลกรัม','weight'),
    (v_store,'ml','มิลลิลิตร','volume'), (v_store,'l','ลิตร','volume');

  insert into unit_conversions (store_id, from_unit_id, to_unit_id, factor)
  select v_store, a.id, b.id, 1000
  from units a join units b on b.store_id = a.store_id
  where a.store_id = v_store and ((a.code='kg' and b.code='g') or (a.code='l' and b.code='ml'));

  insert into ingredient_categories (store_id, name, is_packaging, sort_order) values
    (v_store,'อาหารสด',false,1), (v_store,'วัตถุดิบแห้ง',false,2),
    (v_store,'ซอส',false,3), (v_store,'บรรจุภัณฑ์',true,4), (v_store,'อื่น ๆ',false,5);

  insert into delivery_platforms (store_id, code, name, commission_pct) values
    (v_store,'walkin','รับเอง/หน้าร้าน',0),
    (v_store,'grab','GrabFood',30),
    (v_store,'lineman','LINE MAN',30),
    (v_store,'shopee','ShopeeFood',30),
    (v_store,'other','อื่น ๆ',0);

  insert into expense_categories (store_id, name, kind) values
    (v_store,'ค่าไฟ','fixed'), (v_store,'ค่าน้ำ','fixed'), (v_store,'ค่าแก๊ส','variable'),
    (v_store,'ค่าเดินทางไปซื้อของ','variable'), (v_store,'ค่าอุปกรณ์','fixed'),
    (v_store,'ค่าโฆษณา','variable'), (v_store,'ค่าโปรโมชัน','variable'),
    (v_store,'ค่าแรงผู้ช่วย','variable'), (v_store,'อื่น ๆ','variable');

  return v_store;
end $;

-- ------------------------------------------------------------
-- 1) รับสินค้าเข้าสต็อก + คำนวณ Weighted Average Cost
--    base_qty = purchase_qty * units_per_pack
--    unit_cost = total_price / base_qty
--    new_avg = (on_hand*avg + base_qty*unit_cost) / (on_hand + base_qty)
-- ------------------------------------------------------------
create or replace function public.fn_receive_stock(
  p_ingredient_id uuid,
  p_purchase_qty  numeric,      -- จำนวนที่ซื้อ เช่น 2 (แพ็ก)
  p_units_per_pack numeric,     -- หน่วยย่อยต่อแพ็ก เช่น 20 (แผ่น)
  p_total_price   numeric,      -- ราคาที่จ่ายจริงรวม
  p_expiry_date   date default null,
  p_received_at   date default null,
  p_supplier_id   uuid default null,
  p_receipt_url   text default null,
  p_note          text default null
) returns uuid language plpgsql security definer set search_path = public as $
declare
  v_store uuid; v_on_hand numeric(18,4); v_avg numeric(18,6);
  v_base numeric(18,4); v_unit_cost numeric(18,6);
  v_new_avg numeric(18,6); v_lot uuid; v_old_avg numeric(18,6); v_spike numeric(5,2);
begin
  select i.store_id, i.qty_on_hand, i.avg_unit_cost into v_store, v_on_hand, v_avg
  from ingredients i where i.id = p_ingredient_id for update;
  if v_store is null then raise exception 'ไม่พบวัตถุดิบ'; end if;
  if not is_store_owner(v_store) then raise exception 'ไม่มีสิทธิ์เข้าถึงร้านนี้'; end if;
  if coalesce(p_purchase_qty,0) <= 0 then raise exception 'จำนวนที่ซื้อต้องมากกว่า 0'; end if;
  if coalesce(p_units_per_pack,0) <= 0 then raise exception 'จำนวนหน่วยย่อยต่อแพ็กต้องมากกว่า 0'; end if;
  if coalesce(p_total_price,0) < 0 then raise exception 'ราคาต้องไม่ติดลบ'; end if;

  v_base      := round(p_purchase_qty * p_units_per_pack, 4);
  v_unit_cost := round(p_total_price / v_base, 6);
  v_old_avg   := v_avg;

  if (v_on_hand + v_base) > 0 then
    v_new_avg := round(((greatest(v_on_hand,0) * v_avg) + (v_base * v_unit_cost))
                       / (greatest(v_on_hand,0) + v_base), 6);
  else
    v_new_avg := v_unit_cost;
  end if;

  insert into inventory_lots (store_id, ingredient_id, received_at, qty_received,
                              qty_remaining, unit_cost, expiry_date, supplier_id, receipt_url, note)
  values (v_store, p_ingredient_id,
          coalesce(p_received_at, (now() at time zone 'Asia/Bangkok')::date),
          v_base, v_base, v_unit_cost, p_expiry_date, p_supplier_id, p_receipt_url, p_note)
  returning id into v_lot;

  update ingredients set qty_on_hand = qty_on_hand + v_base,
                         avg_unit_cost = v_new_avg,
                         last_unit_cost = v_unit_cost,
                         supplier_id = coalesce(p_supplier_id, supplier_id)
  where id = p_ingredient_id;

  insert into inventory_movements (store_id, ingredient_id, lot_id, movement_type, qty_base,
                                   unit_cost, total_cost, ref_type, ref_id, reason, created_by)
  values (v_store, p_ingredient_id, v_lot, 'receive', v_base, v_unit_cost,
          round(p_total_price,2), 'inventory_lot', v_lot, 'รับของเข้าสต็อก', auth.uid());

  -- แจ้งเตือนต้นทุนพุ่ง
  select cost_spike_pct into v_spike from stores where id = v_store;
  if v_old_avg > 0 and v_unit_cost > v_old_avg * (1 + v_spike/100) then
    insert into notifications (store_id, type, severity, title, body, ref_type, ref_id, action_url)
    select v_store, 'cost_spike', 'warning',
           'ต้นทุน "' || i.name || '" เพิ่มขึ้นผิดปกติ',
           'จาก ' || to_char(v_old_avg,'FM999999990.00') || ' → ' ||
           to_char(v_unit_cost,'FM999999990.00') || ' บาท/หน่วย',
           'ingredient', i.id, '/recipes'
    from ingredients i where i.id = p_ingredient_id;
  end if;

  insert into audit_logs (store_id, user_id, action, table_name, row_id, after)
  values (v_store, auth.uid(), 'receive_stock', 'inventory_lots', v_lot,
          jsonb_build_object('base_qty', v_base, 'unit_cost', v_unit_cost, 'total', p_total_price));

  return v_lot;
end $;

-- ------------------------------------------------------------
-- 2) ตัดสต็อกแบบ FIFO (internal helper) — คืนต้นทุนจริงที่ถูกตัด
-- ------------------------------------------------------------
create or replace function public.fn_consume_fifo(
  p_store uuid, p_ingredient uuid, p_qty numeric,
  p_ref_type text, p_ref_id uuid, p_reason text, p_force boolean
) returns numeric language plpgsql security definer set search_path = public as $
declare
  r record; v_left numeric(18,4) := p_qty; v_take numeric(18,4);
  v_cost numeric(14,2) := 0; v_avg numeric(18,6); v_onhand numeric(18,4); v_name text;
begin
  select qty_on_hand, avg_unit_cost, name into v_onhand, v_avg, v_name
  from ingredients where id = p_ingredient for update;

  if v_onhand < p_qty and not p_force then
    raise exception 'สต็อก "%" ไม่พอ (มี % ต้องใช้ %) — ต้องยืนยันก่อนทำให้ติดลบ',
      v_name, v_onhand, p_qty using errcode = 'P0001';
  end if;

  for r in
    select id, qty_remaining, unit_cost from inventory_lots
    where ingredient_id = p_ingredient and qty_remaining > 0
    order by expiry_date nulls last, received_at, created_at
    for update
  loop
    exit when v_left <= 0;
    v_take := least(v_left, r.qty_remaining);
    update inventory_lots set qty_remaining = qty_remaining - v_take where id = r.id;
    v_cost  := v_cost + round(v_take * r.unit_cost, 2);
    v_left  := v_left - v_take;

    insert into inventory_movements (store_id, ingredient_id, lot_id, movement_type, qty_base,
                                     unit_cost, total_cost, ref_type, ref_id, reason, created_by)
    values (p_store, p_ingredient, r.id,
            case when p_ref_type = 'sales_order' then 'sale'::movement_type
                 when p_ref_type = 'waste' then 'waste'::movement_type
                 else 'adjust'::movement_type end,
            -v_take, r.unit_cost, round(v_take * r.unit_cost, 2),
            p_ref_type, p_ref_id, p_reason, auth.uid());
  end loop;

  -- ส่วนที่ไม่มี lot รองรับ (กรณี force) → คิดด้วยต้นทุนเฉลี่ย
  if v_left > 0 then
    v_cost := v_cost + round(v_left * v_avg, 2);
    insert into inventory_movements (store_id, ingredient_id, movement_type, qty_base,
                                     unit_cost, total_cost, ref_type, ref_id, reason, created_by)
    values (p_store, p_ingredient, 'sale', -v_left, v_avg, round(v_left * v_avg, 2),
            p_ref_type, p_ref_id, coalesce(p_reason,'') || ' (สต็อกติดลบ - ยืนยันโดยผู้ใช้)', auth.uid());
  end if;

  update ingredients set qty_on_hand = qty_on_hand - p_qty where id = p_ingredient;
  return v_cost;
end $;

-- ------------------------------------------------------------
-- 3) บันทึกการขาย + ตัดสต็อกตามสูตร (atomic)
--    p_items = [{"menu_item_id":"...","qty":2,"unit_price":59}]
-- ------------------------------------------------------------
create or replace function public.fn_post_sale(
  p_store_id    uuid,
  p_platform_id uuid,
  p_occurred_at timestamptz,
  p_items       jsonb,
  p_shop_discount numeric default 0,
  p_commission  numeric default null,   -- null = คำนวณจาก % ของแพลตฟอร์ม
  p_other_fees  numeric default 0,
  p_status      sale_status default 'completed',
  p_note        text default null,
  p_order_no    text default null,
  p_force       boolean default false
) returns uuid language plpgsql security definer set search_path = public as $
declare
  v_order uuid; it jsonb; r record;
  v_gross numeric(14,2) := 0; v_cogs numeric(14,2) := 0;
  v_comm numeric(14,2); v_pct numeric(5,2) := 0; v_qty numeric(18,4);
  v_line_total numeric(14,2); v_line_cogs numeric(14,2); v_item_id uuid;
begin
  if not is_store_owner(p_store_id) then raise exception 'ไม่มีสิทธิ์เข้าถึงร้านนี้'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'ต้องมีรายการเมนูอย่างน้อย 1 รายการ'; end if;

  insert into sales_orders (store_id, order_no, occurred_at, platform_id, status, note)
  values (p_store_id, p_order_no, coalesce(p_occurred_at, now()), p_platform_id, p_status, p_note)
  returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    v_qty        := (it->>'qty')::numeric;
    v_line_total := round(v_qty * (it->>'unit_price')::numeric, 2);
    v_gross      := v_gross + v_line_total;
    v_line_cogs  := 0;

    insert into sales_order_items (store_id, order_id, menu_item_id, qty, unit_price, line_total)
    values (p_store_id, v_order, (it->>'menu_item_id')::uuid, v_qty,
            (it->>'unit_price')::numeric, v_line_total)
    returning id into v_item_id;

    if p_status = 'completed' then
      for r in
        select ri.ingredient_id, ri.qty * v_qty / rc.yield_qty as need
        from recipes rc
        join recipe_items ri on ri.recipe_id = rc.id
        where rc.menu_item_id = (it->>'menu_item_id')::uuid
      loop
        v_line_cogs := v_line_cogs +
          fn_consume_fifo(p_store_id, r.ingredient_id, round(r.need,4),
                          'sales_order', v_order, 'ตัดสต็อกจากการขาย', p_force);
      end loop;
      update sales_order_items set line_cogs = v_line_cogs where id = v_item_id;
      v_cogs := v_cogs + v_line_cogs;
    end if;
  end loop;

  if p_commission is null then
    select commission_pct into v_pct from delivery_platforms where id = p_platform_id;
    v_comm := round(v_gross * coalesce(v_pct,0) / 100, 2);
  else
    v_comm := round(p_commission, 2);
  end if;

  update sales_orders
     set gross_sales = v_gross,
         shop_discount = round(coalesce(p_shop_discount,0),2),
         commission_amount = v_comm,
         other_fees = round(coalesce(p_other_fees,0),2),
         net_sales = round(v_gross - coalesce(p_shop_discount,0), 2),
         cogs = v_cogs,
         stock_deducted = (p_status = 'completed')
   where id = v_order;

  insert into audit_logs (store_id, user_id, action, table_name, row_id, after)
  values (p_store_id, auth.uid(), 'post_sale', 'sales_orders', v_order,
          jsonb_build_object('gross', v_gross, 'cogs', v_cogs, 'status', p_status));

  perform fn_rebuild_alerts(p_store_id);
  return v_order;
end $;

-- ------------------------------------------------------------
-- 4) ยกเลิกออร์เดอร์  p_mode: 'return' (คืนเข้าสต็อก) | 'waste' (ของเสีย)
-- ------------------------------------------------------------
create or replace function public.fn_cancel_sale(p_order_id uuid, p_mode text default 'return')
returns void language plpgsql security definer set search_path = public as $
declare v_store uuid; v_ded boolean; r record; v_lot uuid;
begin
  select store_id, stock_deducted into v_store, v_ded
  from sales_orders where id = p_order_id for update;
  if v_store is null then raise exception 'ไม่พบออร์เดอร์'; end if;
  if not is_store_owner(v_store) then raise exception 'ไม่มีสิทธิ์'; end if;

  if v_ded then
    for r in
      select m.ingredient_id, sum(-m.qty_base) as qty, sum(m.total_cost) as cost
      from inventory_movements m
      where m.ref_type = 'sales_order' and m.ref_id = p_order_id and m.qty_base < 0
      group by m.ingredient_id
    loop
      if p_mode = 'return' then
        insert into inventory_lots (store_id, ingredient_id, qty_received, qty_remaining, unit_cost, note)
        values (v_store, r.ingredient_id, r.qty, r.qty,
                case when r.qty > 0 then round(r.cost / r.qty, 6) else 0 end,
                'คืนจากออร์เดอร์ยกเลิก')
        returning id into v_lot;

        update ingredients set qty_on_hand = qty_on_hand + r.qty where id = r.ingredient_id;

        insert into inventory_movements (store_id, ingredient_id, lot_id, movement_type, qty_base,
                                         total_cost, ref_type, ref_id, reason, created_by)
        values (v_store, r.ingredient_id, v_lot, 'return', r.qty, r.cost,
                'sales_order', p_order_id, 'คืนเข้าสต็อกจากออร์เดอร์ยกเลิก', auth.uid());
      else
        insert into waste_records (store_id, ingredient_id, qty_base, reason, cost, note)
        values (v_store, r.ingredient_id, r.qty, 'ของเสีย', r.cost, 'ยกเลิกหลังทำอาหาร');
      end if;
    end loop;
  end if;

  update sales_orders set status = 'cancelled', stock_deducted = false,
         cogs = case when p_mode = 'return' then 0 else cogs end
  where id = p_order_id;

  insert into audit_logs (store_id, user_id, action, table_name, row_id, after)
  values (v_store, auth.uid(), 'cancel_sale', 'sales_orders', p_order_id,
          jsonb_build_object('mode', p_mode));
end $;

-- ------------------------------------------------------------
-- 5) บันทึกของเสีย / ปรับสต็อกจากการนับจริง
-- ------------------------------------------------------------
create or replace function public.fn_record_waste(
  p_ingredient_id uuid, p_qty numeric, p_reason text, p_note text default null
) returns uuid language plpgsql security definer set search_path = public as $
declare v_store uuid; v_cost numeric(14,2); v_id uuid;
begin
  select store_id into v_store from ingredients where id = p_ingredient_id;
  if not is_store_owner(v_store) then raise exception 'ไม่มีสิทธิ์'; end if;
  if p_qty <= 0 then raise exception 'จำนวนต้องมากกว่า 0'; end if;

  v_cost := fn_consume_fifo(v_store, p_ingredient_id, round(p_qty,4), 'waste', null, p_reason, false);

  insert into waste_records (store_id, ingredient_id, qty_base, reason, cost, note)
  values (v_store, p_ingredient_id, p_qty, p_reason, v_cost, p_note) returning id into v_id;

  perform fn_rebuild_alerts(v_store);
  return v_id;
end $;

create or replace function public.fn_adjust_stock(
  p_ingredient_id uuid, p_counted_qty numeric, p_reason text default 'นับสต็อกจริง'
) returns void language plpgsql security definer set search_path = public as $
declare v_store uuid; v_on_hand numeric(18,4); v_diff numeric(18,4); v_avg numeric(18,6); v_lot uuid;
begin
  select store_id, qty_on_hand, avg_unit_cost into v_store, v_on_hand, v_avg
  from ingredients where id = p_ingredient_id for update;
  if not is_store_owner(v_store) then raise exception 'ไม่มีสิทธิ์'; end if;

  v_diff := round(p_counted_qty - v_on_hand, 4);
  if v_diff = 0 then return; end if;

  if v_diff > 0 then
    insert into inventory_lots (store_id, ingredient_id, qty_received, qty_remaining, unit_cost, note)
    values (v_store, p_ingredient_id, v_diff, v_diff, v_avg, p_reason) returning id into v_lot;
    update ingredients set qty_on_hand = p_counted_qty where id = p_ingredient_id;
    insert into inventory_movements (store_id, ingredient_id, lot_id, movement_type, qty_base,
                                     unit_cost, total_cost, ref_type, reason, created_by)
    values (v_store, p_ingredient_id, v_lot, 'adjust', v_diff, v_avg,
            round(v_diff * v_avg,2), 'adjustment', p_reason, auth.uid());
  else
    perform fn_consume_fifo(v_store, p_ingredient_id, -v_diff, 'adjustment', null, p_reason, true);
    update ingredients set qty_on_hand = p_counted_qty where id = p_ingredient_id;
  end if;

  insert into audit_logs (store_id, user_id, action, table_name, row_id, before, after)
  values (v_store, auth.uid(), 'adjust_stock', 'ingredients', p_ingredient_id,
          jsonb_build_object('qty', v_on_hand), jsonb_build_object('qty', p_counted_qty));

  perform fn_rebuild_alerts(v_store);
end $;

-- ------------------------------------------------------------
-- 6) สร้าง Shopping List จากแผนขาย (atomic)
-- ------------------------------------------------------------
create or replace function public.fn_build_shopping_list(p_plan_id uuid)
returns uuid language plpgsql security definer set search_path = public as $
declare v_store uuid; v_list uuid; v_total numeric(14,2) := 0;
begin
  select store_id into v_store from production_plans where id = p_plan_id;
  if not is_store_owner(v_store) then raise exception 'ไม่มีสิทธิ์'; end if;

  delete from shopping_lists where plan_id = p_plan_id;
  insert into shopping_lists (store_id, plan_id) values (v_store, p_plan_id) returning id into v_list;

  insert into shopping_list_items (store_id, list_id, ingredient_id, qty_on_hand, qty_required,
                                   qty_short, qty_suggested, unit_id, last_price, estimated_cost)
  select v_store, v_list, x.ingredient_id, i.qty_on_hand, x.required,
         greatest(x.required - i.qty_on_hand, 0),
         greatest(greatest(i.target_stock, x.required) - i.qty_on_hand, 0),
         i.base_unit_id,
         case when i.last_unit_cost > 0 then i.last_unit_cost else i.avg_unit_cost end,
         round(greatest(greatest(i.target_stock, x.required) - i.qty_on_hand, 0)
               * case when i.last_unit_cost > 0 then i.last_unit_cost else i.avg_unit_cost end, 2)
  from (
    select ri.ingredient_id, round(sum(ri.qty * ppi.planned_qty / rc.yield_qty), 4) as required
    from production_plan_items ppi
    join recipes rc on rc.menu_item_id = ppi.menu_item_id
    join recipe_items ri on ri.recipe_id = rc.id
    where ppi.plan_id = p_plan_id
    group by ri.ingredient_id
  ) x
  join ingredients i on i.id = x.ingredient_id
  where greatest(greatest(i.target_stock, x.required) - i.qty_on_hand, 0) > 0;

  select coalesce(sum(estimated_cost),0) into v_total from shopping_list_items where list_id = v_list;
  update shopping_lists set estimated_total = v_total where id = v_list;
  return v_list;
end $;

-- ------------------------------------------------------------
-- 7) สร้าง/รีเฟรชการแจ้งเตือน
-- ------------------------------------------------------------
create or replace function public.fn_rebuild_alerts(p_store_id uuid)
returns void language plpgsql security definer set search_path = public as $
declare v_warn int; v_urgent int; v_target numeric(5,2);
begin
  if not is_store_owner(p_store_id) then return; end if;
  select expiry_warn_days, expiry_urgent_days, target_margin_pct
    into v_warn, v_urgent, v_target from stores where id = p_store_id;

  delete from notifications where store_id = p_store_id and is_read = false;

  -- หมดสต็อก / ต่ำกว่าจุดสั่งซื้อ
  insert into notifications (store_id, type, severity, title, body, ref_type, ref_id, action_url)
  select p_store_id,
         case when i.qty_on_hand <= 0 then 'out_of_stock' else 'low_stock' end,
         case when i.qty_on_hand <= 0 then 'critical'::notif_severity else 'warning'::notif_severity end,
         case when i.qty_on_hand <= 0 then '❌ ' || i.name || ' หมดสต็อก'
              else '⚠️ ' || i.name || ' ใกล้หมด' end,
         'คงเหลือ ' || trim(to_char(i.qty_on_hand,'FM999999990.##')) || ' ' || u.name_th ||
         ' • แนะนำซื้อเพิ่ม ' || trim(to_char(greatest(i.target_stock - i.qty_on_hand,0),'FM999999990.##')) || ' ' || u.name_th,
         'ingredient', i.id, '/purchases?ingredient=' || i.id
  from ingredients i join units u on u.id = i.base_unit_id
  where i.store_id = p_store_id and i.is_active and i.qty_on_hand <= i.reorder_point;

  -- ใกล้หมดอายุ
  insert into notifications (store_id, type, severity, title, body, ref_type, ref_id, action_url)
  select p_store_id,
         case when l.expiry_date <= current_date + v_urgent then 'expiry_urgent' else 'expiry_soon' end,
         case when l.expiry_date <= current_date + v_urgent then 'critical'::notif_severity else 'warning'::notif_severity end,
         '📅 ' || i.name || ' ใกล้หมดอายุ',
         'หมดอายุ ' || to_char(l.expiry_date,'DD/MM/YYYY') ||
         ' • เหลือ ' || trim(to_char(l.qty_remaining,'FM999999990.##')) || ' ' || u.name_th,
         'ingredient', i.id, '/ingredients?id=' || i.id
  from inventory_lots l
  join ingredients i on i.id = l.ingredient_id
  join units u on u.id = i.base_unit_id
  where l.store_id = p_store_id and l.qty_remaining > 0
    and l.expiry_date is not null and l.expiry_date <= current_date + v_warn;

  -- margin ต่ำกว่าเป้า (ใช้ราคาหน้าร้าน)
  insert into notifications (store_id, type, severity, title, body, ref_type, ref_id, action_url)
  select p_store_id, 'low_margin', 'warning',
         '📉 ' || m.name || ' กำไรต่ำกว่าเป้า',
         'กำไร ' || to_char(round((m.base_price - c.cost) / nullif(m.base_price,0) * 100, 1),'FM990.0') ||
         '% • เป้า ' || to_char(coalesce(m.target_margin_pct, v_target),'FM990.0') || '%',
         'menu_item', m.id, '/recipes/' || m.id
  from menu_items m
  join lateral (
    select coalesce(sum(ri.qty * i.avg_unit_cost),0) as cost
    from recipes rc join recipe_items ri on ri.recipe_id = rc.id
    join ingredients i on i.id = ri.ingredient_id
    where rc.menu_item_id = m.id
  ) c on true
  where m.store_id = p_store_id and m.is_active and m.base_price > 0
    and ((m.base_price - c.cost) / m.base_price * 100) < coalesce(m.target_margin_pct, v_target);
end $;

-- ------------------------------------------------------------
-- 8) View สรุปกำไร (ใช้กับ Dashboard/รายงาน)
-- ------------------------------------------------------------
create or replace view v_daily_profit
with (security_invoker = true) as
select
  so.store_id,
  (so.occurred_at at time zone 'Asia/Bangkok')::date as biz_date,
  count(*) filter (where so.status = 'completed')                     as order_count,
  coalesce(sum(so.gross_sales) filter (where so.status='completed'),0)       as gross_sales,
  coalesce(sum(so.shop_discount) filter (where so.status='completed'),0)     as shop_discount,
  coalesce(sum(so.net_sales) filter (where so.status='completed'),0)         as net_sales,
  coalesce(sum(so.cogs) filter (where so.status='completed'),0)              as cogs,
  coalesce(sum(so.commission_amount) filter (where so.status='completed'),0) as commission,
  coalesce(sum(so.other_fees) filter (where so.status='completed'),0)        as other_fees
from sales_orders so
group by so.store_id, (so.occurred_at at time zone 'Asia/Bangkok')::date;

create or replace view v_menu_cost
with (security_invoker = true) as
select m.store_id, m.id as menu_item_id, m.name, m.base_price, m.target_margin_pct,
       coalesce(sum(ri.qty * i.avg_unit_cost), 0)::numeric(14,4) as unit_cost
from menu_items m
left join recipes rc on rc.menu_item_id = m.id
left join recipe_items ri on ri.recipe_id = rc.id
left join ingredients i on i.id = ri.ingredient_id
group by m.store_id, m.id, m.name, m.base_price, m.target_margin_pct;