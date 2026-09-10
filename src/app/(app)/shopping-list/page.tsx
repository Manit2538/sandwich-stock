import Link from 'next/link';
import Empty from '@/components/Empty';
import { requireStore } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import { fmtBaht, fmtQty, fmtDateTime } from '@/lib/format';
import { togglePurchased } from './actions';

export const dynamic = 'force-dynamic';

export default async function ShoppingListPage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const sp = await searchParams;
  const { storeId } = await requireStore();
  const supabase = await createClient();

  let q = supabase.from('shopping_lists')
    .select('*, shopping_list_items(*, ingredients(name), units(name_th)), production_plans(plan_date)')
    .eq('store_id', storeId).order('created_at', { ascending: false }).limit(1);
  if (sp.list) q = supabase.from('shopping_lists')
    .select('*, shopping_list_items(*, ingredients(name), units(name_th)), production_plans(plan_date)')
    .eq('id', sp.list);

  const { data } = await q;
  const list = data?.[0];

  if (!list) return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">รายการซื้อของ</h1>
      <Empty text="ยังไม่มีรายการซื้อของ" hint="สร้างจากหน้า “วางแผนขายวันนี้”" />
      <Link href="/plan" className="btn-primary w-full">ไปหน้าวางแผนขาย</Link>
    </div>
  );

  const items = (list.shopping_list_items ?? []).sort((a: any, b: any) => Number(b.qty_short) - Number(a.qty_short));
  const bought = items.filter((i: any) => i.is_purchased).length;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">รายการซื้อของ</h1>

      <div className="card text-sm">
        <p>สร้างเมื่อ {fmtDateTime(list.created_at)}</p>
        {list.production_plans?.plan_date && <p className="text-stone-500">สำหรับแผนขายวันที่ {list.production_plans.plan_date}</p>}
        <p className="mt-2">งบประมาณรวม: <b className="text-base">{fmtBaht(list.estimated_total)}</b></p>
        <p className="text-stone-500">ซื้อแล้ว {bought}/{items.length} รายการ</p>
      </div>

      <ul className="space-y-2">
        {items.map((it: any) => (
          <li key={it.id} className={`card ${it.is_purchased ? 'opacity-50' : ''}`}>
            <div className="flex items-start gap-3">
              <form action={togglePurchased}>
                <input type="hidden" name="id" value={it.id} />
                <input type="hidden" name="checked" value={it.is_purchased ? '0' : '1'} />
                <button className="text-2xl" aria-label={it.is_purchased ? 'ยกเลิกติ๊ก' : 'ติ๊กว่าซื้อแล้ว'}>
                  {it.is_purchased ? '☑️' : '⬜'}
                </button>
              </form>
              <div className="min-w-0 flex-1">
                <p className={`font-semibold ${it.is_purchased ? 'line-through' : ''}`}>{it.ingredients?.name}</p>
                <dl className="mt-1 grid grid-cols-3 gap-1 text-xs">
                  <div><dt className="text-stone-500">คงเหลือ</dt><dd className="tabular-nums">{fmtQty(it.qty_on_hand)}</dd></div>
                  <div><dt className="text-stone-500">ต้องใช้</dt><dd className="tabular-nums">{fmtQty(it.qty_required)}</dd></div>
                  <div><dt className="text-stone-500">ขาด</dt><dd className="tabular-nums text-danger">{fmtQty(it.qty_short)}</dd></div>
                </dl>
                <p className="mt-1 text-sm">
                  ซื้อเพิ่ม <b>{fmtQty(it.qty_suggested)} {it.units?.name_th}</b> • ~{fmtBaht(it.estimated_cost)}
                </p>
                <Link href={`/purchases?ingredient=${it.ingredient_id}`} className="mt-1 inline-block text-sm font-semibold text-brand">
                  บันทึกซื้อของ →
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}