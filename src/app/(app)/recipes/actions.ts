'use server';
import { createClient } from '@/lib/supabase/server';
import { requireStore } from '@/lib/supabase/queries';
import { revalidatePath } from 'next/cache';

export async function createMenuItem(_prev: any, fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();

  const { data: menu, error } = await supabase.from('menu_items').insert({
    store_id: storeId,
    name: String(fd.get('name')).trim(),
    base_price: String(fd.get('base_price') || '0'),
    target_margin_pct: String(fd.get('target_margin_pct') || '50'),
  }).select('id').single();
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  await supabase.from('recipes').insert({ store_id: storeId, menu_item_id: menu.id });
  revalidatePath('/recipes');
  return { ok: 'สร้างเมนูเรียบร้อย — เพิ่มวัตถุดิบในสูตรได้เลย' };
}

export async function addRecipeItem(_prev: any, fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();
  const { error } = await supabase.from('recipe_items').upsert({
    store_id: storeId,
    recipe_id: String(fd.get('recipe_id')),
    ingredient_id: String(fd.get('ingredient_id')),
    qty: String(fd.get('qty')),
    unit_id: String(fd.get('unit_id')),
  }, { onConflict: 'recipe_id,ingredient_id' });
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };
  revalidatePath(`/recipes/${fd.get('menu_item_id')}`);
  return { ok: 'บันทึกวัตถุดิบในสูตรแล้ว' };
}

export async function removeRecipeItem(fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();
  await supabase.from('recipe_items').delete()
    .eq('id', String(fd.get('id'))).eq('store_id', storeId);
  revalidatePath(`/recipes/${fd.get('menu_item_id')}`);
}

export async function updateMenuPrices(fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();
  const menuId = String(fd.get('menu_item_id'));

  await supabase.from('menu_items').update({
    base_price: String(fd.get('base_price') || '0'),
    target_margin_pct: String(fd.get('target_margin_pct') || '50'),
    is_active: fd.get('is_active') === 'on',
  }).eq('id', menuId).eq('store_id', storeId);

  const rows: any[] = [];
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('price_') && String(v) !== '') {
      rows.push({ store_id: storeId, menu_item_id: menuId, platform_id: k.slice(6), price: String(v) });
    }
  }
  if (rows.length) await supabase.from('menu_prices').upsert(rows, { onConflict: 'menu_item_id,platform_id' });

  revalidatePath(`/recipes/${menuId}`);
  revalidatePath('/recipes');
}