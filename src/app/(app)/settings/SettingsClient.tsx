'use client';

import ListManager from '@/components/ListManager';
import DangerZone from '@/components/DangerZone';

export default function SettingsClient({ storeId }: { storeId: string }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-base font-bold">วัตถุดิบ</h2>
        <div className="space-y-3">
          <ListManager
            storeId={storeId}
            table="ingredient_categories"
            title="หมวดหมู่วัตถุดิบ"
            placeholder="เช่น ของสด, ของแห้ง"
            extra={{ is_packaging: false, sort_order: 99 }}
          />
          <ListManager
            storeId={storeId}
            table="base_units"
            title="หน่วยฐาน"
            placeholder="เช่น กรัม, แผ่น, ฟอง"
            scoped={false}
            hint="หน่วยฐานใช้ร่วมกันทุกร้าน"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold">ค่าใช้จ่าย</h2>
        <ListManager
          storeId={storeId}
          table="expense_categories"
          title="หมวดหมู่ค่าใช้จ่าย"
          placeholder="เช่น ค่าเช่า, ค่าแก๊ส"
        />
      </section>

      <DangerZone storeId={storeId} />
    </div>
  );
}