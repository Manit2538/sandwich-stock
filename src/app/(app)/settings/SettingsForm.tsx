'use client';
import { useActionState } from 'react';
import { updateStore } from './actions';

export default function SettingsForm({ store, platforms }: { store: any; platforms: any[] }) {
  const [state, action, pending] = useActionState(updateStore, null as any);
  return (
    <form action={action} className="card space-y-3">
      <div>
        <label htmlFor="name">ชื่อร้าน</label>
        <input id="name" name="name" defaultValue={store.name} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="target_margin_pct">เป้ากำไรขั้นต่ำ (%)</label>
          <input id="target_margin_pct" name="target_margin_pct" type="number" step="0.1" min="0" max="99"
            defaultValue={store.target_margin_pct} inputMode="decimal" />
        </div>
        <div>
          <label htmlFor="cost_spike_pct">เตือนต้นทุนพุ่งเกิน (%)</label>
          <input id="cost_spike_pct" name="cost_spike_pct" type="number" step="0.1" min="0"
            defaultValue={store.cost_spike_pct} inputMode="decimal" />
        </div>
        <div>
          <label htmlFor="expiry_urgent_days">เตือนหมดอายุด่วน (วัน)</label>
          <input id="expiry_urgent_days" name="expiry_urgent_days" type="number" min="1" defaultValue={store.expiry_urgent_days} />
        </div>
        <div>
          <label htmlFor="expiry_warn_days">เตือนหมดอายุล่วงหน้า (วัน)</label>
          <input id="expiry_warn_days" name="expiry_warn_days" type="number" min="1" defaultValue={store.expiry_warn_days} />
        </div>
      </div>

      <p className="pt-2 text-sm font-semibold">ค่าคอมมิชชันแต่ละแพลตฟอร์ม (%)</p>
      {platforms.map((p) => (
        <div key={p.id}>
          <label htmlFor={`comm_${p.id}`}>{p.name}</label>
          <input id={`comm_${p.id}`} name={`comm_${p.id}`} type="number" step="0.1" min="0" max="100"
            defaultValue={p.commission_pct} inputMode="decimal" />
        </div>
      ))}

      {state?.error && <p className="text-sm text-danger">❌ {state.error}</p>}
      {state?.ok && <p className="text-sm text-ok">✅ {state.ok}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}</button>
    </form>
  );
}