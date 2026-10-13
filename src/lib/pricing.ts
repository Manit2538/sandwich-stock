export type Platform = {
  id: string;
  code: string;
  name: string;
  commission_pct: number;
};

export function roundNice(n: number) {
  const r = Math.ceil(n);
  const last = r % 10;
  if (last === 0 || last === 9) return r;
  return last <= 4 ? r - last + 5 : r - last + 9;
}

/** ราคาที่ทำให้ยอดสุทธิหลังหักคอมเท่ากับราคาฐาน */
export function priceForPlatform(base: number, commPct: number) {
  const c = Number(commPct ?? 0) / 100;
  if (!base || c >= 1) return base;
  return c === 0 ? Math.ceil(base) : roundNice(base / (1 - c));
}

/** คืนค่าเป็น map ของ platform_id -> ราคา (ตรงกับ menu_prices) */
export function autoFillPrices(base: number, platforms: Platform[]) {
  const out: Record<string, number> = {};
  for (const p of platforms) out[p.id] = priceForPlatform(base, p.commission_pct);
  return out;
}