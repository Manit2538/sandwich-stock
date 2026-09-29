'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type JobKey = 'sales' | 'stockHistory' | 'stockZero';

const JOBS: Record<JobKey, { label: string; desc: string; word: string }> = {
  sales: {
    label: 'ล้างข้อมูลยอดขาย',
    desc: 'ลบออร์เดอร์และรายการขายทั้งหมด (ไม่คืนสต็อก)',
    word: 'ล้างยอดขาย',
  },
  stockHistory: {
    label: 'ล้างประวัติสต็อก',
    desc: 'ลบประวัติการเติม/ตัดสต็อก แต่จำนวนคงเหลือไม่เปลี่ยน',
    word: 'ล้างประวัติ',
  },
  stockZero: {
    label: 'รีเซ็ตสต็อกเป็น 0',
    desc: 'เซ็ตวัตถุดิบทุกตัวเหลือ 0 และลบประวัติทั้งหมด',
    word: 'รีเซ็ตสต็อก',
  },
};

export default function DangerZone({ storeId }: { storeId: string }) {
  const [confirmText, setConfirmText] = useState('');
  const [pending, setPending] = useState<JobKey | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!pending) return;
    const job = JOBS[pending];
    if (confirmText.trim() !== job.word) {
      alert(`พิมพ์ "${job.word}" ให้ถูกต้อง`);
      return;
    }

    setBusy(true);
    const { data, error } =
      pending === 'sales'
        ? await sb.rpc('reset_sales_data', { p_store_id: storeId })
        : await sb.rpc('reset_stock_data', {
            p_store_id: storeId,
            p_mode: pending === 'stockZero' ? 'zero' : 'history',
          });
    setBusy(false);

    if (error) {
      alert('ไม่สำเร็จ: ' + error.message);
      return;
    }

    alert(`เรียบร้อย — ลบไป ${data ?? 0} รายการ`);
    setPending(null);
    setConfirmText('');
  }

  return (
    <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4">
      <h3 className="text-sm font-semibold text-red-500">โซนอันตราย</h3>
      <p className="mt-1 text-xs text-stone-500">การกระทำเหล่านี้ย้อนกลับไม่ได้</p>

      <div className="mt-3 space-y-2">
        {(Object.keys(JOBS) as JobKey[]).map((k) => {
          const job = JOBS[k];
          const open = pending === k;

          return (
            <div key={k} className="rounded-lg bg-black/5 p-2.5 dark:bg-black/20">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm">{job.label}</div>
                  <div className="text-xs text-stone-500">{job.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPending(open ? null : k);
                    setConfirmText('');
                  }}
                  className="shrink-0 rounded-md border border-red-500/50 px-3 py-1 text-xs text-red-500 hover:bg-red-500/10"
                >
                  {open ? 'ยกเลิก' : 'ล้าง'}
                </button>
              </div>

              {open && (
                <div className="mt-2 border-t border-red-500/20 pt-2">
                  <p className="text-xs text-stone-500">
                    พิมพ์ <b className="text-red-500">{job.word}</b> เพื่อยืนยัน
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      autoFocus
                      className="flex-1 rounded-md border border-stone-400 bg-transparent px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={run}
                      disabled={busy || confirmText.trim() !== job.word}
                      className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-30"
                    >
                      {busy ? '...' : 'ยืนยัน'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}