import { describe, it, expect } from 'vitest';
import { weightedAverageCost, calcMenuCost, calcMargin, suggestPrice } from '@/lib/costing';

describe('ต้นทุนเฉลี่ยถ่วงน้ำหนัก (WAC)', () => {
  it('สต็อกเริ่มต้นเป็น 0 → ใช้ต้นทุนของล็อตใหม่', () => {
    const r = weightedAverageCost({ qtyOnHand: 0, avgUnitCost: 0, incomingQty: 20, incomingUnitCost: 6 });
    expect(r.toString()).toBe('6');
  });
  it('มี 20 แผ่น @6 บาท เติม 20 แผ่น @8 บาท → 7 บาท', () => {
    const r = weightedAverageCost({ qtyOnHand: 20, avgUnitCost: 6, incomingQty: 20, incomingUnitCost: 8 });
    expect(r.toString()).toBe('7');
  });
  it('มี 10 แผ่น @6 เติม 30 แผ่น @8 → 7.5 บาท', () => {
    const r = weightedAverageCost({ qtyOnHand: 10, avgUnitCost: 6, incomingQty: 30, incomingUnitCost: 8 });
    expect(r.toString()).toBe('7.5');
  });
  it('สต็อกติดลบถูกมองเป็น 0', () => {
    const r = weightedAverageCost({ qtyOnHand: -5, avgUnitCost: 6, incomingQty: 10, incomingUnitCost: 9 });
    expect(r.toString()).toBe('9');
  });
});

describe('ต้นทุนต่อเมนู', () => {
  const hamCheese = [
    { ingredientId: 'bread',  qty: 2,  unitCost: 2.25 },
    { ingredientId: 'ham',    qty: 2,  unitCost: 3.75 },
    { ingredientId: 'cheese', qty: 1,  unitCost: 6 },
    { ingredientId: 'butter', qty: 5,  unitCost: 0.22 },
    { ingredientId: 'mayo',   qty: 10, unitCost: 0.085 },
    { ingredientId: 'wrap',   qty: 1,  unitCost: 0.8,  isPackaging: true },
    { ingredientId: 'box',    qty: 1,  unitCost: 2.5,  isPackaging: true },
    { ingredientId: 'sticker',qty: 1,  unitCost: 0.6,  isPackaging: true },
  ];

  it('แซนวิชแฮมชีส: วัตถุดิบ 17.95 + บรรจุภัณฑ์ 3.90 = 21.85 บาท', () => {
    const r = calcMenuCost(hamCheese);
    expect(r.ingredientCost.toFixed(2)).toBe('17.95');
    expect(r.packagingCost.toFixed(2)).toBe('3.90');
    expect(r.totalCost.toFixed(2)).toBe('21.85');
  });

  it('แยกต้นทุนรายบรรทัดถูกต้อง', () => {
    const r = calcMenuCost(hamCheese);
    expect(r.lines.find((l) => l.ingredientId === 'bread')!.lineCost.toFixed(2)).toBe('4.50');
    expect(r.lines.find((l) => l.ingredientId === 'mayo')!.lineCost.toFixed(2)).toBe('0.85');
  });

  it('รองรับ yield > 1 (สูตรทำได้หลายชิ้น)', () => {
    const r = calcMenuCost([{ ingredientId: 'a', qty: 10, unitCost: 3 }], 2);
    expect(r.totalCost.toFixed(2)).toBe('15.00');
  });

  it('สูตรว่างเปล่า → ต้นทุน 0', () => {
    expect(calcMenuCost([]).totalCost.toString()).toBe('0');
  });
});

describe('กำไรและ Margin', () => {
  it('ขาย 59 ต้นทุน 21.85 → กำไร 37.15 / 62.97%', () => {
    const r = calcMargin(59, 21.85, 50);
    expect(r.grossProfit.toFixed(2)).toBe('37.15');
    expect(r.marginPct.toFixed(2)).toBe('62.97');
    expect(r.meetsTarget).toBe(true);
    expect(r.status).toBe('ok');
  });
  it('margin ต่ำกว่าเป้า → status = warn', () => {
    expect(calcMargin(30, 20, 50).status).toBe('warn');
  });
  it('ขาดทุน → status = danger', () => {
    const r = calcMargin(20, 25, 50);
    expect(r.grossProfit.toFixed(2)).toBe('-5.00');
    expect(r.status).toBe('danger');
  });
  it('ราคาขาย 0 → margin 0 ไม่หารด้วยศูนย์', () => {
    expect(calcMargin(0, 10, 50).marginPct.toString()).toBe('0');
  });
  it('แนะนำราคา: ต้นทุน 21.85 เป้า 50% → 43.70', () => {
    expect(suggestPrice(21.85, 50).toFixed(2)).toBe('43.70');
  });
});