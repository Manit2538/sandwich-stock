import { requireStore } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import { fmtBaht, fmtQty, fmtDate, todayBkk } from '@/lib/format';
import PurchaseForm from './PurchaseForm';

export const dynamic = 'force-dynamic';

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ ingredient?: string }> }) {
  const { ingredient } = await searchParams;
  const { storeId } = await requireStore();
  const supabase = await createClient();

  const [{ data: ingredients }, { data: suppliers }, { data: recent }] = await Promise.all([
    supabase.from('ingredients')
      .select('id, name, avg_unit_cost, units!ingredients_base_unit_id_fkey(name_th)')
      .eq('store_id', storeId).eq('is_active', true).order('name'),
    supabase.from('suppliers').select('*').eq('store_id', storeId).order('name'),
    supabase.from('inventory_lots')
      .select('*, ingredients(name, units!ingredients_base_unit_id_fkey(name_th))')
      .eq('store_id', storeId).order('created_at', { ascending: false }).limit(15),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">ซื้อของ / เติมสต็อก</h1>

      <PurchaseForm
        ingredients={ingredients ?? []}
        suppliers={suppliers ?? []}
        defaultIngredient={ingredient ?? ''}
        today={todayBkk()}
      />

      <section>
        <h2 className="mb-2 font-semibold">📜 ประวัติการซื้อล่าสุด</h2>
        {!recent?.length ? (
          <p className="card text-sm text-stone-500">ยังไม่มีประวัติการซื้อ</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((l: any) => (
              <li key={l.id} className="card flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l.ingredients?.name}</p>
                  <p className="text-xs text-stone-500">
                    {fmtDate(l.received_at)} • เข้า {fmtQty(l.qty_received)} {l.ingredients?.units?.name_th}
                    {l.expiry_date && ` • หมดอายุ ${fmtDate(l.expiry_date)}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">{fmtBaht(l.unit_cost)}</p>
                  <p className="text-xs text-stone-500">ต่อหน่วย</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}