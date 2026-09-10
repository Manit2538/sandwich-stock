import { requireStore } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import { summarizePeriod } from '@/lib/profit';
import { fmtBaht, fmtPct, fmtDate, todayBkk } from '@/lib/format';
import { D, money } from '@/lib/decimal';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function rangeOf(period: string) {
  const today = todayBkk();
  const d = new Date(today + 'T00:00:00+07:00');
  if (period === 'week') { const s = new Date(d); s.setDate(d.getDate() - 6); return [s.toISOString().slice(0, 10), today]; }
  if (period === 'month') return [today.slice(0, 8) + '01', today];
  return [today, today];
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period = sp.period ?? 'day';
  const [from, to] = rangeOf(period);

  const { storeId } = await requireStore();
  const supabase = await createClient();

  const [{ data: daily }, { data: expenses }, { data: items }] = await Promise.all([
    supabase.from('v_daily_profit').select('*').eq('store_id', storeId)
      .gte('biz_date', from).lte('biz_date', to).order('biz_date', { ascending: false }),
    supabase.from('expenses').select('amount, kind').eq('store_id', storeId)
      .gte('expense_date', from).lte('expense_date', to),
    supabase.from('sales_order_items')
      .select('qty, line_total, line_cogs, menu_items(name), sales_orders!inner(status, occurred_at)')
      .eq('store_id', storeId).eq('sales_orders.status', 'completed')
      .gte('sales_orders.occurred_at', `${from}T00:00:00+07:00`)
      .lte('sales_orders.occurred_at', `${to}T23:59:59+07:00`),
  ]);

  const orders = (daily ?? []).map((d: any) => ({
    grossSales: D(d.gross_sales), shopDiscount: D(d.shop_discount), refund: D(0),
    netSales: D(d.net_sales), cogs: D(d.cogs),
    grossProfit: D(d.net_sales).minus(D(d.cogs)),
    commission: D(d.commission), otherFees: D(d.other_fees),
    profitAfterFees: D(0), marginPct: D(0),
  })) as any;

  const variable = money((expenses ?? []).filter((e: any) => e.kind === 'variable').reduce((a: any, e: any) => a.plus(D(e.amount)), D(0)));
  const fixed = money((expenses ?? []).filter((e: any) => e.kind === 'fixed').reduce((a: any, e: any) => a.plus(D(e.amount)), D(0)));
  const s = summarizePeriod({ orders, variableExpenses: variable, fixedExpenses: fixed });

  const byMenu = new Map<string, { qty: number; revenue: any; cogs: any }>();
  for (const it of items ?? []) {
    const name = (it as any).menu_items?.name ?? '-';
    const cur = byMenu.get(name) ?? { qty: 0, revenue: D(0), cogs: D(0) };
    byMenu.set(name, {
      qty: cur.qty + Number(it.qty),
      revenue: cur.revenue.plus(D(it.line_total)),
      cogs: cur.cogs.plus(D(it.line_cogs)),
    });
  }
  const menuRows = [...byMenu.entries()]
    .map(([name, v]) => ({ name, qty: v.qty, revenue: money(v.revenue), profit: money(v.revenue.minus(v.cogs)) }))
    .sort((a, b) => b.profit.comparedTo(a.profit));

  const TABS = [{ k: 'day', l: 'วันนี้' }, { k: 'week', l: '7 วัน' }, { k: 'month', l: 'เดือนนี้' }];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">รายงานกำไร</h1>

      <div className="grid grid-cols-3 gap-2 rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
        {TABS.map((t) => (
          <Link key={t.k} href={`/reports?period=${t.k}`}
            className={`rounded-lg py-2 text-center text-sm font-semibold ${period === t.k ? 'bg-white shadow dark:bg-stone-700' : ''}`}>
            {t.l}
          </Link>
        ))}
      </div>

      <p className="text-xs text-stone-500">ช่วง {fmtDate(from)} – {fmtDate(to)}</p>

      <div className="card space-y-2 text-sm">
        {[
          ['ยอดขายรวม', s.grossSales], ['ยอดขายสุทธิ', s.netSales],
          ['ต้นทุนขาย (COGS)', s.cogs], ['กำไรขั้นต้น', s.grossProfit],
          ['ค่าคอมมิชชัน', s.commission], ['ค่าธรรมเนียมอื่น', s.otherFees],
          ['ค่าใช้จ่ายแปรผัน', s.variableExpenses], ['กำไรหลังค่าธรรมเนียม', s.profitAfterFees],
          ['ค่าใช้จ่ายคงที่', s.fixedExpenses],
        ].map(([label, val]: any) => (
          <div key={label} className="flex justify-between">
            <span>{label}</span><span className="tabular-nums">{fmtBaht(val)}</span>
          </div>
        ))}
        <hr className="border-stone-200 dark:border-stone-700" />
        <div className="flex justify-between text-base">
          <span className="font-bold">กำไรสุทธิ</span>
          <b className={`tabular-nums ${s.netProfit.gte(0) ? 'text-ok' : 'text-danger'}`}>
            {fmtBaht(s.netProfit)} ({fmtPct(s.netMarginPct)})
          </b>
        </div>
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">📊 กำไรรายเมนู</h2>
        {!menuRows.length ? <p className="text-sm text-stone-500">ยังไม่มีข้อมูลการขายในช่วงนี้</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-stone-500">
              <th className="pb-2">เมนู</th><th className="pb-2 text-right">ชิ้น</th>
              <th className="pb-2 text-right">ยอดขาย</th><th className="pb-2 text-right">กำไร</th>
            </tr></thead>
            <tbody>
              {menuRows.map((r) => (
                <tr key={r.name} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="py-2">{r.name}</td>
                  <td className="py-2 text-right tabular-nums">{r.qty}</td>
                  <td className="py-2 text-right tabular-nums">{fmtBaht(r.revenue)}</td>
                  <td className={`py-2 text-right tabular-nums font-semibold ${r.profit.gte(0) ? 'text-ok' : 'text-danger'}`}>
                    {fmtBaht(r.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="card text-sm text-stone-500">
        📈 กราฟแนวโน้มย้อนหลัง — <span className="wip">อยู่ระหว่างพัฒนา (Phase 2)</span>
      </p>
    </div>
  );
}