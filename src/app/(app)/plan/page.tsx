import StatusPill from '@/components/StatusPill';
import { requireStore } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import { requirementsFromPlan, buildRequirementRows, estimatePlan, shoppingListTotal } from '@/lib/planning';
import { fmtBaht, fmtQty, fmtPct, todayBkk } from '@/lib/format';
import { createShoppingList } from './actions';
import PlanForm from './PlanForm';

export const dynamic = 'force-dynamic';

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const date = sp.date ?? todayBkk();
  const { storeId } = await requireStore();
  const supabase = await createClient();

  const [{ data: menus }, { data: plan }, { data: ingredients }, { data: recipes }] = await Promise.all([
    supabase.from('v_menu_cost').select('*').eq('store_id', storeId).order('name'),
    supabase.from('production_plans')
      .select('id, plan_date, production_plan_items(menu_item_id, planned_qty)')
      .eq('store_id', storeId).eq('plan_date', date).maybeSingle(),
    supabase.from('ingredients')
      .select('id, name, qty_on_hand, reorder_point, target_stock, avg_unit_cost, last_unit_cost, units!ingredients_base_unit_id_fkey(name_th)')
      .eq('store_id', storeId).eq('is_active', true),
    supabase.from('recipes').select('menu_item_id, yield_qty, recipe_items(ingredient_id, qty)').eq('store_id', storeId),
  ]);

  const planItems = (plan?.production_plan_items ?? []).map((p: any) => ({
    menuItemId: p.menu_item_id, plannedQty: p.planned_qty,
  }));

  const recipeDefs = (recipes ?? []).map((r: any) => ({
    menuItemId: r.menu_item_id, yieldQty: r.yield_qty,
    items: (r.recipe_items ?? []).map((i: any) => ({ ingredientId: i.ingredient_id, qty: i.qty })),
  }));

  const ingState = (ingredients ?? []).map((i: any) => ({
    id: i.id, name: i.name, unitName: i.units?.name_th ?? '',
    qtyOnHand: i.qty_on_hand, reorderPoint: i.reorder_point,
    targetStock: i.target_stock, avgUnitCost: i.avg_unit_cost, lastUnitCost: i.last_unit_cost,
  }));

  const rows = buildRequirementRows(requirementsFromPlan(planItems, recipeDefs), ingState);
  const est = estimatePlan(
    planItems,
    new Map((menus ?? []).map((m: any) => [m.menu_item_id, m.unit_cost])),
    new Map((menus ?? []).map((m: any) => [m.menu_item_id, m.base_price])),
  );

  const groups = [
    { key: 'short', title: '❌ ของไม่พอขาย ต้องซื้อ', cls: 'bg-red-50 dark:bg-red-950/30' },
    { key: 'low',   title: '⚠️ ใกล้หมด ควรซื้อเพิ่ม', cls: 'bg-amber-50 dark:bg-amber-950/30' },
    { key: 'enough',title: '✅ มีพอสำหรับขาย',        cls: 'bg-green-50 dark:bg-green-950/30' },
  ] as const;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">วางแผนขายวันนี้</h1>

      <PlanForm date={date} menus={menus ?? []} existing={planItems} />

      {planItems.length > 0 && (
        <>
          <div className="card grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-stone-500">จำนวนที่จะทำ</p><p className="font-bold">{fmtQty(est.pieces)} ชิ้น</p></div>
            <div><p className="text-xs text-stone-500">ต้นทุนผลิตคาดการณ์</p><p className="font-bold">{fmtBaht(est.estimatedCost)}</p></div>
            <div><p className="text-xs text-stone-500">ยอดขายคาดการณ์</p><p className="font-bold">{fmtBaht(est.estimatedRevenue)}</p></div>
            <div><p className="text-xs text-stone-500">กำไรคาดการณ์</p>
              <p className="font-bold text-ok">{fmtBaht(est.estimatedProfit)} ({fmtPct(est.estimatedMarginPct)})</p></div>
          </div>

          {groups.map((g) => {
            const list = rows.filter((r) => r.status === g.key);
            if (!list.length) return null;
            return (
              <section key={g.key} className={`rounded-2xl p-4 ${g.cls}`}>
                <h2 className="mb-3 font-semibold">{g.title} ({list.length})</h2>
                <ul className="space-y-2">
                  {list.map((r) => (
                    <li key={r.ingredientId} className="rounded-xl bg-white p-3 text-sm dark:bg-stone-900">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{r.name}</p>
                        <StatusPill status={r.status === 'enough' ? 'ok' : r.status === 'low' ? 'warn' : 'danger'} label={r.statusLabel} />
                      </div>
                      <dl className="mt-2 grid grid-cols-4 gap-1 text-xs">
                        <div><dt className="text-stone-500">มี</dt><dd className="tabular-nums">{fmtQty(r.onHand)}</dd></div>
                        <div><dt className="text-stone-500">ต้องใช้</dt><dd className="tabular-nums">{fmtQty(r.required)}</dd></div>
                        <div><dt className="text-stone-500">ขาด</dt><dd className="tabular-nums text-danger">{fmtQty(r.shortage)}</dd></div>
                        <div><dt className="text-stone-500">ควรซื้อ</dt>
                          <dd className="tabular-nums font-semibold">{fmtQty(r.suggestedBuy)} {r.unitName}</dd></div>
                      </dl>
                      {r.suggestedBuy.gt(0) && (
                        <p className="mt-1 text-xs text-stone-500">
                          ราคาซื้อล่าสุด {fmtBaht(r.unitPrice)}/{r.unitName} • งบประมาณ ~{fmtBaht(r.estimatedCost)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          <div className="card">
            <p className="mb-3 text-sm">งบซื้อของโดยประมาณ: <b>{fmtBaht(shoppingListTotal(rows))}</b></p>
            <form action={createShoppingList}>
              <input type="hidden" name="plan_id" value={plan!.id} />
              <button className="btn-primary w-full">🛒 สร้างรายการซื้อของ</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}