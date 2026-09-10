import { describe, it, expect } from 'vitest';
import { consumeFifo, stockStatus, expiryStatus } from '@/lib/inventory';

const lots = [
  { id: 'L2', qtyRemaining: 20, unitCost: 8, expiryDate: '2026-09-20', receivedAt: '2026-09-05' },
  { id: 'L1', qtyRemaining: 10, unitCost: 6, expiryDate: '2026-09-12', receivedAt: '2026-09-01' },
  { id: 'L3', qtyRemaining: 30, unitCost: 7, expiryDate: null, receivedAt: '2026-09-08' },
];

describe('การตัดสต็อกแบบ FIFO', () => {
  it('ตัดจากล็อตที่หมดอายุก่อนเป็นอันดับแรก', () => {
    const r = consumeFifo(lots, 5);
    expect(r.consumed).toHaveLength(1);
    expect(r.consumed[0].lotId).toBe('L1');
    expect(r.totalCost.toFixed(2)).toBe('30.00');
    expect(r.shortage.toString()).toBe('0');
  });

  it('ตัดข้ามล็อตและคิดต้นทุนผสม', () => {
    const r = consumeFifo(lots, 25);          // 10@6 + 15@8 = 60 + 120 = 180
    expect(r.consumed.map((c) => c.lotId)).toEqual(['L1', 'L2']);
    expect(r.totalCost.toFixed(2)).toBe('180.00');
  });

  it('ล็อตที่ไม่มีวันหมดอายุอยู่ท้ายสุด', () => {
    const r = consumeFifo(lots, 35);          // 10@6 + 20@8 + 5@7 = 60+160+35 = 255
    expect(r.consumed.map((c) => c.lotId)).toEqual(['L1', 'L2', 'L3']);
    expect(r.totalCost.toFixed(2)).toBe('255.00');
  });

  it('รายงาน shortage เมื่อสต็อกไม่พอ', () => {
    const r = consumeFifo(lots, 100);
    expect(r.shortage.toString()).toBe('40');
  });

  it('อัปเดต qtyRemaining ของล็อตที่เหลือถูกต้อง', () => {
    const r = consumeFifo(lots, 15);
    const l2 = r.remainingLots.find((l) => l.id === 'L2')!;
    expect(l2.qtyRemaining.toString()).toBe('15');
  });
});

describe('สถานะสต็อก', () => {
  it('เหลือ 0 → หมดสต็อก', () => expect(stockStatus(0, 10)).toBe('out'));
  it('เหลือเท่ากับจุดสั่งซื้อ → ใกล้หมด', () => expect(stockStatus(10, 10)).toBe('low'));
  it('เหลือมากกว่าจุดสั่งซื้อ → ปกติ', () => expect(stockStatus(11, 10)).toBe('ok'));
});

describe('สถานะวันหมดอายุ', () => {
  const today = new Date('2026-09-09T00:00:00+07:00');
  it('ไม่มีวันหมดอายุ', () => expect(expiryStatus(null, today).level).toBe('none'));
  it('หมดอายุแล้ว', () => expect(expiryStatus('2026-09-08', today).level).toBe('expired'));
  it('ภายใน 3 วัน = ด่วน', () => expect(expiryStatus('2026-09-11', today).level).toBe('urgent'));
  it('ภายใน 7 วัน = ใกล้', () => expect(expiryStatus('2026-09-15', today).level).toBe('soon'));
  it('เกิน 7 วัน = ปกติ', () => expect(expiryStatus('2026-10-01', today).level).toBe('ok'));
});