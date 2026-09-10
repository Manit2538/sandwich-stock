'use client';
import { useActionState } from 'react';
import { createIngredient } from './actions';

export default function IngredientForm({ units, categories, suppliers }: {
  units: any[]; categories: any[]; suppliers: any[];
}) {
  const [state, action, pending] = useActionState(createIngredient, null as any);

  return (
    <details className="card">
      <summary className="cursor-pointer font-semibold text-brand">➕ เพิ่มวัตถุดิบใหม่</summary>
      <form action={action} className="mt-4 space-y-3">
        <div>
          <label htmlFor="name">ชื่อวัตถุดิบ *</label>
          <input id="name" name="name" required placeholder="เช่น ปูอัด" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="category_id">หมวดหมู่</label>
            <select id="category_id" name="category_id">
              <option value="">— เลือก —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="base_unit_id">หน่วยฐาน *</label>
            <select id="base_unit_id" name="base_unit_id" required>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name_th}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="reorder_point">จุดสั่งซื้อใหม่</label>
            <input id="reorder_point" name="reorder_point" type="number" step="0.01" min="0" defaultValue="0" inputMode="decimal" />
          </div>
          <div>
            <label htmlFor="target_stock">สต็อกเป้าหมาย</label>
            <input id="target_stock" name="target_stock" type="number" step="0.01" min="0" defaultValue="0" inputMode="decimal" />
          </div>
        </div>
        <div>
          <label htmlFor="supplier_id">ร้านที่ซื้อประจำ</label>
          <select id="supplier_id" name="supplier_id">
            <option value="">— ไม่ระบุ —</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="note">หมายเหตุ</label>
          <textarea id="note" name="note" rows={2} />
        </div>

        {state?.error && <p className="text-sm text-danger">❌ {state.error}</p>}
        {state?.ok && <p className="text-sm text-ok">✅ {state.ok}</p>}

        <button className="btn-primary w-full" disabled={pending}>
          {pending ? 'กำลังบันทึก…' : 'บันทึกวัตถุดิบ'}
        </button>
        <p className="text-xs text-stone-500">
          ℹ️ ต้นทุนต่อหน่วยจะคำนวณอัตโนมัติเมื่อคุณบันทึกการซื้อในหน้า “ซื้อของ / เติมสต็อก”
        </p>
      </form>
    </details>
  );
}