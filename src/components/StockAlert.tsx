'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Alert = {
  id: string;
  name: string;
  qty_on_hand: number;
  reorder_point: number;
  stock_status: 'out' | 'low' | 'ok';
};

export default function StockAlert({ storeId }: { storeId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await sb
      .from('ingredient_alerts')
      .select('*')
      .eq('store_id', storeId)
      .in('stock_status', ['out', 'low'])
      .order('qty_on_hand');
    setAlerts((data ?? []) as Alert[]);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [storeId]);

  async function restock(id: string, qty: number) {
    if (!qty || qty <= 0) return alert('กรุณาใส่จำนวนที่มากกว่า 0');
    setSaving(true);
    const { error } = await sb.rpc('restock_ingredient', {
      p_ingredient_id: id,
      p_qty: qty,
      p_note: 'เติมจากหน้าร้าน',
    });
    setSaving(false);

    if (error) return alert('เติมไม่สำเร็จ: ' + error.message);

    setEditing(null);
    setAmount('');
    await load();
  }

  if (alerts.length === 0) return null;

  const outCount = alerts.filter((a) => a.stock_status === 'out').length;

  return (
    <div className="mb-4 rounded-xl border border-orange-500/40 bg-orange-500/10 p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-orange-300">
          ⚠️ วัตถุดิบต้องเติม {alerts.length} รายการ
          {outCount > 0 && (
            <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
              หมดแล้ว {outCount}
            </span>
          )}
        </span>
        <span className="text-xs text-orange-300">{open ? '▲' : '▼'}</span>
      </button>

      <a
  href={`/stock/${storeId}`}
  className="mt-2 block rounded-md bg-white/5 py-1.5 text-center text-xs text-orange-300 hover:bg-white/10"
>
  จัดการวัตถุดิบทั้งหมด →
</a>


      {open && (
        <div className="mt-3 space-y-1.5">
          {alerts.map((a) => {
            const isOut = a.stock_status === 'out';
            const color = isOut ? 'text-red-400' : 'text-orange-300';

            return (
              <div key={a.id} className="rounded-lg bg-black/20 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm ${color}`}>{a.name}</span>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      เหลือ <b className={color}>{a.qty_on_hand}</b> / เตือนที่ {a.reorder_point}
                    </span>
                    <button
                      onClick={() => {
                        setEditing(editing === a.id ? null : a.id);
                        setAmount('');
                      }}
                      className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                    >
                      {editing === a.id ? 'ปิด' : '+ เติม'}
                    </button>
                  </div>
                </div>

                {editing === a.id && (
                  <div className="mt-2 border-t border-white/10 pt-2">
                    <div className="flex gap-1.5">
                      {[10, 20, 50, 100].map((n) => (
                        <button
                          key={n}
                          onClick={() => restock(a.id, n)}
                          disabled={saving}
                          className="flex-1 rounded-md border border-gray-600 py-1 text-xs text-gray-300 hover:bg-white/10 disabled:opacity-40"
                        >
                          +{n}
                        </button>
                      ))}
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') restock(a.id, Number(amount));
                        }}
                        placeholder="ระบุจำนวนเอง"
                        autoFocus
                        className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-2 py-1 text-xs text-white placeholder-gray-500"
                      />
                      <button
                        onClick={() => restock(a.id, Number(amount))}
                        disabled={saving || !amount}
                        className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
                      >
                        {saving ? '...' : 'บันทึก'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}