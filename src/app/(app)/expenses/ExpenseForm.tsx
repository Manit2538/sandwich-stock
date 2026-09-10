'use client';
import { useActionState } from 'react';
import { addExpense } from './actions';

export default function ExpenseForm({ categories, today }: { categories: any[]; today: string }) {
  const [state, action, pending] = useActionState(addExpense, null as any);
  return (
    <details className="card" open>
      <summary className="cursor-pointer font-semibold text-brand">➕ บันทึกค่าใช้จ่าย</summary>
      <form action={action} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="expense_date">วันที่ *</label>
            <input id="expense_date" name="expense_date" type="date" required defaultValue={today} />
          </div>
          <div>
            <label htmlFor="amount">จำนวนเงิน (฿) *</label>
            <input id="amount" name="amount" type="number" step="0.01" min="0" required inputMode="decimal" />
          </div>
          <div>
            <label htmlFor="category_id">หมวดหมู่</label>
            <select id="category_id" name="category_id">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="kind">ประเภท</label>
            <select id="kind" name="kind"><option value="variable">แปรผัน</option><option value="fixed">คงที่</option></select>
          </div>
        </div>
        <div>
          <label htmlFor="payment_method">ช่องทางชำระเงิน</label>
          <select id="payment_method" name="payment_method">
            <option>เงินสด</option><option>โอน/พร้อมเพย์</option><option>บัตรเครดิต</option><option>อื่น ๆ</option>
          </select>
        </div>
        <div>
          <label htmlFor="receipt">รูปใบเสร็จ</label>
          <input id="receipt" name="receipt" type="file" accept="image/*" capture="environment" className="py-2" />
        </div>
        <div>
          <label htmlFor="note">หมายเหตุ</label>
          <input id="note" name="note" />
        </div>
        {state?.error && <p className="text-sm text-danger">❌ {state.error}</p>}
        {state?.ok && <p className="text-sm text-ok">✅ {state.ok}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึก'}</button>
      </form>
    </details>
  );
}