import Link from 'next/link';
import SearchBox from '@/components/SearchBox';
import StatusPill from '@/components/StatusPill';
import Empty from '@/components/Empty';
import MenuForm from './MenuForm';
import { requireStore } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import { calcMargin } from '@/lib/costing';
import { fmtBaht, fmtPct } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function RecipesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { storeId, store } = await requireStore();
  const supabase = await createClient();

  let query = supabase.from('v_menu_cost').select('*').eq('store_id', storeId).order('name');
  if (q) query = query.ilike('name', `%${q}%`);
  const { data: menus } = await query;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">สูตรอาหารและเมนู</h1>
      <SearchBox placeholder="ค้นหาเมนู…" />
      <MenuForm />

      {!menus?.length ? (
        <Empty text="ยังไม่มีเมนู" hint="สร้างเมนูแรกของคุณด้านบน" />
      ) : (
        <ul className="space-y-3">
          {menus.map((m: any) => {
            const r = calcMargin(m.base_price, m.unit_cost, m.target_margin_pct ?? store.target_margin_pct);
            return (
              <li key={m.menu_item_id}>
                <Link href={`/recipes/${m.menu_item_id}`} className="card block">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{m.name}</p>
                    <StatusPill status={r.status}
                      label={r.status === 'ok' ? 'ถึงเป้ากำไร' : r.status === 'warn' ? 'กำไรต่ำกว่าเป้า' : 'ขาดทุน'} />
                  </div>
                  <dl className="mt-3 grid grid-cols-4 gap-2 text-sm">
                    <div><dt className="text-xs text-stone-500">ต้นทุน</dt><dd className="tabular-nums">{fmtBaht(r.cost)}</dd></div>
                    <div><dt className="text-xs text-stone-500">ราคาขาย</dt><dd className="tabular-nums">{fmtBaht(r.price)}</dd></div>
                    <div><dt className="text-xs text-stone-500">กำไร/ชิ้น</dt>
                      <dd className="font-semibold tabular-nums text-ok">{fmtBaht(r.grossProfit)}</dd></div>
                    <div><dt className="text-xs text-stone-500">Margin</dt>
                      <dd className="font-semibold tabular-nums">{fmtPct(r.marginPct)}</dd></div>
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}