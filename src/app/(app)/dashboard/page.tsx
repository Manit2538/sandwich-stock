import Link from 'next/link';
import StatCard from '@/components/StatCard';
import AlertCenter from '@/components/AlertCenter';
import { requireStore, getUnreadNotifications } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import { calcMargin } from '@/lib/costing';
import { fmtBaht, fmtPct, fmtQty, todayBkk } from '@/lib/format';
import { D, money } from '@/lib/decimal';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { storeId, store } = await requireStore();
  const supabase = await createClient();
  const today = todayBkk();

  await supabase.rpc('fn_rebuild_alerts', { p_store_id: storeId });

  const [{ data: daily }, { data: menuCosts }, { data: topItems }, notifications] = await Promise.all([
    supabase.from('v_daily_profit').select('*').eq('store_id', storeId).eq('biz_date', today).maybeSingle(),
    supabase.from('v_menu_cost').select('*').eq('store_id', storeId),
    supabase.from('sales_order_items')
      .select('qty, line_total, line_cogs, menu_items(name), sales_orders!inner(occurred_at, status)')
      .eq('store_id', storeId).eq('sales_orders.status', 'completed')
      .gte('sales_orders.occurred_at', `${today}T00:00:00+07:00`)
      .lte('sales_orders.occurred_at', `${today}T23:59:59+07:00`),
    getUnreadNotifications(storeId),
  ]);

  const gross = D(daily?.gross_sales ?? 0);
  const net = D(daily?.net_sales ?? 0);
  const cogs = D(daily?.cogs ?? 0);
  const commission = D(daily?.commission ?? 0);
  const otherFees = D(daily?.other_fees ?? 0);
  const grossProfit = money(net.minus(cogs));
  const afterFees = money(grossProfit.minus(commission).minus(otherFees));
  const pieces = (topItems ?? []).reduce((a: number, r: any) => a + Number(r.qty), 0);

  // เมนูขายดี
  const byMenu = new Map<string, number>();
  for (const r of topItems ?? []) {
    const name = (r as any).menu_items?.name ?? '-';
    byMenu.set(name, (byMenu.get(name) ?? 0) + Number(r.qty));
  }
  const bestSeller = [...byMenu.entries()].sort((a, b) => b[1] - a[1])[0];

  // เมนูกำไรดี/ต่ำสุด (จากต้นทุนสูตรปัจจุบัน)
  const ranked = (menuCosts ?? [])
    .filter((m: any) => Number(m.base_price) > 0)
    .map((m: any) => ({ name: m.name, ...calcMargin(m.base_price, m.unit_cost, m.target_margin_pct ?? store.target_margin_pct) }))
    .sort((a, b) => b.marginPct.comparedTo(a.marginPct));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">ภาพรวมวันนี้</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="ยอดขายวันนี้" value={fmtBaht(gross)} sub={`สุทธิ ${fmtBaht(net)}`} />
        <StatCard label="จำนวนออร์เดอร์" value={String(daily?.order_count ?? 0)} sub={`${fmtQty(pieces)} ชิ้น`} />
        <StatCard label="ต้นทุนขาย (COGS)" value={fmtBaht(cogs)} />
        <StatCard label="ค่าคอมแพลตฟอร์ม" value={fmtBaht(commission)} sub={`ค่าธรรมเนียมอื่น ${fmtBaht(otherFees)}`} />
        <StatCard label="กำไรขั้นต้น" value={fmtBaht(grossProfit)} tone={grossProfit.gte(0) ? 'good' : 'bad'} />
        <StatCard label="กำไรหลังค่าธรรมเนียม" value={fmtBaht(afterFees)} tone={afterFees.gte(0) ? 'good' : 'bad'} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/sales" className="btn-primary">➕ บันทึกขาย</Link>
        <Link href="/purchases" className="btn-ghost">🛒 เติมสต็อก</Link>
      </div>

      <div className="card space-y-2">
        <p className="font-semibold">🏆 สรุปเมนู</p>
        <p className="text-sm">ขายดีที่สุดวันนี้: <b>{bestSeller ? `${bestSeller[0]} (${bestSeller[1]} ชิ้น)` : 'ยังไม่มีข้อมูล'}</b></p>
        <p className="text-sm">กำไรดีที่สุด: <b>{ranked[0] ? `${ranked[0].name} — ${fmtPct(ranked[0].marginPct)}` : '—'}</b></p>
        <p className="text-sm">กำไรต่ำที่สุด: <b>{ranked.at(-1) ? `${ranked.at(-1)!.name} — ${fmtPct(ranked.at(-1)!.marginPct)}` : '—'}</b></p>
      </div>

      <AlertCenter items={notifications} />
    </div>
  );
}