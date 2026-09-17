'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false, // ป้องกันการดึง Session เก่ามาใช้
    },
  }
);



const STOREFRONT_PLATFORM = '28bc47ec-9564-4741-baa0-c634817998b8';


type Menu = { id: string; name: string; price: number };

export default function OrderPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [logoUrl, setLogoUrl] = useState('');
  const [storeName, setStoreName] = useState('');
  const [menus, setMenus] = useState<Menu[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: store } = await sb.from('stores').select('name').eq('id', storeId).single();
      setStoreName(store?.name ?? 'ร้านอาหาร');

      const { data: items } = await sb
  .from('menu_items')
  .select('id, name, is_active, menu_prices(price, platform_id)')
  .eq('store_id', storeId)
  .order('name');
  

setMenus(
  (items ?? [])
    .filter((m: any) => m.is_active !== false)
    .map((m: any) => {
      const row = (m.menu_prices ?? []).find(
        (p: any) => p.platform_id === STOREFRONT_PLATFORM
      );
      return { id: m.id, name: m.name, price: Number(row?.price ?? 0) };
    })
    .filter((m) => m.price > 0)
);
      setLoading(false);
    })();
  }, [storeId]);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const m = menus.find((x) => x.id === id);
          return m ? { ...m, qty } : null;
        })
        .filter(Boolean) as (Menu & { qty: number })[],
    [cart, menus]
  );

  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const baht = (n: number) => `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  async function submit() {
    if (!lines.length) return alert('กรุณาเลือกเมนูก่อน');
    if (!name.trim()) return alert('กรุณากรอกชื่อ');
    if (!/^0\d{8,9}$/.test(phone.trim())) return alert('เบอร์โทรไม่ถูกต้อง');

    setSending(true);
    const code = 'A' + Math.floor(1000 + Math.random() * 9000);

    const { data: order, error } = await sb
      .from('customer_orders')
      .insert({
        store_id: storeId,
        order_code: code,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        note: note.trim() || null,
        total,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !order) {
      setSending(false);
      return alert('ส่งออร์เดอร์ไม่สำเร็จ: ' + (error?.message ?? ''));
    }

    const { error: e2 } = await sb.from('customer_order_items').insert(
      lines.map((l) => ({
        order_id: order.id,
        menu_item_id: l.id,
        name_snapshot: l.name,
        qty: l.qty,
        unit_price: l.price,
      }))
    );

    setSending(false);
    if (e2) return alert('บันทึกรายการไม่สำเร็จ: ' + e2.message);
    setDone(code);
  }

  if (loading) return <div className="p-6 text-center">กำลังโหลดเมนู…</div>;

  if (done)
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="mt-3 text-xl font-bold">ส่งออร์เดอร์แล้ว</h1>
        <p className="mt-2 text-sm text-gray-500">แจ้งรหัสนี้กับทางร้านเมื่อมารับ</p>
        <div className="my-4 rounded-xl border-2 border-dashed p-5 text-3xl font-bold tracking-widest">
          {done}
        </div>
        <p className="text-sm">ยอดรวม {baht(total)} — ชำระเงินที่ร้าน</p>
        <button
          onClick={() => {
            setDone(null);
            setCart({});
            setName('');
            setPhone('');
            setNote('');
          }}
          className="mt-5 w-full rounded-lg bg-gray-800 py-2 text-sm text-white"
        >
          สั่งเพิ่ม
        </button>
      </div>
    );

  return (
    <div className="mx-auto max-w-md p-4 pb-40">
      <div className="flex justify-center mb-6">
  <img 
    src="/logo-receipt.png" 
    alt="Logo" 
    className="h-32 w-32 object-contain" 
  />
</div>
      <h1 className="text-center text-xl font-bold">{storeName}</h1>
      <p className="mb-4 text-center text-xs text-gray-500">สั่งกลับบ้าน · ชำระเงินที่ร้าน</p>

      <div className="space-y-2">
        {menus.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{m.name}</div>
              <div className="text-xs text-gray-500">{baht(m.price)}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {cart[m.id] ? (
                <>
                  <button onClick={() => sub(m.id)} className="h-8 w-8 rounded-full border">−</button>
                  <span className="w-5 text-center text-sm">{cart[m.id]}</span>
                </>
              ) : null}
              <button onClick={() => add(m.id)} className="h-8 w-8 rounded-full bg-gray-800 text-white">+</button>
            </div>
          </div>
        ))}
      </div>

      {lines.length > 0 && (
  <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-gray-700 bg-gray-800 p-4 shadow-lg">
    <div className="mb-2 max-h-24 overflow-y-auto text-xs text-gray-300">
      {lines.map((l) => (
        <div key={l.id} className="flex justify-between">
          <span className="truncate">{l.name} ×{l.qty}</span>
          <span>{baht(l.price * l.qty)}</span>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-2 gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ชื่อผู้สั่ง *"
        className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-400"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="tel"
        placeholder="เบอร์โทร *"
        className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-400"
      />
    </div>
    <input
      value={note}
      onChange={(e) => setNote(e.target.value)}
      placeholder="หมายเหตุ (ไม่ใส่ผัก, เผ็ดน้อย…)"
      className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-400"
    />
    <button
      onClick={submit}
      disabled={sending}
      className="mt-2 w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
    >
      {sending ? 'กำลังส่ง…' : `ส่งออร์เดอร์ · ${baht(total)}`}
    </button>
  </div>
)}
    </div>
  );
}