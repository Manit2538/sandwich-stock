'use server';
import { createClient } from '@/lib/supabase/server';
import { requireStore } from '@/lib/supabase/queries';
import { revalidatePath } from 'next/cache';

export async function postSale(_prev: any, fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();

  const items: any[] = [];
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('qty_') && Number(v) > 0) {
      const menuId = k.slice(4);
      items.push({
        menu_item_id: menuId,
        qty: Number(v),
        unit_price: String(fd.get(`price_${menuId}`) ?? '0'),
      });
    }
  }
  if (!items.length) return { error: 'กรุณาเลือกเมนูอย่างน้อย 1 รายการ' };

  const commissionRaw = fd.get('commission_amount');
  const { error } = await supabase.rpc('fn_post_sale', {
    p_store_id: storeId,
    p_platform_id: String(fd.get('platform_id')),
    p_occurred_at: new Date(String(fd.get('occurred_at'))).toISOString(),
    p_items: items,
    p_shop_discount: String(fd.get('shop_discount') || '0'),
    p_commission: commissionRaw === '' || commissionRaw === null ? null : String(commissionRaw),
    p_other_fees: String(fd.get('other_fees') || '0'),
    p_status: String(fd.get('status') || 'completed'),
    p_note: (fd.get('note') as string) || null,
    p_order_no: (fd.get('order_no') as string) || null,
    p_force: fd.get('force') === 'on',
  });

  if (error) {
    return { error: error.message.includes('ไม่พอ')
      ? `${error.message}\n\n👉 ติ๊ก “ยืนยันขายแม้สต็อกไม่พอ” หากต้องการบันทึกต่อ`
      : `บันทึกไม่สำเร็จ: ${error.message}` };
  }

  revalidatePath('/sales');
  revalidatePath('/dashboard');
  revalidatePath('/ingredients');
  return { ok: 'บันทึกการขายและตัดสต็อกเรียบร้อย' };
}

export async function cancelSale(fd: FormData) {
  await requireStore();
  const supabase = await createClient();
  const { error } = await supabase.rpc('fn_cancel_sale', {
    p_order_id: String(fd.get('order_id')),
    p_mode: String(fd.get('mode')),   // 'return' | 'waste'
  });
  if (error) throw new Error(error.message);
  revalidatePath('/sales');
  revalidatePath('/dashboard');
}