'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import ReceiptButton from '@/components/ReceiptButton'; // (ปรับ path ให้ตรงกับที่โปรเจกต์คุณเก็บไฟล์ ReceiptButton ไว้ครับ)


const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

type OrderItem = {
  id: string;
  menu_item_id?: string; // เพิ่มบรรทัดนี้
  name_snapshot: string;
  qty: number;
  unit_price: number;
};


type Order = {
  id: string;
  store_id: string; // <-- เพิ่มบรรทัดนี้เข้าไปครับ
  order_code: string;
  customer_name: string;
  customer_phone: string;
  note: string | null;
  total: number;
  status: string;
  department: string | null;
  created_at: string;
  customer_order_items: OrderItem[];
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'takeaway' | 'company'>('takeaway');

  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  async function fetchOrders() {
    const { data: store } = await sb.from('stores').select('id').limit(1).single();
    if (!store) {
      setLoading(false);
      return;
    }

    const { data, error } = await sb
      .from('customer_orders')
      .select(`
        id, order_code, customer_name, customer_phone, note, total, status, department, created_at,
        customer_order_items ( id, name_snapshot, qty, unit_price )
      `)
      .eq('store_id', store.id)
      .not('status', 'in', '("completed","cancelled","done")')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchOrders();
    const channel = sb
      .channel('kitchen_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_orders' },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

    async function updateStatus(order: Order, newStatus: string) {
    // ตรงนี้คือจุดที่เราจะเพิ่มโค้ดซิงค์ยอดขายครับ
    if (newStatus === 'completed') {
      try {
        let totalCogs = 0;
        if (order.customer_order_items) {
          for (const item of order.customer_order_items) {
            totalCogs += (item.qty || 0) * 0;
          }
        }

        const { data: saleOrder, error: saleErr } = await sb
          .from('sales_orders')
          .insert({
            store_id: order.store_id,
            order_no: `QR-${order.order_code}`,
            occurred_at: new Date().toISOString(),
            status: 'completed',
            gross_sales: order.total,
            net_sales: order.total,
            cogs: totalCogs,
            stock_deducted: true,
            note: `[สั่งผ่าน QR] ${order.department ? 'ส่ง ' + order.department : 'รับที่ร้าน'} - คุณ ${order.customer_name} (${order.customer_phone}) ${order.note ? '/ หมายเหตุ: ' + order.note : ''}`,
          })
          .select('id')
          .single();

        if (!saleErr && saleOrder && order.customer_order_items) {
          await sb.from('sales_order_items').insert(
            order.customer_order_items.map((item) => ({
              order_id: saleOrder.id,
              menu_item_id: item.menu_item_id || null,
              qty: item.qty,
              unit_price: item.unit_price || 0,
            }))
          );
        }
      } catch (err) {
        console.error('Sync to sales error:', err);
      }
    }

    const { error } = await sb
      .from('customer_orders')
      .update({ status: newStatus })
      .eq('id', order.id);

    if (error) {
      alert('อัปเดตสถานะไม่สำเร็จ: ' + error.message);
    } else {
      fetchOrders();
    }
  }

  function handlePrint(order: Order) {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
    }, 100);
  }

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'company') return Boolean(o.department && o.department.trim() !== '');
    return !o.department || o.department.trim() === '';
  });

  const baht = (n: number) => `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="p-8 text-center text-gray-400">กำลังโหลดออร์เดอร์…</div>;

  return (
    <div className="mx-auto max-w-4xl p-4 pb-24">
      {/* ── ส่วนสำหรับพิมพ์ใบเสร็จ ── */}
      {printingOrder && (
        <div id="receipt-print-area" className="hidden print:block text-black bg-white p-4 font-sans text-xs">
          <div className="text-center font-bold text-sm mb-1">MS Sandwich</div>
          <div className="text-center text-[10px] mb-3">
            {printingOrder.department ? `🏢 ส่ง: ${printingOrder.department}` : '🥡 สั่งกลับบ้าน'}
          </div>
          <div className="border-b border-dashed border-black pb-2 mb-2">
            <div>รหัสออร์เดอร์: <span className="font-bold text-sm">#{printingOrder.order_code}</span></div>
            <div>เวลา: {new Date(printingOrder.created_at).toLocaleString('th-TH')}</div>
            <div>ลูกค้า: {printingOrder.customer_name} ({printingOrder.customer_phone})</div>
          </div>

          <div className="space-y-1 mb-2">
            {printingOrder.customer_order_items?.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.name_snapshot} x{item.qty}</span>
                <span>{baht((item.unit_price || 0) * item.qty)}</span>
              </div>
            ))}
          </div>

          {printingOrder.note && (
            <div className="border-t border-dashed border-black pt-1 mb-2 text-[10px]">
              <b>หมายเหตุ:</b> {printingOrder.note}
            </div>
          )}

          <div className="border-t border-dashed border-black pt-2 flex justify-between font-bold">
            <span>ยอดรวมทั้งสิ้น</span>
            <span>{baht(printingOrder.total)}</span>
          </div>
          <div className="text-center mt-4 text-[10px]">*** ขอบคุณที่ใช้บริการ ***</div>
        </div>
      )}

      {/* ── หน้าจอหลัก ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <h1 className="text-xl font-bold text-white">👨‍🍳 หน้าจัดการห้องครัว</h1>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('takeaway')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'takeaway'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🥡 สั่งกลับบ้าน ({orders.filter(o => !o.department || o.department.trim() === '').length})
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'company'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🏢 ขายในบริษัท ({orders.filter(o => Boolean(o.department && o.department.trim() !== '')).length})
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center text-gray-500 print:hidden">
          ไม่มีออร์เดอร์ค้างในระบบตอนนี้ครับ 🎉
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 print:hidden">
          {filteredOrders.map((o) => (
            <div
              key={o.id}
              className={`flex flex-col justify-between rounded-xl border bg-gray-900 p-4 shadow-md ${
                o.department ? 'border-orange-500/50' : 'border-gray-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div>
                    <span className="text-lg font-bold tracking-wider text-white">
                      #{o.order_code}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {new Date(o.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </span>
                  </div>

                  {o.department ? (
                    <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-400 border border-orange-500/30">
                      🏢 ส่ง: {o.department}
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400 border border-green-500/30">
                      🥡 รับที่ร้าน
                    </span>
                  )}
                </div>

                <div className="my-3 space-y-1 text-sm">
                  <div className="font-semibold text-gray-200">
                    คุณ {o.customer_name} <span className="text-xs text-gray-400">({o.customer_phone})</span>
                  </div>
                  {o.note && (
                    <div className="rounded bg-red-500/10 p-2 text-xs text-red-300">
                      <span className="font-bold">หมายเหตุ:</span> {o.note}
                    </div>
                  )}
                </div>

                <div className="my-3 divide-y divide-gray-800/60 rounded-lg bg-gray-950 p-3">
                  {o.customer_order_items?.map((item) => (
                    <div key={item.id} className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-300">• {item.name_snapshot}</span>
                      <span className="font-bold text-white">× {item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
                  <span>ยอดรวมทั้งสิ้น</span>
                  <span className="text-sm font-bold text-green-400">{baht(o.total)}</span>
                </div>

                {/* ── ปุ่มกด (ใส่ปุ่มปริ้นท์กลับมาแล้วครับ) ── */}
                <div className="grid grid-cols-3 gap-1.5">
                  <ReceiptButton
  storeName="MS Sandwich"
  orderNo={`#${o.order_code}`}
  platform={o.department ? `ส่ง: ${o.department}` : 'รับที่ร้าน'}
  datetime={new Date(o.created_at).toLocaleString('th-TH')}
  items={(o.customer_order_items ?? []).map((it) => ({
    name: it.name_snapshot || '-',
    qty: Number(it.qty ?? 0),
    price: Number(it.unit_price ?? 0),
  }))}
  grossSales={Number(o.total ?? 0)}
  discount={0}
  netSales={Number(o.total ?? 0)}
  note={`ลูกค้า: ${o.customer_name} (${o.customer_phone})${o.note ? ' / ' + o.note : ''}`}
/>
                  <button
  onClick={() => updateStatus(o, 'cooking')}
  disabled={o.status === 'cooking'}
  className="rounded-lg bg-yellow-600/20 py-2 text-xs font-medium text-yellow-400 border border-yellow-600/30 disabled:opacity-40"
>
  {o.status === 'cooking' ? '🔥 ทำอยู่' : 'เริ่มทำ'}
</button>
<button
  onClick={() => updateStatus(o, 'completed')}
  className="rounded-lg bg-green-600 py-2 text-xs font-semibold text-white shadow"
>
  {o.department ? '🚀 ส่งแล้ว' : '✅ เสร็จ'}
</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area, #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm;
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}