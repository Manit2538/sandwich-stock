import { requireStore } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import SettingsForm from './SettingsForm';
import { addSupplier } from './actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { storeId, store } = await requireStore();
  const supabase = await createClient();

  const [{ data: platforms }, { data: suppliers }] = await Promise.all([
    supabase.from('delivery_platforms').select('*').eq('store_id', storeId).order('code'),
    supabase.from('suppliers').select('*').eq('store_id', storeId).order('name'),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">ตั้งค่าร้าน</h1>

      <SettingsForm store={store} platforms={platforms ?? []} />

      <section className="card">
        <h2 className="mb-3 font-semibold">🏪 ร้านที่ซื้อของประจำ</h2>
        <ul className="mb-3 space-y-1 text-sm">
          {(suppliers ?? []).map((s: any) => (
            <li key={s.id}>• {s.name}{s.phone && ` — ${s.phone}`}</li>
          ))}
          {!suppliers?.length && <li className="text-stone-500">ยังไม่มีข้อมูล</li>}
        </ul>
        <form action={addSupplier} className="space-y-2">
          <input name="name" required placeholder="ชื่อร้าน เช่น แม็คโคร สาขา…" />
          <input name="phone" placeholder="เบอร์โทร (ไม่บังคับ)" inputMode="tel" />
          <button className="btn-ghost w-full">เพิ่มร้าน</button>
        </form>
      </section>

      <section className="card text-sm text-stone-500">
        <p className="font-semibold text-stone-700 dark:text-stone-300">ℹ️ หมายเหตุการเชื่อมต่อ</p>
        <p className="mt-1">
          ระบบยัง<b>ไม่เชื่อมต่อ API</b> ของ GrabFood / LINE MAN / ShopeeFood
          เนื่องจากต้องมีเอกสารและ API credentials จากผู้ให้บริการ —
          ขณะนี้ให้บันทึกยอดขายด้วยตนเองในหน้า “บันทึกยอดขาย”
        </p>
        <p className="mt-2">🔄 ซิงก์ออร์เดอร์อัตโนมัติ — <span className="wip">อยู่ระหว่างพัฒนา</span></p>
      </section>
    </div>
  );
}