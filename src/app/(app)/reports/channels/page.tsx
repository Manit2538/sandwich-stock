'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const CHANNEL_LABEL: Record<string, string> = {
  storefront: 'รับเอง/หน้าร้าน',
  company: 'ขายในบริษัท',
  grab: 'GrabFood',
  lineman: 'LINE MAN',
  shopee: 'ShopeeFood',
  other: 'อื่น ๆ',
};

type Row = {
  channel_name: string;
  order_count: number;
  gross_sales: number;
  total_commission: number;
  net_received: number;
  total_cost: number;
  gross_profit: number;
};


const baht = (n: number) =>
  `฿${Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ChannelProfitPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data, error } = await sb
      .from('v_channel_profit')
      .select('*')
      .gte('sale_date', from)
      .lte('sale_date', to);

    if (error) {
      setErr(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const agg = new Map<string, Row>();
    (data ?? []).forEach((d: any) => {
      const key = d.channel_name;
      const cur = agg.get(key) ?? {
        channel_name: key,
        order_count: 0,
        gross_sales: 0,
        total_commission: 0,
        net_received: 0,
        total_cost: 0,
        gross_profit: 0,
      };
      cur.order_count += Number(d.order_count || 0);
      cur.gross_sales += Number(d.gross_sales || 0);
      cur.total_commission += Number(d.total_commission || 0);
      cur.net_received += Number(d.net_received || 0);
      cur.total_cost += Number(d.total_cost || 0);
      cur.gross_profit += Number(d.gross_profit || 0);
      agg.set(key, cur);
    });

    setRows([...agg.values()].sort((a, b) => b.gross_profit - a.gross_profit));
    setLoading(false);
  }
  
  useEffect(() => {
    load();
  }, [from, to]);

  const sum = useMemo(
  () =>
    rows.reduce(
      (s, r) => ({
        order_count: s.order_count + r.order_count,
        gross_sales: s.gross_sales + r.gross_sales,
        total_commission: s.total_commission + r.total_commission,
        net_received: s.net_received + r.net_received,
        total_cost: s.total_cost + r.total_cost,             // <-- เพิ่มบรรทัดนี้
        gross_profit: s.gross_profit + r.gross_profit,       // <-- เพิ่มบรรทัดนี้
      }),
      { order_count: 0, gross_sales: 0, total_commission: 0, net_received: 0, total_cost: 0, gross_profit: 0 }
    ),
  [rows]
);

  return (
    <div className="mx-auto max-w-5xl p-4 pb-28">
      <h1 className="text-xl font-bold text-white">รายงานกำไรแยกช่องทาง</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <DateField label="ตั้งแต่วันที่" value={from} onChange={setFrom} />
        <DateField label="ถึงวันที่" value={to} onChange={setTo} />
      </div>


      {err && (
        <div className="mt-4 rounded-lg bg-red-500/15 p-3 text-xs text-red-400">
          โหลดข้อมูลไม่สำเร็จ: {err}
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-center text-gray-400">กำลังโหลด…</div>
      ) : rows.length === 0 ? (
        <div className="mt-8 text-center text-gray-500">ไม่มีข้อมูลในช่วงวันที่เลือก</div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card label="จำนวนบิล" value={String(sum.order_count)} />
            <Card label="ยอดขายรวม" value={baht(sum.gross_sales)} />
            <Card label="ค่าคอมมิชชัน" value={`-${baht(sum.total_commission)}`} tone="red" />
            <Card label="รับจริง" value={baht(sum.net_received)} tone="green" />
          </div>

<div className="mt-5 overflow-x-auto rounded-xl border border-gray-800">
  <table className="w-full min-w-[440px] text-xs">
    <thead className="bg-gray-900 text-[10px] text-gray-400">
      <tr>
        <th className="p-2 text-left w-[28%] pl-2.5">ช่องทาง</th>
        <th className="p-2 text-right w-[8%]">บิล</th>
        <th className="p-2 text-right w-[18%]">ยอดขาย</th>
        <th className="p-2 text-right w-[14%]">ค่าคอมฯ</th>
        <th className="p-2 text-right w-[16%]">ต้นทุน</th>
        <th className="p-2 text-right w-[16%] pr-2.5">กำไร</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((r) => {
        return (
          <tr key={r.channel_name} className="border-t border-gray-800 text-gray-200">
            <td className="p-2 font-medium whitespace-nowrap pl-2.5">{r.channel_name}</td>
            <td className="p-2 text-right">{r.order_count}</td>
            <td className="p-2 text-right whitespace-nowrap">{baht(r.gross_sales)}</td>
            <td className="p-2 text-right text-red-400 whitespace-nowrap">
              {r.total_commission > 0 ? `-${baht(r.total_commission)}` : '-'}
            </td>
            <td className="p-2 text-right text-red-400 whitespace-nowrap">-{baht(r.total_cost)}</td>
            <td className={`p-2 text-right font-semibold whitespace-nowrap pr-2.5 ${r.gross_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {baht(r.gross_profit)}
            </td>
          </tr>
        );
      })}
    </tbody>
    <tfoot className="border-t-2 border-gray-700 bg-gray-900 font-bold text-white">
      <tr>
        <td className="p-2 whitespace-nowrap pl-2.5">รวมทั้งหมด</td>
        <td className="p-2 text-right">{sum.order_count}</td>
        <td className="p-2 text-right whitespace-nowrap">{baht(sum.gross_sales)}</td>
        <td className="p-2 text-right text-red-400 whitespace-nowrap">-{baht(sum.total_commission)}</td>
        <td className="p-2 text-right text-red-400 whitespace-nowrap">-{baht(sum.total_cost)}</td>
        <td className="p-2 text-right text-green-400 whitespace-nowrap pr-2.5">{baht(sum.gross_profit)}</td>
      </tr>
    </tfoot>
  </table>
</div>

        </>
      )}
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'green' }) {
  const color = tone === 'red' ? 'text-red-400' : tone === 'green' ? 'text-green-400' : 'text-white';
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
      <div className="text-[11px] text-gray-400">{label}</div>
      <div className={`mt-1 text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // แปลง yyyy-mm-dd -> dd/mm/yyyy
  const display = value
    ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
    : 'เลือกวันที่';

  return (
    <div>
      <label className="text-xs text-gray-400">{label}</label>
      <div className="relative mt-1">
        <div className="pointer-events-none flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white">
          <span>{display}</span>
          <span className="text-gray-500">📅</span>
        </div>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}