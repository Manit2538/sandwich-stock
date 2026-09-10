'use server';
import { createClient } from '@/lib/supabase/server';
import { requireStore } from '@/lib/supabase/queries';
import { revalidatePath } from 'next/cache';

export async function addExpense(_prev: any, fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();

  let receiptUrl: string | null = null;
  const file = fd.get('receipt') as File | null;
  if (file && file.size > 0) {
    const path = `${storeId}/expense-${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
    const { error } = await supabase.storage.from('receipts').upload(path, file);
    if (!error) receiptUrl = path;
  }

  const { error } = await supabase.from('expenses').insert({
    store_id: storeId,
    expense_date: String(fd.get('expense_date')),
    category_id: (fd.get('category_id') as string) || null,
    amount: String(fd.get('amount')),
    kind: String(fd.get('kind')) as 'fixed' | 'variable',
    payment_method: (fd.get('payment_method') as string) || null,
    note: (fd.get('note') as string) || null,
    receipt_url: receiptUrl,
  });
  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath('/expenses');
  revalidatePath('/reports');
  return { ok: 'บันทึกค่าใช้จ่ายเรียบร้อย' };
}

export async function deleteExpense(fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();
  await supabase.from('expenses').delete().eq('id', String(fd.get('id'))).eq('store_id', storeId);
  revalidatePath('/expenses');
}