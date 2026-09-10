import { D, money, pct, Decimal } from './decimal';

export type OrderInput = {
  lines: { qty: Decimal.Value; unitPrice: Decimal.Value; unitCogs?: Decimal.Value }[];
  shopDiscount?: Decimal.Value;
  commissionPct?: Decimal.Value;
  commissionAmount?: Decimal.Value;
  otherFees?: Decimal.Value;
  refund?: Decimal.Value;
};

export type OrderTotals = {
  grossSales: Decimal; shopDiscount: Decimal; refund: Decimal; netSales: Decimal;
  cogs: Decimal; grossProfit: Decimal; commission: Decimal; otherFees: Decimal;
  profitAfterFees: Decimal; marginPct: Decimal;
};

/**
 * ยอดขายรวม  = Σ(qty × ราคาขาย)
 * ยอดขายสุทธิ = ยอดขายรวม − ส่วนลดร้าน − คืนเงิน
 * กำไรขั้นต้น = ยอดขายสุทธิ − COGS
 * กำไรหลังค่าธรรมเนียม = กำไรขั้นต้น − คอมมิชชัน − ค่าธรรมเนียมอื่น
 */
export function calcOrderTotals(o: OrderInput): OrderTotals {
  const grossSales = money(o.lines.reduce<Decimal>((a, l) => a.plus(D(l.qty).times(D(l.unitPrice))), D(0)));
  const cogs = money(o.lines.reduce<Decimal>((a, l) => a.plus(D(l.qty).times(D(l.unitCogs ?? 0))), D(0)));
  const shopDiscount = money(o.shopDiscount ?? 0);
  const refund = money(o.refund ?? 0);
  const netSales = money(grossSales.minus(shopDiscount).minus(refund));

  const commission = o.commissionAmount !== undefined
    ? money(o.commissionAmount)
    : money(grossSales.times(D(o.commissionPct ?? 0)).div(100));

  const otherFees = money(o.otherFees ?? 0);
  const grossProfit = money(netSales.minus(cogs));
  const profitAfterFees = money(grossProfit.minus(commission).minus(otherFees));

  return {
    grossSales, shopDiscount, refund, netSales, cogs, grossProfit,
    commission, otherFees, profitAfterFees,
    marginPct: netSales.lte(0) ? D(0) : pct(grossProfit.div(netSales).times(100)),
  };
}

export type PeriodInput = {
  orders: OrderTotals[];
  variableExpenses?: Decimal.Value;
  fixedExpenses?: Decimal.Value;
};

/** สรุปกำไรรายวัน/สัปดาห์/เดือน */
export function summarizePeriod(p: PeriodInput) {
  const acc = (fn: (o: OrderTotals) => Decimal) =>
    money(p.orders.reduce<Decimal>((a, o) => a.plus(fn(o)), D(0)));

  const grossSales = acc((o) => o.grossSales);
  const netSales = acc((o) => o.netSales);
  const cogs = acc((o) => o.cogs);
  const commission = acc((o) => o.commission);
  const otherFees = acc((o) => o.otherFees);
  const variable = money(p.variableExpenses ?? 0);
  const fixed = money(p.fixedExpenses ?? 0);

  const grossProfit = money(netSales.minus(cogs));
  const profitAfterFees = money(grossProfit.minus(commission).minus(otherFees).minus(variable));
  const netProfit = money(profitAfterFees.minus(fixed));

  return {
    orderCount: p.orders.length,
    grossSales, netSales, cogs, commission, otherFees,
    variableExpenses: variable, fixedExpenses: fixed,
    grossProfit, profitAfterFees, netProfit,
    netMarginPct: netSales.lte(0) ? D(0) : pct(netProfit.div(netSales).times(100)),
  };
}