'use server';
import { createClient } from '@/lib/supabase/server';
import { requireStore } from '@/lib/supabase/queries';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function savePlan(_prev: any, fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();
  const planDate = String(fd.get('plan_date'));

  const { data: plan, error } = await supabase
    .from('production_plans')
    .upsert({ store_id: storeId, plan_date: planDate }, { onConflict: 'store_id,plan_date' })
    .select('id').single();
  if (error) return { error: `บันทึกแผนไม่สำเร็จ: ${error.message}` };

  await supabase.from('production_plan_items').delete().eq('plan_id', plan.id);

  const rows: any[] = [];
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('qty_') && Number(v) > 0) {
      rows.push({ store_id: storeId, plan_id: plan.id, menu_item_id: k.slice(4), planned_qty: String(v) });
    }
  }
  if (!rows.length) return { error: 'กรุณาระบุจำนวนอย่างน้อย 1 เมนู' };

  const { error: e2 } = await supabase.from('production_plan_items').insert(rows);
  if (e2) return { error: `บันทึกรายการไม่สำเร็จ: ${e2.message}` };

  revalidatePath('/plan');
  return { ok: 'บันทึกแผนขายเรียบร้อย' };
}

export async function createShoppingList(fd: FormData) {
  await requireStore();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('fn_build_shopping_list', { p_plan_id: String(fd.get('plan_id')) });
  if (error) throw new Error(error.message);
  revalidatePath('/shopping-list');
  redirect(`/shopping-list?list=${data}`);
}