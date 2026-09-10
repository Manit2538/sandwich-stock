import Decimal from 'decimal.js';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -18, toExpPos: 30 });

export type Num = Decimal.Value;

export const D = (v: Num | null | undefined): Decimal =>
  new Decimal(v === null || v === undefined || v === '' ? 0 : v);

/** ปัดเป็นเงินบาท 2 ตำแหน่ง (ROUND_HALF_UP) */
export const money = (v: Num): Decimal => D(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
/** ปริมาณ 4 ตำแหน่ง */
export const qty = (v: Num): Decimal => D(v).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
/** ต้นทุนต่อหน่วย 6 ตำแหน่ง */
export const unitCost = (v: Num): Decimal => D(v).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
/** เปอร์เซ็นต์ 2 ตำแหน่ง */
export const pct = (v: Num): Decimal => D(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export const sum = (list: Num[]): Decimal => list.reduce<Decimal>((a, b) => a.plus(D(b)), D(0));
export const toStr = (v: Decimal): string => v.toFixed();
export const toNum = (v: Decimal): number => v.toNumber();
export { Decimal };