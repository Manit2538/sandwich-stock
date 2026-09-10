import { describe, it, expect } from 'vitest';
import { convertQty, costPerBaseUnit, baseQtyFromPurchase } from '@/lib/units';

const U = { kg: 'u-kg', g: 'u-g', l: 'u-l', ml: 'u-ml', slice: 'u-slice' };
const conv = [
  { from_unit_id: U.kg, to_unit_id: U.g, factor: 1000 },
  { from_unit_id: U.l, to_unit_id: U.ml, factor: 1000 },
];

describe('การแปลงหน่วย', () => {
  it('หน่วยเดียวกันคืนค่าเดิม', () => {
    expect(convertQty(5, U.g, U.g, conv).toString()).toBe('5');
  });
  it('kg → g', () => {
    expect(convertQty(1.5, U.kg, U.g, conv).toString()).toBe('1500');
  });
  it('g → kg (ทางกลับ)', () => {
    expect(convertQty(500, U.g, U.kg, conv).toString()).toBe('0.5');
  });
  it('l → ml', () => {
    expect(convertQty(0.25, U.l, U.ml, conv).toString()).toBe('250');
  });
  it('โยนข้อผิดพลาดเมื่อไม่มีเส้นทางแปลง', () => {
    expect(() => convertQty(1, U.slice, U.g, conv)).toThrow();
  });
});

describe('ต้นทุนต่อหน่วยฐาน', () => {
  it('ชีส 1 แพ็ก 120 บาท 20 แผ่น = 6 บาท/แผ่น', () => {
    expect(costPerBaseUnit({ totalPrice: 120, purchaseQty: 1, unitsPerPack: 20 }).toString()).toBe('6');
  });
  it('ขนมปัง 1 แพ็ก 45 บาท 20 แผ่น = 2.25 บาท/แผ่น', () => {
    expect(costPerBaseUnit({ totalPrice: 45, purchaseQty: 1, unitsPerPack: 20 }).toString()).toBe('2.25');
  });
  it('มายองเนส 85 บาท 1000 กรัม = 0.085 บาท/กรัม', () => {
    expect(costPerBaseUnit({ totalPrice: 85, purchaseQty: 1, unitsPerPack: 1000 }).toString()).toBe('0.085');
  });
  it('ทูน่า 42 บาท 185 กรัม = 0.227027 บาท/กรัม (ปัด 6 ตำแหน่ง)', () => {
    expect(costPerBaseUnit({ totalPrice: 42, purchaseQty: 1, unitsPerPack: 185 }).toString()).toBe('0.227027');
  });
  it('ไข่ไก่ 1 แผง 120 บาท 30 ฟอง = 4 บาท/ฟอง', () => {
    expect(costPerBaseUnit({ totalPrice: 120, purchaseQty: 1, unitsPerPack: 30 }).toString()).toBe('4');
  });
  it('ซื้อ 3 แพ็ก แพ็กละ 20 แผ่น รวม 360 บาท = 6 บาท/แผ่น', () => {
    expect(costPerBaseUnit({ totalPrice: 360, purchaseQty: 3, unitsPerPack: 20 }).toString()).toBe('6');
  });
  it('base qty = qty × unitsPerPack', () => {
    expect(baseQtyFromPurchase(3, 20).toString()).toBe('60');
  });
  it('โยนข้อผิดพลาดเมื่อหน่วยฐานเป็น 0', () => {
    expect(() => costPerBaseUnit({ totalPrice: 100, purchaseQty: 0, unitsPerPack: 20 })).toThrow();
  });
});