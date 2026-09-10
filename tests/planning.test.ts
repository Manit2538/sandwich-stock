import { describe, it, expect } from 'vitest';
import { requirementsFromPlan, buildRequirementRows, estimatePlan, shoppingListTotal } from '@/lib/planning';

const recipes = [
  { menuItemId: 'M1', yieldQty: 1, items: [{ ingredientId: 'bread', qty: 2 }, { ingredientId: 'ham', qty: 2 }, { ingredientId: 'cheese', qty: 1 }] },
  { menuItemId: 'M2', yieldQty: 1, items: [{ ingredientId: 'bread', qty: 2 }, { ingredientId: 'egg', qty: 1 }, { ingredientId: 'cheese', qty: 1 }] },
  { menuItemId: 'M3', yieldQty: 1, items: [{ ingredientId: 'bread', qty: 2 }, { ingredientId: 'tuna', qty: 60 }, { ingredientId: 'cheese', qty: 1 }] },
];

const plan = [
  { menuItemId: 'M1', plannedQty: 10 },
  { menuItemId: 'M2', plannedQty: 8 },
  { menuItemId: 'M3', plannedQty: 5 },
];

describe('รวมความต้องการวัตถุดิบจากแผนขาย', () => {
  const req = requirementsFromPlan(plan, recipes);

  it('ขนมปัง = (10+8+5) × 2 = 46 แผ่น', () => expect(req.get('bread')!.toString()).toBe('46'));
  it('แฮม = 10 × 2 = 20 แผ่น', () => expect(req.get('ham')!.toString()).toBe('20'));
  it('ชีส = 10+8+5 = 23 แผ่น', () => expect(req.get('cheese')!.toString()).toBe('23'));
  it('ไข่ = 8 ฟอง', () => expect(req.get('egg')!.toString()).toBe('8'));
  it('ทูน่า = 5 × 60 = 300 กรัม', () => expect(req.get('tuna')!.toString()).toBe('300'));
  it('สูตร yield 2 หารครึ่ง', () => {
    const r = requirementsFromPlan([{ menuItemId: 'X', plannedQty: 4 }],
      [{ menuItemId: 'X', yieldQty: 2, items: [{ ingredientId: 'a', qty: 3 }] }]);
    expect(r.get('a')!.toString()).toBe('6');
  });
});

describe('จัดกลุ่มและคำนวณรายการซื้อของ', () => {
  const ingredients = [
    { id: 'bread',  name: 'ขนมปัง', unitName: 'แผ่น', qtyOnHand: 20, reorderPoint: 20, targetStock: 80, avgUnitCost: 2.25, lastUnitCost: 2.25 },
    { id: 'ham',    name: 'แฮม',    unitName: 'แผ่น', qtyOnHand: 60, reorderPoint: 20, targetStock: 60, avgUnitCost: 3.75, lastUnitCost: 3.75 },
    { id: 'cheese', name: 'ชีส',    unitName: 'แผ่น', qtyOnHand: 25, reorderPoint: 10, targetStock: 40, avgUnitCost: 6,    lastUnitCost: 6 },
    { id: 'egg',    name: 'ไข่ไก่',  unitName: 'ฟอง',  qtyOnHand: 30, reorderPoint: 10, targetStock: 30, avgUnitCost: 4,    lastUnitCost: 4 },
    { id: 'tuna',   name: 'ทูน่า',   unitName: 'กรัม', qtyOnHand: 185, reorderPoint: 185, targetStock: 555, avgUnitCost: 0.227027, lastUnitCost: 0.227027 },
  ];
  const rows = buildRequirementRows(requirementsFromPlan(plan, recipes), ingredients);
  const byId = (id: string) => rows.find((r) => r.ingredientId === id)!;

  it('ขนมปังไม่พอ → status = short และขาด 26 แผ่น', () => {
    expect(byId('bread').status).toBe('short');
    expect(byId('bread').shortage.toString()).toBe('26');
  });
  it('ขนมปังควรซื้อ = target 80 − มี 20 = 60 แผ่น', () => {
    expect(byId('bread').suggestedBuy.toString()).toBe('60');
    expect(byId('bread').estimatedCost.toFixed(2)).toBe('135.00');
  });
  it('แฮมพอ แต่เหลือหลังขาย 40 > จุดสั่งซื้อ 20 → enough', () => {
    expect(byId('ham').status).toBe('enough');
  });
  it('ชีสพอ แต่เหลือ 2 ≤ จุดสั่งซื้อ 10 → low', () => {
    expect(byId('cheese').status).toBe('low');
    expect(byId('cheese').suggestedBuy.toString()).toBe('15');
  });
  it('ทูน่าไม่พอ (ต้องใช้ 300 มี 185) → short', () => {
    expect(byId('tuna').status).toBe('short');
    expect(byId('tuna').shortage.toString()).toBe('115');
  });
  it('เรียงลำดับ short → low → enough', () => {
    expect(rows[0].status).toBe('short');
    expect(rows.at(-1)!.status).toBe('enough');
  });
  it('งบประมาณรวม = ผลรวม estimatedCost', () => {
    const expected = rows.reduce((a, r) => a + Number(r.estimatedCost), 0);
    expect(Number(shoppingListTotal(rows))).toBeCloseTo(expected, 2);
  });
});

describe('ประมาณการแผนขาย', () => {
  it('คำนวณจำนวนชิ้น ต้นทุน ยอดขาย และกำไร', () => {
    const cost = new Map<string, number>([['M1', 21.85], ['M2', 22.1], ['M3', 27.5]]);
    const price = new Map<string, number>([['M1', 59], ['M2', 59], ['M3', 69]]);
    const e = estimatePlan(plan, cost, price);
    expect(e.pieces.toString()).toBe('23');
    expect(e.estimatedRevenue.toFixed(2)).toBe('1407.00');   // 590 + 472 + 345
    expect(e.estimatedCost.toFixed(2)).toBe('533.80');       // 218.50 + 176.80 + 137.50
    expect(e.estimatedProfit.toFixed(2)).toBe('873.20');
  });
});