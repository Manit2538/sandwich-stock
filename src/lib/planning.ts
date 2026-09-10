import { D, money, qty, Decimal } from './decimal';

export type PlanItem = { menuItemId: string; plannedQty: Decimal.Value };
export type RecipeDef = { menuItemId: string; yieldQty: Decimal.Value; items: { ingredientId: string; qty: Decimal.Value }[] };
export type IngredientState = {
  id: string; name: string; unitName: string;
  qtyOnHand: Decimal.Value; reorderPoint: Decimal.Value;
  targetStock: Decimal.Value; avgUnitCost: Decimal.Value; lastUnitCost?: Decimal.Value;
};

export type RequirementRow = {
  ingredientId: string; name: string; unitName: string;
  required: Decimal; onHand: Decimal; shortage: Decimal;
  suggestedBuy: Decimal; unitPrice: Decimal; estimatedCost: Decimal;
  status: 'enough' | 'low' | 'short';
  statusLabel: string; statusIcon: string;
};

/** รวมความต้องการวัตถุดิบจากแผนขาย */
export function requirementsFromPlan(plan: PlanItem[], recipes: RecipeDef[]): Map<string, Decimal> {
  const map = new Map<string, Decimal>();
  const byMenu = new Map(recipes.map((r) => [r.menuItemId, r]));
  for (const p of plan) {
    const r = byMenu.get(p.menuItemId);
    if (!r) continue;
    const y = D(r.yieldQty);
    for (const it of r.items) {
      const need = D(it.qty).times(D(p.plannedQty)).div(y.lte(0) ? 1 : y);
      map.set(it.ingredientId, (map.get(it.ingredientId) ?? D(0)).plus(need));
    }
  }
  for (const [k, v] of map) map.set(k, qty(v));
  return map;
}

/** จัดกลุ่ม เขียว/เหลือง/แดง + คำนวณจำนวนที่ควรซื้อ */
export function buildRequirementRows(
  requirements: Map<string, Decimal>,
  ingredients: IngredientState[],
): RequirementRow[] {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const rows: RequirementRow[] = [];

  for (const [ingredientId, required] of requirements) {
    const ing = byId.get(ingredientId);
    if (!ing) continue;

    const onHand = D(ing.qtyOnHand);
    const shortage = Decimal.max(required.minus(onHand), 0);
    const target = Decimal.max(D(ing.targetStock), required);
    const suggestedBuy = qty(Decimal.max(target.minus(onHand), 0));
    const unitPrice = D(ing.lastUnitCost ?? 0).gt(0) ? D(ing.lastUnitCost!) : D(ing.avgUnitCost);

    let status: RequirementRow['status'];
    if (shortage.gt(0)) status = 'short';
    else if (onHand.minus(required).lte(D(ing.reorderPoint))) status = 'low';
    else status = 'enough';

    rows.push({
      ingredientId, name: ing.name, unitName: ing.unitName,
      required: qty(required), onHand: qty(onHand), shortage: qty(shortage),
      suggestedBuy, unitPrice, estimatedCost: money(suggestedBuy.times(unitPrice)),
      status,
      statusLabel: status === 'enough' ? 'มีพอสำหรับขาย' : status === 'low' ? 'ใกล้หมด ควรซื้อเพิ่ม' : 'ของไม่พอขาย ต้องซื้อ',
      statusIcon: status === 'enough' ? '✅' : status === 'low' ? '⚠️' : '❌',
    });
  }

  const order = { short: 0, low: 1, enough: 2 } as const;
  return rows.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name, 'th'));
}

/** ประมาณต้นทุน / ยอดขาย / กำไร ของแผนขาย */
export function estimatePlan(
  plan: PlanItem[],
  menuCost: Map<string, Decimal.Value>,
  menuPrice: Map<string, Decimal.Value>,
) {
  let cost = D(0), revenue = D(0), pieces = D(0);
  for (const p of plan) {
    const q = D(p.plannedQty);
    pieces = pieces.plus(q);
    cost = cost.plus(q.times(D(menuCost.get(p.menuItemId) ?? 0)));
    revenue = revenue.plus(q.times(D(menuPrice.get(p.menuItemId) ?? 0)));
  }
  const profit = money(revenue.minus(cost));
  return {
    pieces: qty(pieces), estimatedCost: money(cost), estimatedRevenue: money(revenue),
    estimatedProfit: profit,
    estimatedMarginPct: revenue.lte(0) ? D(0) : profit.div(revenue).times(100).toDecimalPlaces(2),
  };
}

export function shoppingListTotal(rows: RequirementRow[]): Decimal {
  return money(rows.filter((r) => r.suggestedBuy.gt(0)).reduce<Decimal>((a, r) => a.plus(r.estimatedCost), D(0)));
}