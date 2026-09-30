export const DEDUCT_RATE = 0.6;

const BRACKETS = [
  { upTo: 150_000, rate: 0.00 },
  { upTo: 300_000, rate: 0.05 },
  { upTo: 500_000, rate: 0.10 },
  { upTo: 750_000, rate: 0.15 },
  { upTo: 1_000_000, rate: 0.20 },
  { upTo: 2_000_000, rate: 0.25 },
  { upTo: 5_000_000, rate: 0.30 },
  { upTo: Infinity, rate: 0.35 },
];

export function calcTax(netIncome: number) {
  let remain = netIncome;
  let prev = 0;
  let tax = 0;
  for (const b of BRACKETS) {
    if (remain <= 0) break;
    const span = Math.min(remain, b.upTo - prev);
    tax += span * b.rate;
    remain -= span;
    prev = b.upTo;
  }
  return Math.max(0, tax);
}

export type Allowances = {
  personal: number;   // ส่วนตัว 60,000
  spouse: number;     // คู่สมรสไม่มีเงินได้ 60,000
  child: number;      // บุตร คนละ 30,000
  parent: number;     // บิดามารดา คนละ 30,000
  socialSecurity: number; // ประกันสังคม สูงสุด 9,000
  lifeInsurance: number;  // ประกันชีวิต สูงสุด 100,000
  healthInsurance: number;// ประกันสุขภาพ สูงสุด 25,000
  fund: number;       // RMF / SSF / กองทุนสำรองเลี้ยงชีพ
  donation: number;   // เงินบริจาค
  other: number;      // อื่นๆ
};

export const DEFAULT_ALLOWANCES: Allowances = {
  personal: 60_000, spouse: 0, child: 0, parent: 0,
  socialSecurity: 0, lifeInsurance: 0, healthInsurance: 0,
  fund: 0, donation: 0, other: 0,
};

export function summarizeTax(
  revenue: number,
  cost: number,
  fee: number,
  a: Allowances = DEFAULT_ALLOWANCES,
) {
  const expenseActual = cost + fee;
  const expenseFlat = revenue * DEDUCT_RATE;
  const useFlat = expenseFlat >= expenseActual;
  const expense = useFlat ? expenseFlat : expenseActual;

  // จำกัดเพดานตามกฎหมาย
  const capped =
    Math.min(a.personal, 60_000) +
    Math.min(a.spouse, 60_000) +
    a.child +
    a.parent +
    Math.min(a.socialSecurity, 9_000) +
    Math.min(a.lifeInsurance, 100_000) +
    Math.min(a.healthInsurance, 25_000) +
    a.fund +
    a.donation +
    a.other;

  const netIncome = Math.max(0, revenue - expense - capped);
  return {
    revenue, expenseActual, expenseFlat, useFlat,
    expense, deduction: capped, netIncome,
    estimatedTax: calcTax(netIncome),
  };
}