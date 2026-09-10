-- ============================================================
-- Row Level Security : ผู้ใช้เห็นเฉพาะข้อมูลร้านของตนเอง
-- ============================================================
create or replace function public.is_store_owner(p_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $
  select exists (
    select 1 from public.stores s
    where s.id = p_store_id and s.owner_id = auth.uid()
  );
$;

-- profiles
alter table profiles enable row level security;
create policy profiles_self on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- stores
alter table stores enable row level security;
create policy stores_owner on stores for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ตารางที่มี store_id ทั้งหมด → policy รูปแบบเดียวกัน
do $
declare t text;
begin
  foreach t in array array[
    'units','unit_conversions','ingredient_categories','suppliers','ingredients',
    'inventory_lots','inventory_movements','waste_records',
    'delivery_platforms','platform_fee_rules','menu_items','menu_prices',
    'recipes','recipe_items','production_plans','production_plan_items',
    'shopping_lists','shopping_list_items','sales_orders','sales_order_items',
    'expense_categories','expenses','notifications','audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($f$
      create policy %1$s_store_rw on public.%1$I for all
      using (public.is_store_owner(store_id))
      with check (public.is_store_owner(store_id));
    $f$, t);
  end loop;
end $;

-- ---------- Trigger: สร้าง profile อัตโนมัติเมื่อสมัคร ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'เจ้าของร้าน'))
  on conflict (id) do nothing;
  return new;
end $;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public)
values ('receipts','receipts',false), ('menu','menu',true)
on conflict (id) do nothing;

create policy "receipts owner rw" on storage.objects for all to authenticated
  using (bucket_id = 'receipts' and owner = auth.uid())
  with check (bucket_id = 'receipts' and owner = auth.uid());

create policy "menu read all" on storage.objects for select
  using (bucket_id = 'menu');
create policy "menu owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu' and owner = auth.uid());