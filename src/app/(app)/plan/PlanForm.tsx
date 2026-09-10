'use client';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { savePlan } from './actions';

export default function PlanForm({ date, menus, existing }: {
  date: string; menus: any[]; existing: { menuItemId: string; plannedQty: string }[];
}) {
  const [state, action, pending] = useActionState(savePlan, null as any);
  const router = useRouter();
  const map = new Map(existing.map((e) => [e.menuItemId, e.plannedQty]));

  return (
    <form action={action} className="card space-y-3">
      <div>
        <label htmlFor="plan_date">วันที่จะขาย</label>
        <input id="plan_date" name="plan_date" type="date" defaultValue={date}
          onChange={(e) => router.push(`/plan?date=${e.target.value}`)} />
      </div>

      <p className="text-sm font-semibold">จำนวนที่คาดว่าจะขาย</p>
      {menus.map((m) => (
        <div key={m.menu_item_id} className="flex items-center gap-3">
          <label htmlFor={`qty_${m.menu_item_id}`} className="mb-0 flex-1 text-sm">{m.name}</label>
          <input id={`qty_${m.menu_item_id}`} name={`qty_${m.menu_item_id}`} type="number" min="0" step="1"
            inputMode="numeric" className="w-24 text-center"
            defaultValue={map.get(m.menu_item_id) ? Number(map.get(m.menu_item_id)) : ''} placeholder="0" />
          <span className="text-sm text-stone-500">ชิ้น</span>
        </div>
      ))}

      {state?.error && <p className="text-sm text-danger">❌ {state.error}</p>}
      {state?.ok && <p className="text-sm text-ok">✅ {state.ok}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? 'กำลังคำนวณ…' : '🧮 คำนวณของที่ต้องใช้'}
      </button>
    </form>
  );
}