import { D, money, unitCost, pct, sum, Decimal } from './decimal';

/** ต้นทุนเฉลี่ยถ่วงน้ำหนัก (Weighted Average Cost) */
export function weightedAverageCost(p: {
  qtyOnHand: Decimal.Value;
  avgUnitCost: Decimal.Value;
  incomingQty: Decimal.Value;
  incomingUnitCost: Decimal.Value;
}): Decimal {
  const onHand = Decimal.max(D(p.qtyOnHand), 0);
  const inQty = D(p.incomingQty);
  const total = onHand.plus(inQty);
  if (total.lte(0)) return unitCost(p.incomingUnitCost);
  return unitCost(onHand.times(D(p.avgUnitCost)).plus(inQty.times(D(p.incomingUnitCost))).div(total));
}

export type RecipeLine = { ingredientId: string; qty: Decimal.Value; unitCost: Decimal.Value; isPackaging?: boolean };

export type MenuCostResult = {
  ingredientCost: Decimal;
  packagingCost: Decimal;
  totalCost: Decimal;
  lines: { ingredientId: string; lineCost: Decimal }[];
};

/** ต้นทุนต่อเมนู = Σ (ปริมาณ × ต้นทุนเฉลี่ยต่อหน่วย) */
export function calcMenuCost(lines: RecipeLine[], yieldQty: Decimal.Value = 1): MenuCostResult {
  const y = D(yieldQty);
  if (y.lte(0)) throw new Error('yield ต้องมากกว่า 0');

  const detail = lines.map((l) => ({
    ingredientId: l.ingredientId,
    isPackaging: !!l.isPackaging,
    lineCost: D(l.qty).times(D(l.unitCost)).div(y),
  }));

  const ingredientCost = money(sum(detail.filter((d) => !d.isPackaging).map((d) => d.lineCost)));
  const packagingCost = money(sum(detail.filter((d) => d.isPackaging).map((d) => d.lineCost)));

  return {
    ingredientCost,
    packagingCost,
    totalCost: money(ingredientCost.plus(packagingCost)),
    lines: detail.map((d) => ({ ingredientId: d.ingredientId, lineCost: money(d.lineCost) })),
  };
}

export type MarginResult = {
  price: Decimal; cost: Decimal; grossProfit: Decimal; marginPct: Decimal;
  meetsTarget: boolean; status: 'ok' | 'warn' | 'danger';
};

/** กำไรขั้นต้น + Margin% + เทียบเป้าหมาย */
export function calcMargin(price: Decimal.Value, cost: Decimal.Value, targetPct: Decimal.Value = 0): MarginResult {
  const p = money(price);
  const c = money(cost);
  const gp = money(p.minus(c));
  const marginPct = p.lte(0) ? D(0) : pct(gp.div(p).times(100));
  const target = D(targetPct);
  const meetsTarget = marginPct.gte(target);
  const status: MarginResult['status'] = gp.lte(0) ? 'danger' : meetsTarget ? 'ok' : 'warn';
  return { price: p, cost: c, grossProfit: gp, marginPct, meetsTarget, status };
}

/** แนะนำราคาขายจากเป้า margin: price = cost / (1 - target/100) */
export function suggestPrice(cost: Decimal.Value, targetPct: Decimal.Value): Decimal {
  const t = D(targetPct);
  if (t.gte(100)) throw new Error('เป้ากำไรต้องน้อยกว่า 100%');
  return money(D(cost).div(D(1).minus(t.div(100))));
}