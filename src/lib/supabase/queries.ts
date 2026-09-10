import { createClient } from './server';
import { redirect } from 'next/navigation';

export type StoreCtx = { storeId: string; userId: string; store: any };

/** ดึงร้านของผู้ใช้ปัจจุบัน — ถ้ายังไม่มีให้ไปหน้าตั้งค่าเริ่มต้น */
export async function requireStore(): Promise<StoreCtx> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: store } = await supabase
    .from('stores').select('*').eq('owner_id', user.id).limit(1).maybeSingle();

  if (!store) redirect('/settings?setup=1');
  return { storeId: store.id, userId: user.id, store };
}

export async function getUnreadNotifications(storeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications').select('*')
    .eq('store_id', storeId).eq('is_read', false)
    .order('severity', { ascending: false }).order('created_at', { ascending: false })
    .limit(30);
  return data ?? [];
}