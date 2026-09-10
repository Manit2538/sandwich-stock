'use client';
import { useActionState, useState, useMemo } from 'react';
import { postSale } from './actions';
import { calcOrderTotals } from '@/lib/profit';
import { fmtBaht } from '@/lib/format';

export default function SaleForm({ menus, platforms, priceMap, nowLocal }: {
  menus: any[]; platforms: any[]; priceMap: Record<string, Record<string, string>>; nowLocal: string;
}) {
  const [state, action, pending] = useActionState(postSale, null as any);
  const [platformId, setPlatformId] = useState(platforms[0]?.id ?? '');
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState('0');
  const [otherFees, setOtherFees] = useState('0');

  const platform = platforms.find((p) => p.id === platformId);

  const priceOf = (menuId: string) =>
    priceMap[menuId]?.[platformId] ?? menus.find((m) => m.menu_item_id === menuId)?.base_price ?? '0';

  const totals = useMemo(() => calcOrderTotals({
    lines: Object.entries(qtys).filter(([, q]) => q > 0).map(([id, q]) => ({
      qty: q, unitPrice: priceOf(id),
      unitCogs: menus.find((m) => m.menu_item_id === id)?.unit_cost ?? 0,
    })),
    shopDiscount: discount || 0,
    commissionPct: platform?.commission_pct ?? 0,
    otherFees: otherFees || 0,
  }), [qtys, platformId, discount, otherFees]);

  const bump = (id: string, delta: number) =>
    setQtys((s) => ({ ...s, [id]: Math.max(0, (s[id] ?? 0) + delta) }));

  return (
    <form action={action} className="card space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="occurred_at">วันเวลา *</label>
          <input id="occurred_at" name="occurred_at" type="datetime-local" required defaultValue={nowLocal} />
        </div>
        <div>
          <label htmlFor="platform_id">ช่องทางขาย *</label>
          <select id="platform_id" name="platform_id" required value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
            {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">เมนูที่ขาย</p>
        {menus.map((m) => (
          <div key={m.menu_item_id} className="flex items-center gap-2 rounded-xl bg-stone-50 p-2 dark:bg-stone-800/50">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.name}</p>
              <p className="text-xs text-stone-500">{fmtBaht(priceOf(m.menu_item_id))}</p>
            </div>
            <input type="hidden" name={`price_${m.menu_item_id}`} value={priceOf(m.menu_item_id)} />
            <button type="button" onClick={() => bump(m.menu_item_id, -1)}
              className="h-11 w-11 rounded-xl border border-stone-300 text-xl dark:border-stone-700" aria-label="ลด">−</button>
            <input name={`qty_${m.menu_item_id}`} type="number" min="0" step="1" inputMode="numeric"
              className="w-16 text-center" value={qtys[m.menu_item_id] ?? 0}
              onChange={(e) => setQtys((s) => ({ ...s, [m.menu_item_id]: Number(e.target.value) }))} />
            <button type="button" onClick={() => bump(m.menu_item_id, 1)}
              className="h-11 w-11 rounded-xl bg-brand text-xl text-white" aria-label="เพิ่ม">+</button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="shop_discount">ส่วนลดที่ร้านออก (฿)</label>
          <input id="shop_discount" name="shop_discount" type="number" step="0.01" min="0" inputMode="decimal"
            value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <div>
          <label htmlFor="other_fees">ค่าธรรมเนียมอื่น (฿)</label>
          <input id="other_fees" name="other_fees" type="number" step="0.01" min="0" inputMode="decimal"
            value={otherFees} onChange={(e) => setOtherFees(e.target.value)} />
        </div>
      </div>

      <div>
        <label htmlFor="commission_amount">
          ค่าคอมมิชชัน (฿) — เว้นว่างเพื่อคำนวณจาก {platform?.commission_pct ?? 0}% อัตโนมัติ
        </label>
        <input id="commission_amount" name="commission_amount" type="number" step="0.01" min="0" inputMode="decimal" placeholder="อัตโนมัติ" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="status">สถานะ</label>
          <select id="status" name="status">
            <option value="completed">สำเร็จ (ตัดสต็อก)</option>
            <option value="cancelled">ยกเลิก (ไม่ตัดสต็อก)</option>
            <option value="refunded">คืนเงิน</option>
          </select>
        </div>
        <div>
          <label htmlFor="order_no">เลขออร์เดอร์</label>
          <input id="order_no" name="order_no" placeholder="ไม่บังคับ" />
        </div>
      </div>

      <div>
        <label htmlFor="note">หมายเหตุ</label>
        <input id="note" name="note" placeholder="ไม่บังคับ" />
      </div>

      <div className="rounded-xl bg-stone-100 p-3 text-sm dark:bg-stone-800">
        <div className="flex justify-between"><span>ยอดขายรวม</span><b className="tabular-nums">{fmtBaht(totals.grossSales)}</b></div>
        <div className="flex justify-between"><span>ยอดขายสุทธิ</span><b className="tabular-nums">{fmtBaht(totals.netSales)}</b></div>
        <div className="flex justify-between"><span>ต้นทุนโดยประมาณ</span><span className="tabular-nums">{fmtBaht(totals.cogs)}</span></div>
        <div className="flex justify-between"><span>ค่าคอมมิชชัน</span><span className="tabular-nums">−{fmtBaht(totals.commission)}</span></div>
        <div className="mt-1 flex justify-between border-t border-stone-300 pt-1 dark:border-stone-700">
          <span className="font-semibold">กำไรหลังค่าธรรมเนียม</span>
          <b className={`tabular-nums ${totals.profitAfterFees.gte(0) ? 'text-ok' : 'text-danger'}`}>{fmtBaht(totals.profitAfterFees)}</b>
        </div>
        <p className="mt-1 text-xs text-stone-500">* ต้นทุนจริงจะคำนวณจาก lot ที่ถูกตัดจริงตอนบันทึก</p>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="force" className="h-5 w-5" />
        <span className="text-sm">⚠️ ยืนยันขายแม้สต็อกไม่พอ (ยอมให้สต็อกติดลบ)</span>
      </label>

      {state?.error && <p className="whitespace-pre-line rounded-xl bg-red-50 p-3 text-sm text-danger dark:bg-red-950/40">❌ {state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-green-50 p-3 text-sm text-ok dark:bg-green-950/40">✅ {state.ok}</p>}

      <button className="btn-primary w-full text-lg" disabled={pending}>
        {pending ? 'กำลังบันทึก…' : '💾 บันทึกการขาย'}
      </button>
    </form>
  );
}