'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useSearchParams } from 'next/navigation';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const STOREFRONT_PLATFORM = '28bc47ec-9564-4741-baa0-c634817998b8';

type Menu = { id: string; name: string; price: number; can_make: number };
type Need = {
  ingredient_id: string;
  ingredient_name: string;
  qty_per_piece: number;
  qty_on_hand: number;
};
type Department = { id: string; name: string; location: string | null };

// ── ห่อด้วย Suspense เพราะ useSearchParams ต้องการ ──
export default function OrderPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">กำลังโหลด…</div>}>
      <OrderInner />
    </Suspense>
  );
}

function OrderInner() {
  
  const { storeId } = useParams<{ storeId: string }>();
  const searchParams = useSearchParams();

  // ── อ่านโหมดจาก QR: ?type=company หรือ ?type=takeaway ──
  const isCompany = searchParams.get('type') === 'company';
    // ── เช็กเวลาปิดรับออร์เดอร์ 22:00 น. เฉพาะโหมดบริษัท ──
  const now = new Date();
  const isClosedByTime = isCompany && (now.getHours() * 60 + now.getMinutes() >= 22 * 60);

  const [storeName, setStoreName] = useState('');
  const [menus, setMenus] = useState<Menu[]>([]);
  const [needs, setNeeds] = useState<Map<string, Need[]>>(new Map());
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState('');

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function loadData() {
    const [{ data: items }, { data: avail }, { data: need }, { data: depts }] = await Promise.all([
      sb.from('menu_items')
        .select('id, name, is_active, menu_prices(price, platform_id)')
        .eq('store_id', storeId)
        .order('name'),
      sb.from('menu_availability')
        .select('menu_item_id, can_make')
        .eq('store_id', storeId),
      sb.from('menu_ingredient_need')
        .select('*')
        .eq('store_id', storeId),
      sb.from('departments')
        .select('id, name, location')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('sort_order'),
    ]);

    setDepartments(depts ?? []);

    const availMap = new Map(
      (avail ?? []).map((a: any) => [a.menu_item_id, Number(a.can_make ?? 0)])
    );

    const needMap = new Map<string, Need[]>();
    (need ?? []).forEach((n: any) => {
      const arr = needMap.get(n.menu_item_id) ?? [];
      arr.push({
        ingredient_id: n.ingredient_id,
        ingredient_name: n.ingredient_name,
        qty_per_piece: Number(n.qty_per_piece) > 0 ? Number(n.qty_per_piece) : 1,
        qty_on_hand: Number(n.qty_on_hand ?? 0),
      });
      needMap.set(n.menu_item_id, arr);
    });
    setNeeds(needMap);

    setMenus(
      (items ?? [])
        .filter((m: any) => m.is_active !== false)
        .map((m: any) => {
          const row = (m.menu_prices ?? []).find(
            (p: any) => p.platform_id === STOREFRONT_PLATFORM
          );
          return {
            id: m.id,
            name: m.name,
            price: Number(row?.price ?? 0),
            can_make: availMap.get(m.id) ?? 0,
          };
        })
        .filter((m) => m.price > 0)
    );
  }

  useEffect(() => {
    (async () => {
      const { data: store } = await sb
        .from('stores').select('name').eq('id', storeId).single();
      setStoreName(store?.name ?? 'ร้านอาหาร');
      await loadData();
      setLoading(false);
    })();
  }, [storeId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!sending && !done) loadData();
    }, 30000);

    const onFocus = () => {
      if (!sending && !done) loadData();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [storeId, sending, done]);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });

  function shortages(c: Record<string, number>): string[] {
    const used = new Map<string, number>();
    const stock = new Map<string, { name: string; have: number }>();

    needs.forEach((list) =>
      list.forEach((n) =>
        stock.set(n.ingredient_id, { name: n.ingredient_name, have: n.qty_on_hand })
      )
    );

    for (const [menuId, qty] of Object.entries(c)) {
      for (const n of needs.get(menuId) ?? []) {
        used.set(
          n.ingredient_id,
          (used.get(n.ingredient_id) ?? 0) + n.qty_per_piece * qty
        );
      }
    }

    const out: string[] = [];
    used.forEach((amount, id) => {
      const s = stock.get(id);
      if (s && amount > s.have) out.push(s.name);
    });
    return out;
  }

  const canAdd = (menuId: string) =>
    shortages({ ...cart, [menuId]: (cart[menuId] ?? 0) + 1 }).length === 0;

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
  const baht = (n: number) =>
    `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  async function submit() {
    if (!lines.length) return alert('กรุณาเลือกเมนูก่อน');
    if (!name.trim()) return alert('กรุณากรอกชื่อ');
    if (!/^0\d{8,9}$/.test(phone.trim())) return alert('เบอร์โทรไม่ถูกต้อง');
    if (isCompany && !selectedDept) return alert('กรุณาเลือกฝ่ายที่ต้องการจัดส่ง');

    setSending(true);

    const { data: freshNeed } = await sb
      .from('menu_ingredient_need')
      .select('*')
      .eq('store_id', storeId);

    const freshMap = new Map<string, Need[]>();
    (freshNeed ?? []).forEach((n: any) => {
      const arr = freshMap.get(n.menu_item_id) ?? [];
      arr.push({
        ingredient_id: n.ingredient_id,
        ingredient_name: n.ingredient_name,
        qty_per_piece: Number(n.qty_per_piece) > 0 ? Number(n.qty_per_piece) : 1,
        qty_on_hand: Number(n.qty_on_hand ?? 0),
      });
      freshMap.set(n.menu_item_id, arr);
    });

    const usedNow = new Map<string, number>();
    const stockNow = new Map<string, { name: string; have: number }>();
    freshMap.forEach((list) =>
      list.forEach((n) =>
        stockNow.set(n.ingredient_id, { name: n.ingredient_name, have: n.qty_on_hand })
      )
    );
    for (const [menuId, qty] of Object.entries(cart)) {
      for (const n of freshMap.get(menuId) ?? []) {
        usedNow.set(
          n.ingredient_id,
          (usedNow.get(n.ingredient_id) ?? 0) + n.qty_per_piece * qty
        );
      }
    }

    const lack: string[] = [];
    usedNow.forEach((amount, id) => {
      const s = stockNow.get(id);
      if (s && amount > s.have) lack.push(s.name);
    });

    if (lack.length > 0) {
      setSending(false);
      setNeeds(freshMap);
      setCart({});
      return alert('ขออภัย วัตถุดิบไม่พอ:\n' + lack.map((n) => `• ${n}`).join('\n'));
    }

    const code = (isCompany ? 'C' : 'A') + Math.floor(1000 + Math.random() * 9000);

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
        department: isCompany ? selectedDept : null,
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

  const cartShort = shortages(cart);

  if (loading) return <div className="p-6 text-center">กำลังโหลดเมนู…</div>;

    if (isClosedByTime) {
    return (
      <div className="mx-auto max-w-md p-6 text-center pt-20">
        <div className="text-6xl mb-4">⏰</div>
        <h1 className="text-xl font-bold text-red-400">ปิดรับออร์เดอร์ชั่วคราว</h1>
        <p className="mt-3 text-sm text-gray-300 leading-relaxed">
          สำหรับบริการสั่งในบริษัท (Delivery) จะปิดรับออร์เดอร์หลัง 22:00 น. เป็นต้นไปครับ
        </p>
        <div className="mt-6 rounded-xl border border-gray-700 bg-gray-800 p-4 text-xs text-gray-400">
          สามารถกลับมาสั่งใหม่ได้ในวันพรุ่งนี้ ขอบคุณครับ 🙏
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="mt-3 text-xl font-bold">ส่งออร์เดอร์แล้ว</h1>
        <p className="mt-2 text-sm text-gray-500">
          {isCompany ? `เราจะนำไปส่งที่ ${selectedDept}` : 'แจ้งรหัสนี้กับทางร้านเมื่อมารับ'}
        </p>
        <div className="my-4 rounded-xl border-2 border-dashed p-5 text-3xl font-bold tracking-widest">
          {done}
        </div>
        <p className="text-sm">ยอดรวม {baht(total)} — ชำระเงินที่ร้าน</p>
        <button
          onClick={async () => {
            setDone(null);
            setCart({});
            setName('');
            setPhone('');
            setNote('');
            setSelectedDept('');
            await loadData();
          }}
          className="mt-5 w-full rounded-lg bg-gray-800 py-2 text-sm text-white"
        >
          สั่งเพิ่ม
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-40">
      <div className="mb-6 flex justify-center">
      <img src="https://raw.githubusercontent.com/Manit2538/sandwich-stock/main/public/logo-receipt.png" alt="Logo" className="h-32 w-32 object-contain" />
      </div>
      <h1 className="text-center text-xl font-bold">{storeName}</h1>

      {/* ── ป้ายบอกโหมด ล็อกตาม QR ที่สแกนมา ── */}
      <div className="mb-4 mt-2 flex justify-center">
        {isCompany ? (
          <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-400">
            🏢 สั่งในบริษัท · เราเดินไปส่งให้
          </span>
        ) : (
          <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-400">
            🥡 สั่งกลับบ้าน · รับที่ร้าน
          </span>
        )}
      </div>

      {/* ── ช่องเลือกฝ่าย โผล่เฉพาะโหมดบริษัท ── */}
      {isCompany && (
        <div className="mb-4 space-y-1.5 rounded-lg border border-orange-500/40 bg-orange-500/5 p-3">
          <label className="text-xs font-medium text-orange-400">เลือกฝ่ายที่จะจัดส่ง *</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            <option value="">— กรุณาเลือกฝ่าย —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name} {d.location ? `(${d.location})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        {menus.map((m) => {
          const qty = cart[m.id] ?? 0;
          const soldOut = m.can_make <= 0;
          const reachedMax = !canAdd(m.id);

          return (
            <div
              key={m.id}
              className={`flex items-center justify-between rounded-lg border border-gray-700 p-3 ${
                soldOut ? 'opacity-40' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{baht(m.price)}</span>
                  {soldOut ? (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-red-400">
                      หมด
                    </span>
                  ) : m.can_make <= 5 ? (
                    <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-orange-400">
                      เหลือ {m.can_make}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {qty ? (
                  <>
                    <button onClick={() => sub(m.id)} className="h-8 w-8 rounded-full border border-gray-600 text-white">
                      −
                    </button>
                    <span className="w-5 text-center text-sm text-white">{qty}</span>
                  </>
                ) : null}
                <button
                  onClick={() => add(m.id)}
                  disabled={soldOut || reachedMax}
                  className="h-8 w-8 rounded-full bg-gray-800 text-white disabled:cursor-not-allowed disabled:bg-gray-600 disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-gray-700 bg-gray-800 p-4 shadow-lg">
          <div className="mb-2 max-h-24 overflow-y-auto text-xs text-gray-300">
            {lines.map((l) => (
              <div key={l.id} className="flex justify-between">
                <span className="truncate">
                  {l.name} ×{l.qty}
                </span>
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

          {cartShort.length > 0 && (
            <div className="mt-2 rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-400">
              วัตถุดิบไม่พอ: {cartShort.join(', ')}
            </div>
          )}

          <button
            onClick={submit}
            disabled={sending || cartShort.length > 0}
            className="mt-2 w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white disabled:bg-gray-500 disabled:opacity-50"
          >
            {sending
              ? 'กำลังส่ง…'
              : cartShort.length > 0
              ? 'วัตถุดิบไม่พอ'
              : `ส่งออร์เดอร์ · ${baht(total)}`}
          </button>
        </div>
      )}
    </div>
  );
}