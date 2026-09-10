import { describe, it, expect } from 'vitest';
import { calcOrderTotals, summarizePeriod } from '@/lib/profit';

describe('คำนวณกำไรต่อออร์เดอร์', () => {
  it('ขายหน้าร้าน 2 ชิ้น ราคา 59 ต้นทุน 21.85 ไม่มีค่าคอม', () => {
    const t = calcOrderTotals({ lines: [{ qty: 2, unitPrice: 59, unitCogs: 21.85 }] });
    expect(t.grossSales.toFixed(2)).toBe('118.00');
    expect(t.netSales.toFixed(2)).toBe('118.00');
    expect(t.cogs.toFixed(2)).toBe('43.70');
    expect(t.grossProfit.toFixed(2)).toBe('74.30');
    expect(t.profitAfterFees.toFixed(2)).toBe('74.30');
  });

  it('ขาย GrabFood ค่าคอม 30% หักถูกต้อง', () => {
    const t = calcOrderTotals({ lines: [{ qty: 2, unitPrice: 80, unitCogs: 21.85 }], commissionPct: 30 });
    expect(t.grossSales.toFixed(2)).toBe('160.00');
    expect(t.commission.toFixed(2)).toBe('48.00');
    expect(t.grossProfit.toFixed(2)).toBe('116.30');
    expect(t.profitAfterFees.toFixed(2)).toBe('68.30');
  });

  it('มีส่วนลดร้านและค่าธรรมเนียมอื่น', () => {
    const t = calcOrderTotals({
      lines: [{ qty: 3, unitPrice: 59, unitCogs: 21.85 }],
      shopDiscount: 20, commissionPct: 30, otherFees: 5,
    });
    expect(t.grossSales.toFixed(2)).toBe('177.00');
    expect(t.netSales.toFixed(2)).toBe('157.00');
    expect(t.cogs.toFixed(2)).toBe('65.55');
    expect(t.grossProfit.toFixed(2)).toBe('91.45');
    expect(t.commission.toFixed(2)).toBe('53.10');       // คิดจาก gross
    expect(t.profitAfterFees.toFixed(2)).toBe('33.35');
  });

  it('ระบุค่าคอมเป็นจำนวนเงินโดยตรง (ทับ % อัตโนมัติ)', () => {
    const t = calcOrderTotals({ lines: [{ qty: 1, unitPrice: 100, unitCogs: 30 }], commissionPct: 30, commissionAmount: 25 });
    expect(t.commission.toFixed(2)).toBe('25.00');
  });

  it('คืนเงินหักจากยอดขายสุทธิ', () => {
    const t = calcOrderTotals({ lines: [{ qty: 1, unitPrice: 59, unitCogs: 21.85 }], refund: 59 });
    expect(t.netSales.toFixed(2)).toBe('0.00');
    expect(t.grossProfit.toFixed(2)).toBe('-21.85');
  });

  it('ยอดขายสุทธิ 0 → margin 0 ไม่ error', () => {
    const t = calcOrderTotals({ lines: [{ qty: 0, unitPrice: 59 }] });
    expect(t.marginPct.toString()).toBe('0');
  });
});

describe('สรุปกำไรรายช่วงเวลา', () => {
  const o1 = calcOrderTotals({ lines: [{ qty: 5, unitPrice: 59, unitCogs: 21.85 }] });
  const o2 = calcOrderTotals({ lines: [{ qty: 3, unitPrice: 80, unitCogs: 21.85 }], commissionPct: 30 });

  it('รวมยอดขายและ COGS ถูกต้อง', () => {
    const s = summarizePeriod({ orders: [o1, o2] });
    expect(s.orderCount).toBe(2);
    expect(s.grossSales.toFixed(2)).toBe('535.00');    // 295 + 240
    expect(s.cogs.toFixed(2)).toBe('174.80');          // 109.25 + 65.55
    expect(s.grossProfit.toFixed(2)).toBe('360.20');
    expect(s.commission.toFixed(2)).toBe('72.00');
  });

  it('หักค่าใช้จ่ายแปรผันและคงที่ได้กำไรสุทธิ', () => {
    const s = summarizePeriod({ orders: [o1, o2], variableExpenses: 50, fixedExpenses: 100 });
    expect(s.profitAfterFees.toFixed(2)).toBe('238.20');   // 360.20 − 72 − 50
    expect(s.netProfit.toFixed(2)).toBe('138.20');
  });

  it('ไม่มีออร์เดอร์ → ทุกค่าเป็น 0 และ margin 0', () => {
    const s = summarizePeriod({ orders: [] });
    expect(s.netProfit.toString()).toBe('0');
    expect(s.netMarginPct.toString()).toBe('0');
  });
});