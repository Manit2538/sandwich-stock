'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


type Item = { id: string; name_snapshot: string; qty: number; unit_price: number };
type Order = {
  id: string;
  order_code: string;
  customer_name: string | null;
  customer_phone: string | null;
  note: string | null;
  total: number;
  status: string;
  created_at: string;
  customer_order_items: Item[];
};

const baht = (n: number) => `฿${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('customer_orders')
      .select('*, customer_order_items(*)')
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: true });

    if (error) console.error(error);
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000); // รีเฟรชทุก 10 วิ
    return () => clearInterval(t);
  }, [load]);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    const patch: Record<string, unknown> = { status };
    if (status === 'accepted') patch.accepted_at = new Date().toISOString();
    if (status === 'done') patch.done_at = new Date().toISOString();

    const { error } = await supabase.from('customer_orders').update(patch).eq('id', id);
    setBusy(null);
    if (error) return alert('อัปเดตไม่สำเร็จ: ' + error.message);
    load();
  }

  async function accept(id: string) {
  setBusy(id);
  const { error } = await supabase.rpc('accept_customer_order', { p_order_id: id });
  setBusy(null);
  if (error) return alert('รับออร์เดอร์ไม่สำเร็จ\n\n' + error.message);
  load();
  }


  const timeAgo = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'เมื่อสักครู่';
    if (m < 60) return `${m} นาทีที่แล้ว`;
    return `${Math.floor(m / 60)} ชม.ที่แล้ว`;
  };

  if (loading) return <div className="p-6 text-center">กำลังโหลด…</div>;

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">ออร์เดอร์จากลูกค้า</h1>
        <button onClick={load} className="rounded-lg border px-3 py-1.5 text-sm">
          รีเฟรช
        </button>
      </div>

      {orders.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-gray-500">
          ยังไม่มีออร์เดอร์เข้ามา
        </div>
      )}

      <div className="space-y-3">
        {orders.map((o) => (
          <div
            key={o.id}
            className={`rounded-xl border p-4 ${
              o.status === 'pending' ? 'border-orange-400' : 'border-green-500'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-bold">{o.order_code}</div>
                <div className="text-xs text-gray-500">{timeAgo(o.created_at)}</div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs ${
                  o.status === 'pending'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {o.status === 'pending' ? 'รอรับ' : 'กำลังทำ'}
              </span>
            </div>

            <div className="mt-2 text-sm">
              👤 {o.customer_name ?? '-'} · 📞 {o.customer_phone ?? '-'}
            </div>

            <div className="mt-2 space-y-1 border-t pt-2 text-sm">
              {o.customer_order_items.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <span>
                    {it.name_snapshot} <b>×{it.qty}</b>
                  </span>
                  <span>{baht(it.unit_price * it.qty)}</span>
                </div>
              ))}
            </div>

            {o.note && (
              <div className="mt-2 rounded bg-yellow-50 p-2 text-xs text-yellow-800">
                📝 {o.note}
              </div>
            )}

            <div className="mt-2 flex justify-between border-t pt-2 font-bold">
              <span>รวม</span>
              <span>{baht(o.total)}</span>
            </div>

            <div className="mt-3 flex gap-2">
              {o.status === 'pending' ? (
                <>
                  <button
                    disabled={busy === o.id}
                    onClick={() => accept(o.id)}
                    className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    รับออร์เดอร์
                  </button>
                  <button
                    disabled={busy === o.id}
                    onClick={() => confirm('ยกเลิกออร์เดอร์นี้?') && setStatus(o.id, 'cancelled')}
                    className="rounded-lg border px-4 py-2 text-sm text-red-600"
                  >
                    ยกเลิก
                  </button>
                </>
              ) : (
                <button
                  disabled={busy === o.id}
                  onClick={() => setStatus(o.id, 'done')}
                  className="flex-1 rounded-lg bg-gray-800 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  เสร็จแล้ว · ลูกค้ารับของ
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}