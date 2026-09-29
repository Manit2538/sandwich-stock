import { requireStore } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import QRCodesClient from './QRCodesClient';

export const dynamic = 'force-dynamic';

export default async function QRPage() {
  const { storeId } = await requireStore();
  const supabase = await createClient();
  const { data: store } = await supabase
    .from('stores').select('name').eq('id', storeId).single();

  return <QRCodesClient storeId={storeId} storeName={store?.name ?? 'ร้านอาหาร'} />;
}