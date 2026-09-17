import SaleForm from './SaleForm';
import { requireStore } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import { fmtBaht, fmtDateTime, todayBkk } from '@/lib/format';
import { cancelSale, refundSale } from './actions';
import ExportButton from '@/components/ExportButton';
import ReceiptButton from '@/components/ReceiptButton';




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

  const totalRefund = (orders ?? []).reduce(
  (s: number, o: any) => s + Number(o.refund_loss ?? 0), 0
);

const exportRows = (orders ?? []).map((o: any) => ({
  วันเวลา: fmtDateTime(o.occurred_at),
  แพลตฟอร์ม: o.delivery_platforms?.name ?? 'อื่น ๆ',
  เลขออร์เดอร์: o.order_no ?? '',
  รายการ: (o.sales_order_items ?? [])
    .map((it: any) => `${it.menu_items?.name} x${Number(it.qty)}`)
    .join(' | '),
  ยอดสุทธิ: Number(o.net_sales ?? 0),
  ต้นทุน: Number(o.cogs ?? 0),
  กำไร: Number(o.net_sales ?? 0) - Number(o.cogs ?? 0),
  คืนเงิน: Number(o.refund_loss ?? 0),
  สถานะ: o.is_refunded ? 'คืนเงิน' : o.status === 'completed' ? 'สำเร็จ' : 'ยกเลิก',
}));


  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">บันทึกยอดขาย</h1>

      <SaleForm menus={menus ?? []} platforms={platforms ?? []} priceMap={priceMap} nowLocal={nowLocalBkk()} />

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
  <h2 className="font-semibold">
    🧾 ออร์เดอร์วันนี้ ({orders?.length ?? 0})
    {totalRefund > 0 && (
      <span className="ml-2 text-xs font-normal text-red-500">
        คืนเงินรวม {fmtBaht(totalRefund)}
      </span>
    )}
  </h2>
  <ExportButton rows={exportRows} filename="ยอดขาย" />
</div>

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

                <div className="mt-2 flex items-center justify-between">
  <span>ยอดสุทธิ {fmtBaht(o.net_sales)}</span>
  <span>ต้นทุน {fmtBaht(o.cogs)}</span>
</div>

<div className="mt-2 flex justify-end">
  <ReceiptButton
    storeName="MS Sandwich"
    orderNo={o.order_no ?? undefined}
    platform={o.delivery_platforms?.name ?? 'อื่น ๆ'}
    datetime={fmtDateTime(o.occurred_at)}
    items={(o.sales_order_items ?? []).map((it: any) => ({
      name: it.menu_items?.name ?? '-',
      qty: Number(it.qty ?? 0),
      price: Number(it.unit_price ?? 0),
    }))}
    grossSales={Number(o.gross_sales ?? o.net_sales ?? 0)}
    discount={Number(o.shop_discount ?? 0)}
    netSales={Number(o.net_sales ?? 0)}
    note={o.note ?? undefined}
  />
</div>

                {o.is_refunded && (
  <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
    <p className="font-semibold">↩️ คืนเงินแล้ว {fmtBaht(o.refund_loss ?? 0)}</p>
    {o.refund_restocked && <p>✅ คืนวัตถุดิบเข้าสต็อกแล้ว</p>}
    {o.refund_note && <p>หมายเหตุ: {o.refund_note}</p>}
    {o.refunded_at && <p className="opacity-70">{fmtDateTime(o.refunded_at)}</p>}
  </div>
)}

                {o.status === 'completed' && !o.is_refunded && (
  <details className="mt-2">

    <summary className="cursor-pointer text-xs font-semibold text-danger">
      จัดการออร์เดอร์นี้
    </summary>

    <div className="mt-2 space-y-3">
      <form action={refundSale} className="space-y-2 rounded-lg border border-stone-200 p-2 dark:border-stone-700">
  <p className="text-xs font-semibold">💰 คืนเงินลูกค้า</p>
  <input type="hidden" name="order_id" value={o.id} />

  <input
    type="number"
    name="refund_loss"
    step="0.01"
    min="0"
    defaultValue={Number(o.net_sales ?? 0)}
    placeholder="มูลค่าที่เสียไป"
    required
    className="text-sm"
  />

  <label className="flex items-center gap-2 text-xs">
  <input type="checkbox" name="refund_restocked" />
  <span>คืนวัตถุดิบเข้าสต็อกด้วย</span>
</label>



  <input
    type="text"
    name="refund_note"
    placeholder="หมายเหตุ เช่น ลูกค้ายกเลิก"
    className="text-sm"
  />

  <button className="btn-danger w-full text-xs">บันทึกคืนเงิน</button>
</form>

      <div className="grid grid-cols-2 gap-2">
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