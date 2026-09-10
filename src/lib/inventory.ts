import { D, money, qty, Decimal } from './decimal';

export type Lot = { id: string; qtyRemaining: Decimal.Value; unitCost: Decimal.Value; expiryDate?: string | null; receivedAt?: string };
export type ConsumeResult = {
  consumed: { lotId: string; qty: Decimal; unitCost: Decimal; cost: Decimal }[];
  totalCost: Decimal;
  shortage: Decimal;
  remainingLots: Lot[];
};

/** ตัดสต็อกแบบ FIFO — เรียงตามวันหมดอายุก่อน แล้วตามวันที่รับเข้า */
export function consumeFifo(lots: Lot[], need: Decimal.Value): ConsumeResult {
  const sorted = [...lots].sort((a, b) => {
    const ea = a.expiryDate ?? '9999-12-31';
    const eb = b.expiryDate ?? '9999-12-31';
    if (ea !== eb) return ea < eb ? -1 : 1;
    return (a.receivedAt ?? '') < (b.receivedAt ?? '') ? -1 : 1;
  });

  let left = qty(need);
  const consumed: ConsumeResult['consumed'] = [];
  const remaining: Lot[] = [];

  for (const lot of sorted) {
    const avail = D(lot.qtyRemaining);
    if (left.lte(0) || avail.lte(0)) { remaining.push(lot); continue; }
    const take = Decimal.min(left, avail);
    consumed.push({ lotId: lot.id, qty: qty(take), unitCost: D(lot.unitCost), cost: money(take.times(D(lot.unitCost))) });
    left = left.minus(take);
    remaining.push({ ...lot, qtyRemaining: qty(avail.minus(take)) });
  }

  return {
    consumed,
    totalCost: money(consumed.reduce<Decimal>((a, c) => a.plus(c.cost), D(0))),
    shortage: left.gt(0) ? qty(left) : D(0),
    remainingLots: remaining,
  };
}

export type StockStatus = 'ok' | 'low' | 'out';

export function stockStatus(onHand: Decimal.Value, reorderPoint: Decimal.Value): StockStatus {
  const q = D(onHand);
  if (q.lte(0)) return 'out';
  if (q.lte(D(reorderPoint))) return 'low';
  return 'ok';
}

export function expiryStatus(expiryDate: string | null | undefined, today: Date, urgentDays = 3, warnDays = 7) {
  if (!expiryDate) return { level: 'none' as const, daysLeft: null };
  const d = Math.floor((new Date(expiryDate + 'T00:00:00+07:00').getTime() - today.getTime()) / 86_400_000);
  if (d < 0) return { level: 'expired' as const, daysLeft: d };
  if (d <= urgentDays) return { level: 'urgent' as const, daysLeft: d };
  if (d <= warnDays) return { level: 'soon' as const, daysLeft: d };
  return { level: 'ok' as const, daysLeft: d };
}