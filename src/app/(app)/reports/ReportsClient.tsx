'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Cat = { category_name: string; kind: string; total: number; cnt: number };
type Trend = { month_start: string; revenue: number; expense: number; net_profit: number };

const monthStr = (d: Date) => d.toISOString().slice(0, 7);
const baht = (v: any) => '฿' + Number(v ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });

export default function ReportsClient({ storeId }: { storeId: string }) {
  const [month, setMonth] = useState(monthStr(new Date()));
  const [sum, setSum] = useState<any>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [trend, setTrend] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const day = month + '-01';
    const [s, c, t] = await Promise.all([
      sb.rpc('monthly_summary', { p_store_id: storeId, p_month: day }),
      sb.rpc('expense_by_category', { p_store_id: storeId, p_month: day }),
      sb.rpc('summary_trend', { p_store_id: storeId, p_months: 6 }),
    ]);
    setSum(Array.isArray(s.data) ? s.data[0] : s.data);
    setCats((c.data ?? []) as Cat[]);
    setTrend((t.data ?? []) as Trend[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [storeId, month]);

  const catMax = Math.max(1, ...cats.map((c) => Number(c.total)));
  const trendMax = Math.max(1, ...trend.map((t) => Math.max(Number(t.revenue), Number(t.expense))));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">วิเคราะห์รายจ่าย</h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-stone-400/50 bg-transparent px-2 py-1.5 text-sm"
        />
      </div>

      {loading ? (
        <div className="p-6 text-center text-stone-500">กำลังโหลด…</div>
      ) : (
        <>
          {sum && (
            <div className="card space-y-1.5 text-sm">
              <div className="flex justify-between"><span>ยอดขายสุทธิ</span><b className="text-green-500">{baht(sum.revenue)}</b></div>
              <div className="flex justify-between text-stone-500"><span>ต้นทุนวัตถุดิบ</span><span>-{baht(sum.cogs)}</span></div>
              <div className="flex justify-between text-stone-500"><span>ค่าคอม/ค่าธรรมเนียม</span><span>-{baht(sum.platform_fee)}</span></div>
              <div className="flex justify-between border-t border-stone-400/20 pt-1.5"><span>กำไรขั้นต้น</span><b>{baht(sum.gross_profit)}</b></div>
              <div className="flex justify-between text-stone-500"><span>ค่าใช้จ่ายคงที่</span><span>-{baht(sum.expense_fixed)}</span></div>
              <div className="flex justify-between text-stone-500"><span>ค่าใช้จ่ายผันแปร</span><span>-{baht(sum.expense_variable)}</span></div>
              <div className="flex justify-between border-t border-stone-400/20 pt-1.5 text-base">
                <b>กำไรสุทธิ</b>
                <b className={Number(sum.net_profit) >= 0 ? 'text-green-500' : 'text-red-500'}>{baht(sum.net_profit)}</b>
              </div>
              {Number(sum.revenue) > 0 && (
                <div className="pt-1 text-xs text-stone-500">
                  อัตรากำไรสุทธิ {((Number(sum.net_profit) / Number(sum.revenue)) * 100).toFixed(1)}%
                  {' · '}ต้นทุนวัตถุดิบ {((Number(sum.cogs) / Number(sum.revenue)) * 100).toFixed(1)}%
                </div>
              )}
            </div>
          )}

          <div className="card space-y-2">
            <div className="text-sm font-medium">รายจ่ายแยกตามหมวด</div>
            {cats.length === 0 ? (
              <div className="py-4 text-center text-xs text-stone-500">เดือนนี้ยังไม่มีรายจ่าย</div>
            ) : (
              cats.map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>
                      {c.category_name}
                      <span className="ml-1 text-stone-500">
                        ({c.kind === 'fixed' ? 'คงที่' : 'ผันแปร'} · {c.cnt} รายการ)
                      </span>
                    </span>
                    <b>{baht(c.total)}</b>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-400/15">
                    <div
                      className={c.kind === 'fixed' ? 'h-full bg-orange-500' : 'h-full bg-sky-500'}
                      style={{ width: `${(Number(c.total) / catMax) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="card space-y-2">
            <div className="text-sm font-medium">ย้อนหลัง 6 เดือน</div>
            <div className="flex items-end justify-between gap-1.5 pt-2" style={{ height: 120 }}>
              {trend.map((t) => (
                <div key={t.month_start} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-full w-full items-end justify-center gap-0.5">
                    <div
                      className="w-1/2 rounded-t bg-green-500/80"
                      style={{ height: `${(Number(t.revenue) / trendMax) * 100}%` }}
                      title={'รายรับ ' + baht(t.revenue)}
                    />
                    <div
                      className="w-1/2 rounded-t bg-red-500/70"
                      style={{ height: `${(Number(t.expense) / trendMax) * 100}%` }}
                      title={'รายจ่าย ' + baht(t.expense)}
                    />
                  </div>
                  <div className="text-[10px] text-stone-500">{t.month_start.slice(5, 7)}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-1 text-[10px] text-stone-500">
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-green-500/80" />รายรับ</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-red-500/70" />รายจ่ายรวม</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}