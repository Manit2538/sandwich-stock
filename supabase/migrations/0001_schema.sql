-- ============================================================
-- Sandwich Stock & Profit : Schema
-- Money  : numeric(14,2)   | Unit cost : numeric(18,6)
-- Qty    : numeric(18,4)   | ห้ามใช้ float/double กับการเงิน
-- ============================================================
create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type unit_kind        as enum ('count','weight','volume');
create type movement_type    as enum ('receive','sale','waste','adjust','return','opening');
create type sale_status      as enum ('completed','cancelled','refunded');
create type expense_kind     as enum ('fixed','variable');
create type plan_status      as enum ('draft','confirmed','done');
create type list_status      as enum ('open','partial','done');
create type fee_type         as enum ('percent','fixed');
create type notif_severity   as enum ('info','warning','critical');

-- ---------- CORE ----------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  default_store_id uuid,
  created_at    timestamptz not null default now()
);

create table stores (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  timezone          text not null default 'Asia/Bangkok',
  currency          text not null default 'THB',
  expiry_warn_days  int  not null default 7,
  expiry_urgent_days int not null default 3,
  target_margin_pct numeric(5,2) not null default 50.00,
  cost_spike_pct    numeric(5,2) not null default 10.00,
  created_at        timestamptz not null default now(),
  constraint stores_margin_ck check (target_margin_pct between 0 and 100)
);
alter table profiles add constraint profiles_store_fk
  foreign key (default_store_id) references stores(id) on delete set null;
create index idx_stores_owner on stores(owner_id);

-- ---------- UNITS ----------
create table units (
  id        uuid primary key default gen_random_uuid(),
  store_id  uuid not null references stores(id) on delete cascade,
  code      text not null,                 -- slice, egg, g, ml, piece, sachet, box
  name_th   text not null,                 -- แผ่น, ฟอง, กรัม, ...
  kind      unit_kind not null default 'count',
  unique (store_id, code)
);
create index idx_units_store on units(store_id);

create table unit_conversions (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  from_unit_id uuid not null references units(id) on delete cascade,
  to_unit_id   uuid not null references units(id) on delete cascade,
  factor       numeric(18,6) not null,      -- 1 from = factor * to
  unique (store_id, from_unit_id, to_unit_id),
  constraint uc_factor_ck check (factor > 0),
  constraint uc_diff_ck   check (from_unit_id <> to_unit_id)
);

-- ---------- MASTER DATA ----------
create table ingredient_categories (
  id        uuid primary key default gen_random_uuid(),
  store_id  uuid not null references stores(id) on delete cascade,
  name      text not null,                  -- อาหารสด/วัตถุดิบแห้ง/ซอส/บรรจุภัณฑ์/อื่น ๆ
  is_packaging boolean not null default false,
  sort_order int not null default 0,
  unique (store_id, name)
);

create table suppliers (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name     text not null,
  phone    text,
  note     text,
  unique (store_id, name)
);

create table ingredients (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references stores(id) on delete cascade,
  name           text not null,
  category_id    uuid references ingredient_categories(id) on delete set null,
  base_unit_id   uuid not null references units(id),
  qty_on_hand    numeric(18,4) not null default 0,
  reorder_point  numeric(18,4) not null default 0,
  target_stock   numeric(18,4) not null default 0,
  avg_unit_cost  numeric(18,6) not null default 0,
  last_unit_cost numeric(18,6) not null default 0,
  supplier_id    uuid references suppliers(id) on delete set null,
  note           text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (store_id, name),
  constraint ing_reorder_ck check (reorder_point >= 0 and target_stock >= 0),
  constraint ing_cost_ck    check (avg_unit_cost >= 0)
);
create index idx_ing_store   on ingredients(store_id) where is_active;
create index idx_ing_lowstock on ingredients(store_id, qty_on_hand);

-- ---------- INVENTORY ----------
create table inventory_lots (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  received_at   date not null default (now() at time zone 'Asia/Bangkok')::date,
  qty_received  numeric(18,4) not null,
  qty_remaining numeric(18,4) not null,
  unit_cost     numeric(18,6) not null,
  expiry_date   date,
  supplier_id   uuid references suppliers(id) on delete set null,
  receipt_url   text,
  note          text,
  created_at    timestamptz not null default now(),
  constraint lot_qty_ck check (qty_received > 0 and qty_remaining >= 0)
);
create index idx_lot_fifo on inventory_lots(ingredient_id, expiry_date nulls last, received_at)
  where qty_remaining > 0;
create index idx_lot_expiry on inventory_lots(store_id, expiry_date) where qty_remaining > 0;

create table inventory_movements (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  lot_id        uuid references inventory_lots(id) on delete set null,
  movement_type movement_type not null,
  qty_base      numeric(18,4) not null,     -- + เข้า / - ออก
  unit_cost     numeric(18,6) not null default 0,
  total_cost    numeric(14,2) not null default 0,
  ref_type      text,
  ref_id        uuid,
  reason        text,
  occurred_at   timestamptz not null default now(),
  created_by    uuid references auth.users(id),
  constraint mv_qty_ck check (qty_base <> 0)
);
create index idx_mv_store_time on inventory_movements(store_id, occurred_at desc);
create index idx_mv_ing on inventory_movements(ingredient_id, occurred_at desc);

create table waste_records (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  qty_base      numeric(18,4) not null check (qty_base > 0),
  reason        text not null,              -- ของเสีย/หมดอายุ/ชิมทดลอง/นับไม่ตรง
  cost          numeric(14,2) not null default 0,
  occurred_at   timestamptz not null default now(),
  note          text
);
create index idx_waste_store on waste_records(store_id, occurred_at desc);

