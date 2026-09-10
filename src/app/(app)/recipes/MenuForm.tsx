'use client';
import { useActionState } from 'react';
import { createMenuItem } from './actions';

export default function MenuForm() {
  const [state, action, pending] = useActionState(createMenuItem, null as any);
  return (
    <details className="card">
      <summary className="cursor-pointer font-semibold text-brand">➕ เพิ่มเมนูใหม่</summary>
      <form action={action} className="mt-4 space-y-3">
        <div>
          <label htmlFor="name">ชื่อเมนู *</label>
          <input id="name" name="name" required placeholder="เช่น แซนวิชปูอัดชีส" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="base_price">ราคาขายหน้าร้าน (฿)</label>
            <input id="base_price" name="base_price" type="number" step="0.01" min="0" defaultValue="59" inputMode="decimal" />
          </div>
          <div>
            <label htmlFor="target_margin_pct">เป้ากำไรขั้นต่ำ (%)</label>
            <input id="target_margin_pct" name="target_margin_pct" type="number" step="0.1" min="0" max="99" defaultValue="50" inputMode="decimal" />
          </div>
        </div>
        {state?.error && <p className="text-sm text-danger">❌ {state.error}</p>}
        {state?.ok && <p className="text-sm text-ok">✅ {state.ok}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'สร้างเมนู'}</button>
        <p className="text-xs text-stone-500">
          🖼️ อัปโหลดรูปเมนู — <span className="wip">อยู่ระหว่างพัฒนา</span>
        </p>
      </form>
    </details>
  );
}