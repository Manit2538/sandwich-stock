'use server';
import { createClient } from '@/lib/supabase/server';
import { requireStore } from '@/lib/supabase/queries';
import { revalidatePath } from 'next/cache';

export async function createIngredient(_prev: any, fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();

  const { error } = await supabase.from('ingredients').insert({
    store_id: storeId,
    name: String(fd.get('name')).trim(),
    category_id: (fd.get('category_id') as string) || null,
    base_unit_id: String(fd.get('base_unit_id')),
    reorder_point: String(fd.get('reorder_point') || '0'),
    target_stock: String(fd.get('target_stock') || '0'),
    supplier_id: (fd.get('supplier_id') as string) || null,
    note: (fd.get('note') as string) || null,
  });
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath('/ingredients');
  return { ok: 'เพิ่มวัตถุดิบเรียบร้อย' };
}

export async function adjustStock(_prev: any, fd: FormData) {
  await requireStore();
  const supabase = await createClient();
  const { error } = await supabase.rpc('fn_adjust_stock', {
    p_ingredient_id: String(fd.get('ingredient_id')),
    p_counted_qty: String(fd.get('counted_qty')),
    p_reason: String(fd.get('reason') || 'นับสต็อกจริง'),
  });
  if (error) return { error: `ปรับสต็อกไม่สำเร็จ: ${error.message}` };
  revalidatePath('/ingredients');
  return { ok: 'ปรับสต็อกเรียบร้อย' };
}

export async function recordWaste(_prev: any, fd: FormData) {
  await requireStore();
  const supabase = await createClient();
  const { error } = await supabase.rpc('fn_record_waste', {
    p_ingredient_id: String(fd.get('ingredient_id')),
    p_qty: String(fd.get('qty')),
    p_reason: String(fd.get('reason')),
    p_note: (fd.get('note') as string) || null,
  });
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };
  revalidatePath('/ingredients');
  return { ok: 'บันทึกของเสียเรียบร้อย' };
}

export async function deleteIngredient(fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();
  await supabase.from('ingredients')
    .update({ is_active: false })
    .eq('id', String(fd.get('id'))).eq('store_id', storeId);
  revalidatePath('/ingredients');
}