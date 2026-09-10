import { D, qty, Decimal } from './decimal';

export type UnitRow = { id: string; code: string; name_th: string; kind: 'count' | 'weight' | 'volume' };
export type ConversionRow = { from_unit_id: string; to_unit_id: string; factor: string | number };

/**
 * แปลงหน่วยด้วย BFS บนกราฟการแปลง (รองรับทั้งทางตรงและทางกลับ)
 * 1 from = factor * to
 */
export function convertQty(
  amount: Decimal.Value,
  fromUnitId: string,
  toUnitId: string,
  conversions: ConversionRow[],
): Decimal {
  if (fromUnitId === toUnitId) return qty(amount);

  const graph = new Map<string, { to: string; factor: Decimal }[]>();
  const push = (a: string, b: string, f: Decimal) => {
    if (!graph.has(a)) graph.set(a, []);
    graph.get(a)!.push({ to: b, factor: f });
  };
  for (const c of conversions) {
    const f = D(c.factor);
    if (f.lte(0)) continue;
    push(c.from_unit_id, c.to_unit_id, f);
    push(c.to_unit_id, c.from_unit_id, D(1).div(f));
  }

  const queue: { node: string; acc: Decimal }[] = [{ node: fromUnitId, acc: D(1) }];
  const seen = new Set([fromUnitId]);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.node === toUnitId) return qty(D(amount).times(cur.acc));
    for (const e of graph.get(cur.node) ?? []) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      queue.push({ node: e.to, acc: cur.acc.times(e.factor) });
    }
  }
  throw new Error(`ไม่พบสูตรแปลงหน่วยจาก ${fromUnitId} ไป ${toUnitId}`);
}

/**
 * ต้นทุนต่อหน่วยฐานจากการซื้อเป็นแพ็ก
 * เช่น ชีส 1 แพ็ก 120 บาท มี 20 แผ่น → 6.000000 บาท/แผ่น
 */
export function costPerBaseUnit(params: {
  totalPrice: Decimal.Value;
  purchaseQty: Decimal.Value;
  unitsPerPack: Decimal.Value;
}): Decimal {
  const base = D(params.purchaseQty).times(D(params.unitsPerPack));
  if (base.lte(0)) throw new Error('จำนวนหน่วยฐานต้องมากกว่า 0');
  return D(params.totalPrice).div(base).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
}

export function baseQtyFromPurchase(purchaseQty: Decimal.Value, unitsPerPack: Decimal.Value): Decimal {
  return qty(D(purchaseQty).times(D(unitsPerPack)));
}