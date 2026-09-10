'use server';
import { createClient } from '@/lib/supabase/server';
import { requireStore } from '@/lib/supabase/queries';
import { revalidatePath } from 'next/cache';

export async function updateStore(_prev: any, fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();

  const { error } = await supabase.from('stores').update({
    name: String(fd.get('name')),
    target_margin_pct: String(fd.get('target_margin_pct')),
    expiry_warn_days: Number(fd.get('expiry_warn_days')),
    expiry_urgent_days: Number(fd.get('expiry_urgent_days')),
    cost_spike_pct: String(fd.get('cost_spike_pct')),
  }).eq('id', storeId);
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  for (const [k, v] of fd.entries()) {
    if (k.startsWith('comm_')) {
      await supabase.from('delivery_platforms')
        .update({ commission_pct: String(v) }).eq('id', k.slice(5)).eq('store_id', storeId);
    }
  }

  revalidatePath('/settings');
  return { ok: 'บันทึกการตั้งค่าเรียบร้อย' };
}

export async function addSupplier(fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();
  await supabase.from('suppliers').insert({
    store_id: storeId,
    name: String(fd.get('name')),
    phone: (fd.get('phone') as string) || null,
  });
  revalidatePath('/settings');
}