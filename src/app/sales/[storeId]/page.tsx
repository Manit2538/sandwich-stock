'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Daily = {
  sale_date: string;
  order_count: number;
  revenue: number;
  avg_ticket: number;
};

type ByMenu = {
  menu_item_id: string;
  menu_name: string;
  qty_sold: number;
  revenue: number;
};

const RANGES = [
  { key: 7, label: '7 วัน' },
  { key: 30, label: '30 วัน' },
  { key: 90, label: '90 วัน' },
] as const;

export default function SalesPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [days, setDays] = useState<number>(7);
  const [daily, setDaily] = useState<Daily[]>([]);
  const [menu, setMenu] = useState<ByMenu[]>([]);
  const [loading, setLoading] = useState(true);

  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1));
    return d.toISOString().slice(0, 10);
  }, [days]);

  async function load() {
    setLoading(true);
    const [{ data: d }, { data: m }] = await Promise.all([
      sb.from('sales_daily')
        .select('*')
        .eq('store_id', storeId)
        .gte('sale_date', fromDate)
        .order('sale_date', { ascending: false }),
      sb.from('sales_by_menu')
        .select('*')
        .eq('store_id', storeId)
        .gte('sale_date', fromDate),
    ]);

    setDaily((d ?? []) as Daily[]);

    // รวมยอดเมนูข้ามวัน
    const agg = new Map<string, ByMenu>();
    (m ?? []).forEach((r: any) => {
      const cur = agg.get(r.menu_item_id);
      if (cur) {
        cur.qty_sold += Number(r.qty_sold);
        cur.revenue += Number(r.revenue);
      } else {
        agg.set(r.menu_item_id, {
          menu_item_id: r.menu_item_id,
          menu_name: r.menu_name,
          qty_sold: Number(r.qty_sold),
          revenue: Number(r.revenue),
        });
      }
    });
    setMenu([...agg.values()].sort((a, b) => b.qty_sold - a.qty_sold));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [storeId, days]);

  const baht = (n: number) =>
    `฿${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  const today = new Date().toISOString().slice(0, 10);
  const todayRow = daily.find((d) => d.sale_date === today);

  const totalRevenue = daily.reduce((s, d) => s + Number(d.revenue), 0);
  const totalOrders = daily.reduce((s, d) => s + Number(d.order_count), 0);
  const maxRevenue = Math.max(...daily.map((d) => Number(d.revenue)), 1);

  const fmtDay = (s: string) =>
    new Date(s + 'T00:00:00').toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
    });

  if (loading) return <div className="p-6 text-center text-gray-400">กำลังโหลด…</div>;

  return (
    <div className="mx-auto max-w-2xl p-4 pb-20">
      <h1 className="text-xl font-bold">สรุปยอดขาย</h1>

      {/* การ์ดวันนี้ */}
      <div className="mt-3 rounded-xl bg-gradient-to-br from-green-600/20 to-green-800/10 p-4 ring-1 ring-green-500/30">
        <div className="text-xs text-green-300">ยอดขายวันนี้</div>
        <div className="mt-1 text-3xl font-bold text-green-400">
          {baht(todayRow?.revenue ?? 0)}
        </div>
        <div className="mt-1 text-xs text-gray-400">
          {todayRow?.order_count ?? 0} ออร์เดอร์ · เฉลี่ย {baht(todayRow?.avg_ticket ?? 0)}/บิล
        </div>
      </div>

      {/* เลือกช่วง */}
      <div className="mt-4 flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setDays(r.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              days === r.key ? 'bg-gray-700 text-white' : 'bg-gray-800/50 text-gray-400'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* สรุปช่วง */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-800 py-2.5">
          <div className="text-base font-bold">{baht(totalRevenue)}</div>
          <div className="text-xs text-gray-400">รายได้รวม</div>
        </div>
        <div className="rounded-lg bg-gray-800 py-2.5">
          <div className="text-base font-bold">{totalOrders}</div>
          <div className="text-xs text-gray-400">ออร์เดอร์</div>
        </div>
        <div className="rounded-lg bg-gray-800 py-2.5">
          <div className="text-base font-bold">
            {baht(totalOrders ? totalRevenue / totalOrders : 0)}
          </div>
          <div className="text-xs text-gray-400">เฉลี่ย/บิล</div>
        </div>
      </div>

      {/* กราฟแท่ง */}
      <h2 className="mt-5 text-sm font-semibold text-gray-300">ยอดขายรายวัน</h2>
      <div className="mt-2 space-y-1.5">
        {daily.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">ยังไม่มียอดขายในช่วงนี้</div>
        ) : (
          daily.map((d) => (
            <div key={d.sale_date} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs text-gray-400">{fmtDay(d.sale_date)}</span>
              <div className="h-6 flex-1 overflow-hidden rounded bg-gray-800">
                <div
                  className="flex h-full items-center justify-end rounded bg-green-600/70 pr-2 text-[10px] font-medium text-white"
                  style={{ width: `${(Number(d.revenue) / maxRevenue) * 100}%`, minWidth: '3rem' }}
                >
                  {baht(d.revenue)}
                </div>
              </div>
              <span className="w-8 shrink-0 text-right text-xs text-gray-500">
                {d.order_count}
              </span>
            </div>
          ))
        )}
      </div>

      {/* เมนูขายดี */}
      <h2 className="mt-6 text-sm font-semibold text-gray-300">เมนูขายดี</h2>
      <div className="mt-2 space-y-1.5">
        {menu.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">ยังไม่มีข้อมูล</div>
        ) : (
          menu.map((m, i) => (
            <div
              key={m.menu_item_id}
              className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : i === 1
                      ? 'bg-gray-400/20 text-gray-300'
                      : i === 2
                      ? 'bg-orange-700/30 text-orange-400'
                      : 'bg-gray-700/50 text-gray-500'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="truncate text-sm">{m.menu_name}</span>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold">{m.qty_sold} ชิ้น</div>
                <div className="text-xs text-gray-500">{baht(m.revenue)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}