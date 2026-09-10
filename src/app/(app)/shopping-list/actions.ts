'use server';
import { createClient } from '@/lib/supabase/server';
import { requireStore } from '@/lib/supabase/queries';
import { revalidatePath } from 'next/cache';

export async function togglePurchased(fd: FormData) {
  const { storeId } = await requireStore();
  const supabase = await createClient();
  await supabase.from('shopping_list_items')
    .update({ is_purchased: fd.get('checked') === '1' })
    .eq('id', String(fd.get('id'))).eq('store_id', storeId);
  revalidatePath('/shopping-list');
}