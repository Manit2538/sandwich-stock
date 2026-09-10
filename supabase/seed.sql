-- ============================================================
-- Seed Data ภาษาไทย
-- วิธีใช้: สมัครสมาชิกในแอปก่อน แล้วรันสคริปต์นี้ใน SQL Editor
-- แทนที่ 'you@example.com' ด้วยอีเมลที่คุณสมัคร
-- ============================================================
do $
declare
  v_uid uuid; v_store uuid;
  u_slice uuid; u_egg uuid; u_g uuid; u_piece uuid; u_box uuid; u_sheet uuid;
  c_fresh uuid; c_dry uuid; c_sauce uuid; c_pack uuid;
  i_bread uuid; i_ham uuid; i_cheese uuid; i_egg uuid; i_tuna uuid;
  i_mayo uuid; i_butter uuid; i_wrap uuid; i_box uuid; i_sticker uuid;
  m1 uuid; m2 uuid; m3 uuid; r1 uuid; r2 uuid; r3 uuid;
begin
  select id into v_uid from auth.users where email = 'you@example.com' limit 1;
  if v_uid is null then raise exception 'ไม่พบผู้ใช้ — กรุณาสมัครสมาชิกในแอปก่อน'; end if;

  select id into v_store from stores where owner_id = v_uid limit 1;
  if v_store is null then
    insert into stores (owner_id, name) values (v_uid, 'ร้านแซนวิชย่างเดลิเวอรี') returning id into v_store;
    update profiles set default_store_id = v_store where id = v_uid;

    insert into units (store_id, code, name_th, kind) values
      (v_store,'slice','แผ่น','count'),(v_store,'egg','ฟอง','count'),
      (v_store,'piece','ชิ้น','count'),(v_store,'box','กล่อง','count'),
      (v_store,'sheet','ใบ','count'),(v_store,'sachet','ซอง','count'),
      (v_store,'g','กรัม','weight'),(v_store,'kg','กิโลกรัม','weight'),
      (v_store,'ml','มิลลิลิตร','volume'),(v_store,'l','ลิตร','volume');

    insert into ingredient_categories (store_id, name, is_packaging, sort_order) values
      (v_store,'อาหารสด',false,1),(v_store,'วัตถุดิบแห้ง',false,2),
      (v_store,'ซอส',false,3),(v_store,'บรรจุภัณฑ์',true,4),(v_store,'อื่น ๆ',false,5);

    insert into delivery_platforms (store_id, code, name, commission_pct) values
      (v_store,'walkin','รับเอง/หน้าร้าน',0),(v_store,'grab','GrabFood',30),
      (v_store,'lineman','LINE MAN',30),(v_store,'shopee','ShopeeFood',30),
      (v_store,'other','อื่น ๆ',0);

    insert into expense_categories (store_id, name, kind) values
      (v_store,'ค่าไฟ','fixed'),(v_store,'ค่าน้ำ','fixed'),(v_store,'ค่าแก๊ส','variable'),
      (v_store,'ค่าเดินทางไปซื้อของ','variable'),(v_store,'ค่าอุปกรณ์','fixed'),
      (v_store,'ค่าโฆษณา','variable'),(v_store,'ค่าโปรโมชัน','variable'),
      (v_store,'ค่าแรงผู้ช่วย','variable'),(v_store,'อื่น ๆ','variable');
  end if;

  select id into u_slice from units where store_id=v_store and code='slice';
  select id into u_egg   from units where store_id=v_store and code='egg';
  select id into u_g     from units where store_id=v_store and code='g';
  select id into u_piece from units where store_id=v_store and code='piece';
  select id into u_box   from units where store_id=v_store and code='box';
  select id into u_sheet from units where store_id=v_store and code='sheet';

  select id into c_fresh from ingredient_categories where store_id=v_store and name='อาหารสด';
  select id into c_dry   from ingredient_categories where store_id=v_store and name='วัตถุดิบแห้ง';
  select id into c_sauce from ingredient_categories where store_id=v_store and name='ซอส';
  select id into c_pack  from ingredient_categories where store_id=v_store and name='บรรจุภัณฑ์';

  -- ---------- วัตถุดิบ ----------
  insert into ingredients (store_id,name,category_id,base_unit_id,reorder_point,target_stock) values
    (v_store,'ขนมปัง',c_dry,u_slice,20,80),
    (v_store,'แฮม',c_fresh,u_slice,20,60),
    (v_store,'ชีส',c_fresh,u_slice,10,40),
    (v_store,'ไข่ไก่',c_fresh,u_egg,10,30),
    (v_store,'ทูน่า',c_dry,u_g,185,555),
    (v_store,'มายองเนส',c_sauce,u_g,200,1000),
    (v_store,'เนย',c_sauce,u_g,100,500),
    (v_store,'กระดาษห่ออาหาร',c_pack,u_sheet,20,100),
    (v_store,'กล่องบรรจุภัณฑ์',c_pack,u_box,10,50),
    (v_store,'สติกเกอร์',c_pack,u_piece,20,100)
  on conflict (store_id,name) do nothing;

  select id into i_bread   from ingredients where store_id=v_store and name='ขนมปัง';
  select id into i_ham     from ingredients where store_id=v_store and name='แฮม';
  select id into i_cheese  from ingredients where store_id=v_store and name='ชีส';
  select id into i_egg     from ingredients where store_id=v_store and name='ไข่ไก่';
  select id into i_tuna    from ingredients where store_id=v_store and name='ทูน่า';
  select id into i_mayo    from ingredients where store_id=v_store and name='มายองเนส';
  select id into i_butter  from ingredients where store_id=v_store and name='เนย';
  select id into i_wrap    from ingredients where store_id=v_store and name='กระดาษห่ออาหาร';
  select id into i_box     from ingredients where store_id=v_store and name='กล่องบรรจุภัณฑ์';
  select id into i_sticker from ingredients where store_id=v_store and name='สติกเกอร์';

  -- ---------- รับของเข้าสต็อกครั้งแรก (คำนวณต้นทุน/หน่วยอัตโนมัติ) ----------
  perform fn_receive_stock(i_bread,   1, 20,   45, current_date + 5);   -- 2.25 ฿/แผ่น
  perform fn_receive_stock(i_ham,     1, 20,   75, current_date + 10);  -- 3.75 ฿/แผ่น
  perform fn_receive_stock(i_cheese,  1, 20,  120, current_date + 30);  -- 6.00 ฿/แผ่น
  perform fn_receive_stock(i_egg,     1, 30,  120, current_date + 14);  -- 4.00 ฿/ฟอง
  perform fn_receive_stock(i_tuna,    1, 185,  42, current_date + 365); -- 0.227027 ฿/กรัม
  perform fn_receive_stock(i_mayo,    1, 1000, 85, current_date + 180); -- 0.085 ฿/กรัม
  perform fn_receive_stock(i_butter,  1, 500, 110, current_date + 90);  -- 0.22 ฿/กรัม
  perform fn_receive_stock(i_wrap,    1, 100,  80, null);               -- 0.80 ฿/ใบ
  perform fn_receive_stock(i_box,     1, 50,  125, null);               -- 2.50 ฿/กล่อง
  perform fn_receive_stock(i_sticker, 1, 100,  60, null);               -- 0.60 ฿/ดวง

  -- ---------- เมนู + สูตร ----------
  insert into menu_items (store_id,name,base_price,target_margin_pct) values
    (v_store,'แซนวิชแฮมชีส',59,50),(v_store,'แซนวิชไข่ชีส',59,50),(v_store,'แซนวิชทูน่าชีส',69,50)
  on conflict (store_id,name) do nothing;

  select id into m1 from menu_items where store_id=v_store and name='แซนวิชแฮมชีส';
  select id into m2 from menu_items where store_id=v_store and name='แซนวิชไข่ชีส';
  select id into m3 from menu_items where store_id=v_store and name='แซนวิชทูน่าชีส';

  insert into menu_prices (store_id,menu_item_id,platform_id,price)
  select v_store, m.id, p.id,
         case p.code when 'walkin' then m.base_price else round(m.base_price * 1.35) end
  from menu_items m cross join delivery_platforms p
  where m.store_id = v_store and p.store_id = v_store
  on conflict (menu_item_id, platform_id) do nothing;

  insert into recipes (store_id,menu_item_id) values (v_store,m1) on conflict do nothing returning id into r1;
  insert into recipes (store_id,menu_item_id) values (v_store,m2) on conflict do nothing returning id into r2;
  insert into recipes (store_id,menu_item_id) values (v_store,m3) on conflict do nothing returning id into r3;
  select id into r1 from recipes where menu_item_id=m1;
  select id into r2 from recipes where menu_item_id=m2;
  select id into r3 from recipes where menu_item_id=m3;

  insert into recipe_items (store_id,recipe_id,ingredient_id,qty,unit_id) values
    -- แซนวิชแฮมชีส : ต้นทุน 2.25*2 + 3.75*2 + 6 + 0.22*5 + 0.085*10 + 0.80 + 2.50 + 0.60 = 21.85 ฿
    (v_store,r1,i_bread,2,u_slice),(v_store,r1,i_ham,2,u_slice),(v_store,r1,i_cheese,1,u_slice),
    (v_store,r1,i_butter,5,u_g),(v_store,r1,i_mayo,10,u_g),
    (v_store,r1,i_wrap,1,u_sheet),(v_store,r1,i_box,1,u_box),(v_store,r1,i_sticker,1,u_piece),
    -- แซนวิชไข่ชีส
    (v_store,r2,i_bread,2,u_slice),(v_store,r2,i_egg,1,u_egg),(v_store,r2,i_cheese,1,u_slice),
    (v_store,r2,i_butter,5,u_g),(v_store,r2,i_mayo,10,u_g),
    (v_store,r2,i_wrap,1,u_sheet),(v_store,r2,i_box,1,u_box),(v_store,r2,i_sticker,1,u_piece),
    -- แซนวิชทูน่าชีส
    (v_store,r3,i_bread,2,u_slice),(v_store,r3,i_tuna,60,u_g),(v_store,r3,i_cheese,1,u_slice),
    (v_store,r3,i_butter,5,u_g),(v_store,r3,i_mayo,15,u_g),
    (v_store,r3,i_wrap,1,u_sheet),(v_store,r3,i_box,1,u_box),(v_store,r3,i_sticker,1,u_piece)
  on conflict (recipe_id, ingredient_id) do nothing;

  perform fn_rebuild_alerts(v_store);
  raise notice 'Seed สำเร็จ! store_id = %', v_store;
end $;