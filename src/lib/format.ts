import { Decimal } from './decimal';

const TZ = 'Asia/Bangkok';

export const fmtBaht = (v: Decimal | number | string) =>
  '฿' + new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(v?.toString() ?? 0));

export const fmtQty = (v: Decimal | number | string) =>
  new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(Number(v?.toString() ?? 0));

export const fmtPct = (v: Decimal | number | string) =>
  new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 }).format(Number(v?.toString() ?? 0)) + '%';

export const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: TZ }).format(new Date(d));

export const fmtDateTime = (d: string | Date) =>
  new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short', timeZone: TZ }).format(new Date(d));

/** วันที่ปัจจุบันตามเวลาไทย (YYYY-MM-DD) */
export const todayBkk = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g('year')}-${g('month')}-${g('day')}`;
};