-- ---------- MENU & RECIPE ----------
create table delivery_platforms (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references stores(id) on delete cascade,
  code           text not null,             -- grab / lineman / shopee / walkin
  name           text not null,
  commission_pct numeric(5,2) not null default 0,
  is_active      boolean not null default true,
  unique (store_id, code),
  constraint plat_comm_ck check (commission_pct between 0 and 100)
);

create table platform_fee_rules (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  platform_id uuid not null references delivery_platforms(id) on delete cascade,
  name        text not null,
  fee_type    fee_type not null,
  value       numeric(14,4) not null check (value >= 0),
  active_from date not null default (now() at time zone 'Asia/Bangkok')::date
);

create table menu_items (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references stores(id) on delete cascade,
  name              text not null,
  image_url         text,
  base_price        numeric(14,2) not null default 0,  -- ราคาหน้าร้าน
  target_margin_pct numeric(5,2) not null default 50.00,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (store_id, name),
  constraint menu_price_ck check (base_price >= 0)
);

create table menu_prices (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  platform_id  uuid not null references delivery_platforms(id) on delete cascade,
  price        numeric(14,2) not null check (price >= 0),
  unique (menu_item_id, platform_id)
);

create table recipes (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  menu_item_id uuid not null unique references menu_items(id) on delete cascade,
  yield_qty    numeric(18,4) not null default 1 check (yield_qty > 0),
  note         text
);

create table recipe_items (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  recipe_id     uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  qty           numeric(18,4) not null check (qty > 0),
  unit_id       uuid not null references units(id),
  unique (recipe_id, ingredient_id)
);
create index idx_ri_recipe on recipe_items(recipe_id);

-- ---------- PLANNING ----------
create table production_plans (
  id        uuid primary key default gen_random_uuid(),
  store_id  uuid not null references stores(id) on delete cascade,
  plan_date date not null,
  status    plan_status not null default 'draft',
  note      text,
  created_at timestamptz not null default now(),
  unique (store_id, plan_date)
);

create table production_plan_items (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  plan_id      uuid not null references production_plans(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  planned_qty  numeric(18,4) not null check (planned_qty > 0),
  unique (plan_id, menu_item_id)
);

create table shopping_lists (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references stores(id) on delete cascade,
  plan_id         uuid references production_plans(id) on delete set null,
  status          list_status not null default 'open',
  estimated_total numeric(14,2) not null default 0,
  created_at      timestamptz not null default now()
);

create table shopping_list_items (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  list_id       uuid not null references shopping_lists(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  qty_on_hand   numeric(18,4) not null default 0,
  qty_required  numeric(18,4) not null default 0,
  qty_short     numeric(18,4) not null default 0,
  qty_suggested numeric(18,4) not null default 0,
  unit_id       uuid not null references units(id),
  last_price    numeric(18,6) not null default 0,
  estimated_cost numeric(14,2) not null default 0,
  is_purchased  boolean not null default false,
  unique (list_id, ingredient_id)
);

-- ---------- SALES ----------
create table sales_orders (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references stores(id) on delete cascade,
  order_no          text,
  occurred_at       timestamptz not null default now(),
  platform_id       uuid references delivery_platforms(id) on delete set null,
  status            sale_status not null default 'completed',
  gross_sales       numeric(14,2) not null default 0,
  shop_discount     numeric(14,2) not null default 0,
  commission_amount numeric(14,2) not null default 0,
  other_fees        numeric(14,2) not null default 0,
  net_sales         numeric(14,2) not null default 0,
  cogs              numeric(14,2) not null default 0,
  stock_deducted    boolean not null default false,
  note              text,
  created_at        timestamptz not null default now(),
  constraint so_amount_ck check (shop_discount >= 0 and other_fees >= 0)
);
create index idx_so_store_time on sales_orders(store_id, occurred_at desc);
create index idx_so_status on sales_orders(store_id, status);

create table sales_order_items (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  order_id     uuid not null references sales_orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete restrict,
  qty          numeric(18,4) not null check (qty > 0),
  unit_price   numeric(14,2) not null check (unit_price >= 0),
  line_total   numeric(14,2) not null default 0,
  line_cogs    numeric(14,2) not null default 0
);
create index idx_soi_order on sales_order_items(order_id);
create index idx_soi_menu on sales_order_items(store_id, menu_item_id);

-- ---------- EXPENSES ----------
create table expense_categories (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name     text not null,
  kind     expense_kind not null default 'variable',
  unique (store_id, name)
);

create table expenses (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references stores(id) on delete cascade,
  expense_date   date not null default (now() at time zone 'Asia/Bangkok')::date,
  category_id    uuid references expense_categories(id) on delete set null,
  amount         numeric(14,2) not null check (amount >= 0),
  kind           expense_kind not null default 'variable',
  payment_method text,
  receipt_url    text,
  note           text,
  created_at     timestamptz not null default now()
);
create index idx_exp_store_date on expenses(store_id, expense_date desc);

-- ---------- SYSTEM ----------
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  type       text not null,               -- low_stock/out_of_stock/expiry_3/expiry_7/low_margin/cost_spike/plan_shortage
  severity   notif_severity not null default 'warning',
  title      text not null,
  body       text,
  ref_type   text,
  ref_id     uuid,
  action_url text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notif_store on notifications(store_id, is_read, created_at desc);

create table audit_logs (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  user_id    uuid references auth.users(id),
  action     text not null,
  table_name text not null,
  row_id     uuid,
  before     jsonb,
  after      jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_store on audit_logs(store_id, created_at desc);