'use client';
import { useActionState, useState, useMemo } from 'react';
import { receiveStock } from './actions';
import { costPerBaseUnit } from '@/lib/units';
import { fmtBaht } from '@/lib/format';

export default function PurchaseForm({ ingredients, suppliers, defaultIngredient, today }: {
  ingredients: any[]; suppliers: any[]; defaultIngredient: string; today: string;
}) {
  const [state, action, pending] = useActionState(receiveStock, null as any);
  const [ingId, setIngId] = useState(defaultIngredient);
  const [pq, setPq] = useState('1');
  const [upp, setUpp] = useState('');
  const [price, setPrice] = useState('');

  const selected = ingredients.find((i) => i.id === ingId);

  const preview = useMemo(() => {
    try {
      if (!pq || !upp || !price) return null;
      return costPerBaseUnit({ totalPrice: price, purchaseQty: pq, unitsPerPack: upp });
    } catch { return null; }
  }, [pq, upp, price]);

  return (
    <form action={action} className="card space-y-3">
      <div>
        <label htmlFor="ingredient_id">วัตถุดิบ *</label>
        <select id="ingredient_id" name="ingredient_id" required value={ingId} onChange={(e) => setIngId(e.target.value)}>
          <option value="">— เลือกวัตถุดิบ —</option>
          {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.units?.name_th})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="received_at">วันที่ซื้อ *</label>
          <input id="received_at" name="received_at" type="date" required defaultValue={today} />
        </div>
        <div>
          <label htmlFor="expiry_date">วันหมดอายุ</label>
          <input id="expiry_date" name="expiry_date" type="date" />
        </div>
        <div>
          <label htmlFor="purchase_qty">จำนวนที่ซื้อ *</label>
          <input id="purchase_qty" name="purchase_qty" type="number" step="0.01" min="0.01" required
            inputMode="decimal" value={pq} onChange={(e) => setPq(e.target.value)} placeholder="เช่น 1 (แพ็ก)" />
        </div>
        <div>
          <label htmlFor="units_per_pack">หน่วยย่อยต่อแพ็ก *</label>
          <input id="units_per_pack" name="units_per_pack" type="number" step="0.01" min="0.01" required
            inputMode="decimal" value={upp} onChange={(e) => setUpp(e.target.value)}
            placeholder={selected ? `เช่น 20 (${selected.units?.name_th})` : 'เช่น 20'} />
        </div>
      </div>

      <div>
        <label htmlFor="total_price">ราคาที่จ่ายจริงทั้งหมด (฿) *</label>
        <input id="total_price" name="total_price" type="number" step="0.01" min="0" required
          inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="เช่น 120" />
      </div>

      {preview && (
        <div className="rounded-xl bg-green-50 p-3 text-sm dark:bg-green-950/40">
          🧮 ต้นทุนที่คำนวณได้: <b>{fmtBaht(preview)}</b> ต่อ {selected?.units?.name_th ?? 'หน่วย'}
          <p className="mt-1 text-xs text-stone-500">ระบบจะรวมกับสต็อกเดิมเป็นต้นทุนเฉลี่ยถ่วงน้ำหนักให้อัตโนมัติ</p>
        </div>
      )}

      <div>
        <label htmlFor="supplier_id">ร้านที่ซื้อ</label>
        <select id="supplier_id" name="supplier_id">
          <option value="">— ไม่ระบุ —</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="receipt">รูปใบเสร็จ (ไม่บังคับ)</label>
        <input id="receipt" name="receipt" type="file" accept="image/*" capture="environment" className="py-2" />
      </div>

      <div>
        <label htmlFor="note">หมายเหตุ</label>
        <input id="note" name="note" placeholder="เช่น ลดราคาช่วงโปร" />
      </div>

      {state?.error && <p className="text-sm text-danger">❌ {state.error}</p>}
      {state?.ok && <p className="text-sm text-ok">✅ {state.ok}</p>}

      <button className="btn-primary w-full" disabled={pending}>
        {pending ? 'กำลังบันทึก…' : '💾 บันทึกซื้อของและเติมสต็อก'}
      </button>
    </form>
  );
}