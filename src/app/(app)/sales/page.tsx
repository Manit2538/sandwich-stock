import SaleForm from './SaleForm';
import { requireStore } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import { fmtBaht, fmtDateTime, todayBkk } from '@/lib/format';
import { cancelSale } from './actions';

export const dynamic = 'force-dynamic';

function nowLocalBkk() {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
}

export default async function SalesPage() {
  const { storeId } = await requireStore();
  const supabase = await createClient();
  const today = todayBkk();

  const [{ data: menus }, { data: platforms }, { data: prices }, { data: orders }] = await Promise.all([
    supabase.from('v_menu_cost').select('*').eq('store_id', storeId).order('name'),
    supabase.from('delivery_platforms').select('*').eq('store_id', storeId).eq('is_active', true).order('code'),
    supabase.from('menu_prices').select('*').eq('store_id', storeId),
    supabase.from('sales_orders')
      .select('*, delivery_platforms(name), sales_order_items(qty, unit_price, menu_items(name))')
      .eq('store_id', storeId)
      .gte('occurred_at', `${today}T00:00:00+07:00`)
      .order('occurred_at', { ascending: false }),
  ]);

  const priceMap: Record<string, Record<string, string>> = {};
  for (const p of prices ?? []) {
    (priceMap[p.menu_item_id] ??= {})[p.platform_id] = p.price;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">บันทึกยอดขาย</h1>

      <SaleForm menus={menus ?? []} platforms={platforms ?? []} priceMap={priceMap} nowLocal={nowLocalBkk()} />

      <section>
        <h2 className="mb-2 font-semibold">🧾 ออร์เดอร์วันนี้ ({orders?.length ?? 0})</h2>
        {!orders?.length ? (
          <p className="card text-sm text-stone-500">ยังไม่มีออร์เดอร์วันนี้</p>
        ) : (
          <ul className="space-y-2">
            {orders.map((o: any) => (
              <li key={o.id} className="card text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{o.delivery_platforms?.name ?? 'อื่น ๆ'}</p>
                    <p className="text-xs text-stone-500">{fmtDateTime(o.occurred_at)}</p>
                  </div>
                  <span className={o.status === 'completed' ? 'pill-ok' : 'pill-danger'}>
                    {o.status === 'completed' ? '✅ สำเร็จ' : o.status === 'cancelled' ? '❌ ยกเลิก' : '↩️ คืนเงิน'}
                  </span>
                </div>
                <ul className="mt-2 text-xs text-stone-600 dark:text-stone-300">
                  {o.sales_order_items?.map((it: any, idx: number) => (
                    <li key={idx}>• {it.menu_items?.name} × {Number(it.qty)} — {fmtBaht(it.unit_price)}</li>
                  ))}
                </ul>
                <div className="mt-2 flex justify-between">
                  <span>ยอดสุทธิ {fmtBaht(o.net_sales)}</span>
                  <span>ต้นทุน {fmtBaht(o.cogs)}</span>
                </div>

                {o.status === 'completed' && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-danger">ยกเลิกออร์เดอร์นี้</summary>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <form action={cancelSale}>
                        <input type="hidden" name="order_id" value={o.id} />
                        <input type="hidden" name="mode" value="return" />
                        <button className="btn-ghost w-full text-xs">↩️ คืนเข้าสต็อก</button>
                      </form>
                      <form action={cancelSale}>
                        <input type="hidden" name="order_id" value={o.id} />
                        <input type="hidden" name="mode" value="waste" />
                        <button className="btn-ghost w-full text-xs">🗑️ บันทึกเป็นของเสีย</button>
                      </form>
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}