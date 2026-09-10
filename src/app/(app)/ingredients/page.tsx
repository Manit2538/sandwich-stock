import Link from 'next/link';
import SearchBox from '@/components/SearchBox';
import StatusPill from '@/components/StatusPill';
import Empty from '@/components/Empty';
import IngredientForm from './IngredientForm';
import { requireStore } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import { stockStatus, expiryStatus } from '@/lib/inventory';
import { fmtBaht, fmtQty, fmtDate } from '@/lib/format';
import { adjustStock, recordWaste } from './actions';

export const dynamic = 'force-dynamic';

export default async function IngredientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { storeId, store } = await requireStore();
  const supabase = await createClient();

  let query = supabase
    .from('ingredients')
    .select('*, units!ingredients_base_unit_id_fkey(name_th), ingredient_categories(name)')
    .eq('store_id', storeId).eq('is_active', true).order('name');
  if (q) query = query.ilike('name', `%${q}%`);

  const [{ data: ingredients }, { data: units }, { data: categories }, { data: suppliers }, { data: lots }] =
    await Promise.all([
      query,
      supabase.from('units').select('*').eq('store_id', storeId).order('kind'),
      supabase.from('ingredient_categories').select('*').eq('store_id', storeId).order('sort_order'),
      supabase.from('suppliers').select('*').eq('store_id', storeId).order('name'),
      supabase.from('inventory_lots').select('ingredient_id, expiry_date, qty_remaining')
        .eq('store_id', storeId).gt('qty_remaining', 0).not('expiry_date', 'is', null)
        .order('expiry_date'),
    ]);

  const nearestExpiry = new Map<string, string>();
  for (const l of lots ?? []) if (!nearestExpiry.has(l.ingredient_id)) nearestExpiry.set(l.ingredient_id, l.expiry_date);
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">วัตถุดิบและสต็อก</h1>
        <Link href="/purchases" className="text-sm font-semibold text-brand">🛒 เติมสต็อก</Link>
      </div>

      <SearchBox placeholder="ค้นหาวัตถุดิบ…" />
      <IngredientForm units={units ?? []} categories={categories ?? []} suppliers={suppliers ?? []} />

      {!ingredients?.length ? (
        <Empty text="ยังไม่มีวัตถุดิบ" hint="กด “เพิ่มวัตถุดิบใหม่” ด้านบนเพื่อเริ่มต้น" />
      ) : (
        <ul className="space-y-3">
          {ingredients.map((i: any) => {
            const st = stockStatus(i.qty_on_hand, i.reorder_point);
            const exp = expiryStatus(nearestExpiry.get(i.id), now, store.expiry_urgent_days, store.expiry_warn_days);
            const tone = st === 'out' ? 'danger' : st === 'low' ? 'warn' : 'ok';
            const label = st === 'out' ? 'หมดสต็อก' : st === 'low' ? 'ใกล้หมด' : 'มีพอ';

            return (
              <li key={i.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{i.name}</p>
                    <p className="text-xs text-stone-500">{i.ingredient_categories?.name ?? 'ไม่ระบุหมวด'}</p>
                  </div>
                  <StatusPill status={tone as any} label={label} />
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-xs text-stone-500">คงเหลือ</dt>
                    <dd className="font-semibold tabular-nums">{fmtQty(i.qty_on_hand)} {i.units?.name_th}</dd></div>
                  <div><dt className="text-xs text-stone-500">จุดสั่งซื้อ</dt>
                    <dd className="tabular-nums">{fmtQty(i.reorder_point)}</dd></div>
                  <div><dt className="text-xs text-stone-500">ต้นทุน/หน่วย</dt>
                    <dd className="tabular-nums">{fmtBaht(i.avg_unit_cost)}</dd></div>
                </dl>

                {exp.level !== 'none' && exp.level !== 'ok' && (
                  <p className="mt-2 text-sm text-danger">
                    📅 ใกล้หมดอายุ {fmtDate(nearestExpiry.get(i.id)!)} (อีก {exp.daysLeft} วัน)
                  </p>
                )}

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-brand">ปรับสต็อก / บันทึกของเสีย</summary>

                  <form action={adjustStock as any} className="mt-3 space-y-2 rounded-xl bg-stone-50 p-3 dark:bg-stone-800/50">
                    <p className="text-xs font-semibold">📊 นับสต็อกจริง</p>
                    <input type="hidden" name="ingredient_id" value={i.id} />
                    <input name="counted_qty" type="number" step="0.0001" min="0" required
                      placeholder={`จำนวนที่นับได้ (${i.units?.name_th})`} inputMode="decimal" />
                    <input name="reason" placeholder="เหตุผล เช่น นับสต็อกประจำสัปดาห์" defaultValue="นับสต็อกจริง" />
                    <button className="btn-ghost w-full text-sm"
                      formAction={adjustStock as any}>ยืนยันปรับสต็อก</button>
                  </form>

                  <form action={recordWaste as any} className="mt-2 space-y-2 rounded-xl bg-stone-50 p-3 dark:bg-stone-800/50">
                    <p className="text-xs font-semibold">🗑️ บันทึกของเสีย / หมดอายุ / ชิมทดลอง</p>
                    <input type="hidden" name="ingredient_id" value={i.id} />
                    <input name="qty" type="number" step="0.0001" min="0.0001" required
                      placeholder={`จำนวน (${i.units?.name_th})`} inputMode="decimal" />
                    <select name="reason">
                      <option>ของเสีย</option><option>หมดอายุ</option>
                      <option>ชิมทดลอง/ทำกินเอง</option><option>อื่น ๆ</option>
                    </select>
                    <input name="note" placeholder="หมายเหตุ (ถ้ามี)" />
                    <button className="btn-ghost w-full text-sm">บันทึกของเสีย</button>
                  </form>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}