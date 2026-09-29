'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Item = {
  id: string;
  ingredient_name: string;
  qty_needed: number;
  qty_on_hand: number;
  reorder_point: number;
  note: string | null;
  is_done: boolean;
  done_at: string | null;
};

export default function ShoppingClient({ storeId }: { storeId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await sb
      .from('shopping_list_view')
      .select('*')
      .eq('store_id', storeId)
      .order('is_done')
      .order('created_at', { ascending: false });
    setItems((data ?? []) as Item[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [storeId]);

  async function generate() {
    setBusy(true);
    const { data, error } = await sb.rpc('generate_shopping_list', {
      p_store_id: storeId,
    });
    setBusy(false);
    if (error) return alert('ไม่สำเร็จ: ' + error.message);
    alert(data ? `เพิ่ม ${data} รายการ` : 'ไม่มีของที่ต้องซื้อเพิ่ม');
    await load();
  }

  async function complete(id: string, name: string, qty: number) {
    if (!confirm(`ซื้อ "${name}" จำนวน ${qty} แล้วใช่ไหม?\nระบบจะเติมสต็อกให้อัตโนมัติ`)) return;
    setBusy(true);
    const { error } = await sb.rpc('complete_shopping_item', { p_item_id: id });
    setBusy(false);
    if (error) return alert('ไม่สำเร็จ: ' + error.message);
    await load();
  }

  async function changeQty(id: string, qty: number) {
    if (qty < 1) return;
    await sb.from('shopping_list_items').update({ qty_needed: qty }).eq('id', id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty_needed: qty } : i)));
  }

  async function remove(id: string) {
    if (!confirm('ลบรายการนี้?')) return;
    await sb.from('shopping_list_items').delete().eq('id', id);
    await load();
  }

  async function clearDone() {
    if (!confirm('ลบรายการที่ซื้อแล้วทั้งหมด?')) return;
    setBusy(true);
    await sb.from('shopping_list_items').delete().eq('store_id', storeId).eq('is_done', true);
    setBusy(false);
    await load();
  }

  const pending = items.filter((i) => !i.is_done);
  const done = items.filter((i) => i.is_done);

  if (loading) return <div className="p-6 text-center text-stone-500">กำลังโหลด…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">รายการซื้อของ</h1>
        <span className="text-sm text-stone-500">ต้องซื้อ {pending.length} อย่าง</span>
      </div>

      <button
        onClick={generate}
        disabled={busy}
        className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? 'กำลังทำงาน…' : 'สร้างรายการจากของที่ใกล้หมด'}
      </button>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-400/40 py-10 text-center text-sm text-stone-500">
          ไม่มีรายการต้องซื้อ
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((it) => (
            <div key={it.id} className="rounded-xl border border-stone-300/30 bg-black/5 p-3 dark:bg-black/20">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{it.ingredient_name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                    {it.note && (
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          it.note === 'หมดแล้ว'
                            ? 'bg-red-500/15 text-red-500'
                            : 'bg-orange-500/15 text-orange-500'
                        }`}
                      >
                        {it.note}
                      </span>
                    )}
                    <span>เหลือ {it.qty_on_hand} · เตือนที่ {it.reorder_point}</span>
                  </div>
                </div>
                <button
                  onClick={() => remove(it.id)}
                  className="shrink-0 text-xs text-stone-400 hover:text-red-500"
                >
                  ลบ
                </button>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-xs text-stone-500">ซื้อ</span>
                <button
                  onClick={() => changeQty(it.id, Number(it.qty_needed) - 1)}
                  className="h-7 w-7 rounded-md border border-stone-400/50 text-sm"
                >
                  −
                </button>
                <input
                  type="number"
                  value={it.qty_needed}
                  onChange={(e) => changeQty(it.id, Number(e.target.value))}
                  className="w-16 rounded-md border border-stone-400/50 bg-transparent px-2 py-1 text-center text-sm"
                />
                <button
                  onClick={() => changeQty(it.id, Number(it.qty_needed) + 1)}
                  className="h-7 w-7 rounded-md border border-stone-400/50 text-sm"
                >
                  +
                </button>
                <button
                  onClick={() => complete(it.id, it.ingredient_name, it.qty_needed)}
                  disabled={busy}
                  className="ml-auto rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  ซื้อแล้ว
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowDone(!showDone)}
              className="text-sm text-stone-500"
            >
              {showDone ? '▾' : '▸'} ซื้อแล้ว ({done.length})
            </button>
            {showDone && (
              <button onClick={clearDone} className="text-xs text-red-500 hover:underline">
                ล้างทั้งหมด
              </button>
            )}
          </div>

          {showDone && (
            <div className="mt-2 space-y-1">
              {done.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between rounded-lg bg-black/5 px-3 py-2 text-sm text-stone-500 dark:bg-black/20"
                >
                  <span className="truncate line-through">{it.ingredient_name}</span>
                  <span className="shrink-0 text-xs">+{it.qty_needed}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}