import Link from 'next/link';
import { requireStore } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import { calcMenuCost, calcMargin, suggestPrice } from '@/lib/costing';
import { fmtBaht, fmtPct, fmtQty } from '@/lib/format';
import { addRecipeItem, removeRecipeItem, updateMenuPrices } from '../actions';
import RecipeItemForm from './RecipeItemForm';
import StatusPill from '@/components/StatusPill';

export const dynamic = 'force-dynamic';

export default async function RecipeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { storeId, store } = await requireStore();
  const supabase = await createClient();

  const [{ data: menu }, { data: recipe }, { data: ingredients }, { data: platforms }, { data: prices }] =
    await Promise.all([
      supabase.from('menu_items').select('*').eq('id', id).eq('store_id', storeId).single(),
      supabase.from('recipes')
        .select('*, recipe_items(id, qty, unit_id, ingredients(id, name, avg_unit_cost, ingredient_categories(is_packaging), units!ingredients_base_unit_id_fkey(name_th)))')
        .eq('menu_item_id', id).single(),
      supabase.from('ingredients')
        .select('id, name, avg_unit_cost, base_unit_id, units!ingredients_base_unit_id_fkey(name_th)')
        .eq('store_id', storeId).eq('is_active', true).order('name'),
      supabase.from('delivery_platforms').select('*').eq('store_id', storeId).eq('is_active', true).order('code'),
      supabase.from('menu_prices').select('*').eq('menu_item_id', id),
    ]);

  if (!menu) return <p className="card">ไม่พบเมนูนี้</p>;

  const items = recipe?.recipe_items ?? [];
  const cost = calcMenuCost(
    items.map((it: any) => ({
      ingredientId: it.ingredients.id,
      qty: it.qty,
      unitCost: it.ingredients.avg_unit_cost,
      isPackaging: !!it.ingredients.ingredient_categories?.is_packaging,
    })),
    recipe?.yield_qty ?? 1,
  );

  const target = menu.target_margin_pct ?? store.target_margin_pct;
  const margin = calcMargin(menu.base_price, cost.totalCost, target);
  const priceMap = new Map((prices ?? []).map((p: any) => [p.platform_id, p.price]));

  return (
    <div className="space-y-4">
      <Link href="/recipes" className="text-sm text-brand">← กลับ</Link>
      <h1 className="text-lg font-bold">{menu.name}</h1>

      <div className="card space-y-2">
        <div className="flex justify-between"><span>ต้นทุนวัตถุดิบ</span><b className="tabular-nums">{fmtBaht(cost.ingredientCost)}</b></div>
        <div className="flex justify-between"><span>ต้นทุนบรรจุภัณฑ์</span><b className="tabular-nums">{fmtBaht(cost.packagingCost)}</b></div>
        <hr className="border-stone-200 dark:border-stone-700" />
        <div className="flex justify-between text-base"><span className="font-semibold">ต้นทุนรวมต่อชิ้น</span>
          <b className="tabular-nums">{fmtBaht(cost.totalCost)}</b></div>
        <div className="flex justify-between"><span>ราคาขายหน้าร้าน</span><b className="tabular-nums">{fmtBaht(margin.price)}</b></div>
        <div className="flex justify-between"><span>กำไรต่อชิ้น</span>
          <b className={`tabular-nums ${margin.grossProfit.gte(0) ? 'text-ok' : 'text-danger'}`}>{fmtBaht(margin.grossProfit)}</b></div>
        <div className="flex items-center justify-between"><span>Margin</span>
          <span className="flex items-center gap-2">
            <b className="tabular-nums">{fmtPct(margin.marginPct)}</b>
            <StatusPill status={margin.status}
              label={margin.status === 'ok' ? `ถึงเป้า ${fmtPct(target)}` : `ต่ำกว่าเป้า ${fmtPct(target)}`} />
          </span>
        </div>
        {!margin.meetsTarget && cost.totalCost.gt(0) && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950/40">
            💡 ถ้าต้องการ Margin {fmtPct(target)} ควรตั้งราคาอย่างน้อย <b>{fmtBaht(suggestPrice(cost.totalCost, target))}</b>
          </p>
        )}
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">🧾 สูตร (ต่อ 1 ชิ้น)</h2>
        {!items.length ? (
          <p className="text-sm text-stone-500">ยังไม่มีวัตถุดิบในสูตร</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it: any) => {
              const line = cost.lines.find((l) => l.ingredientId === it.ingredients.id);
              return (
                <li key={it.id} className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2 text-sm last:border-0 dark:border-stone-800">
                  <div>
                    <p className="font-medium">{it.ingredients.name}</p>
                    <p className="text-xs text-stone-500">
                      {fmtQty(it.qty)} {it.ingredients.units?.name_th} × {fmtBaht(it.ingredients.avg_unit_cost)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums font-semibold">{fmtBaht(line?.lineCost ?? 0)}</span>
                    <form action={removeRecipeItem}>
                      <input type="hidden" name="id" value={it.id} />
                      <input type="hidden" name="menu_item_id" value={id} />
                      <button className="text-danger" aria-label="ลบ">🗑️</button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <RecipeItemForm recipeId={recipe!.id} menuItemId={id} ingredients={ingredients ?? []} />
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">💰 ราคาขายแต่ละช่องทาง</h2>
        <form action={updateMenuPrices} className="space-y-3">
          <input type="hidden" name="menu_item_id" value={id} />
          <div>
            <label htmlFor="base_price">ราคาหน้าร้าน / รับเอง (฿)</label>
            <input id="base_price" name="base_price" type="number" step="0.01" min="0"
              defaultValue={menu.base_price} inputMode="decimal" />
          </div>
          {(platforms ?? []).filter((p: any) => p.code !== 'walkin').map((p: any) => (
            <div key={p.id}>
              <label htmlFor={`price_${p.id}`}>{p.name} (฿) — ค่าคอม {fmtPct(p.commission_pct)}</label>
              <input id={`price_${p.id}`} name={`price_${p.id}`} type="number" step="0.01" min="0"
                defaultValue={priceMap.get(p.id) ?? ''} inputMode="decimal" />
            </div>
          ))}
          <div>
            <label htmlFor="target_margin_pct">เป้ากำไรขั้นต่ำ (%)</label>
            <input id="target_margin_pct" name="target_margin_pct" type="number" step="0.1" min="0" max="99"
              defaultValue={menu.target_margin_pct} inputMode="decimal" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_active" defaultChecked={menu.is_active} className="h-5 w-5" />
            <span className="text-sm">เปิดขายเมนูนี้</span>
          </label>
          <button className="btn-primary w-full">บันทึกราคา</button>
        </form>
      </section>
    </div>
  );
}