'use server';
import { createClient } from '@/lib/supabase/server';
import { requireStore } from '@/lib/supabase/queries';
import { revalidatePath } from 'next/cache';

export async function receiveStock(_prev: any, fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();

  // อัปโหลดใบเสร็จ (ถ้ามี)
  let receiptUrl: string | null = null;
  const file = fd.get('receipt') as File | null;
  if (file && file.size > 0) {
    const path = `${storeId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('receipts').upload(path, file);
    if (!upErr) receiptUrl = path;
  }

  const { error } = await supabase.rpc('fn_receive_stock', {
    p_ingredient_id: String(fd.get('ingredient_id')),
    p_purchase_qty: String(fd.get('purchase_qty')),
    p_units_per_pack: String(fd.get('units_per_pack') || '1'),
    p_total_price: String(fd.get('total_price')),
    p_expiry_date: (fd.get('expiry_date') as string) || null,
    p_received_at: (fd.get('received_at') as string) || null,
    p_supplier_id: (fd.get('supplier_id') as string) || null,
    p_receipt_url: receiptUrl,
    p_note: (fd.get('note') as string) || null,
  });
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath('/purchases');
  revalidatePath('/ingredients');
  revalidatePath('/dashboard');
  return { ok: 'บันทึกการซื้อและอัปเดตต้นทุนเฉลี่ยเรียบร้อย' };
}