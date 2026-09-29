'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Item = {
  id: string;
  name: string;
  qty_on_hand: number;
  reorder_point: number;
  stock_status: 'out' | 'low' | 'ok';
};

type History = {
  id: string;
  created_at: string;
  ingredient_name: string;
  qty: number;
  type: string;
  note: string | null;
};

export default function StockPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [items, setItems] = useState<Item[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [tab, setTab] = useState<'list' | 'history'>('list');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [point, setPoint] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: a }, { data: h }] = await Promise.all([
      sb.from('ingredient_alerts').select('*').eq('store_id', storeId).order('name'),
      sb.from('stock_history').select('*').eq('store_id', storeId).limit(50),
    ]);
    setItems((a ?? []) as Item[]);
    setHistory((h ?? []) as History[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [storeId]);

  async function restock(id: string, qty: number) {
    if (!qty) return alert('กรุณาใส่จำนวน');
    setBusy(true);
    const { error } = await sb.rpc('restock_ingredient', {
      p_ingredient_id: id,
      p_qty: qty,
      p_note: qty > 0 ? 'เติมสต็อก' : 'ปรับลด',
    });
    setBusy(false);
    if (error) return alert('ไม่สำเร็จ: ' + error.message);
    setAmount('');
    await load();
  }

  async function savePoint(id: string) {
    setBusy(true);
    const { error } = await sb.rpc('set_reorder_point', {
      p_ingredient_id: id,
      p_point: Number(point),
    });
    setBusy(false);
    if (error) return alert('ไม่สำเร็จ: ' + error.message);
    setPoint('');
    await load();
  }

  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())),
    [items, q]
  );

  const badge = (s: Item['stock_status']) =>
    s === 'out'
      ? { t: 'หมด', c: 'bg-red-500/15 text-red-400' }
      : s === 'low'
      ? { t: 'ใกล้หมด', c: 'bg-orange-500/15 text-orange-400' }
      : { t: 'ปกติ', c: 'bg-green-500/15 text-green-400' };

  const fmt = (d: string) =>
    new Date(d).toLocaleString('th-TH', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });

  if (loading) return <div className="p-6 text-center text-gray-400">กำลังโหลด…</div>;

  const outN = items.filter((i) => i.stock_status === 'out').length;
  const lowN = items.filter((i) => i.stock_status === 'low').length;

  return (
    <div className="mx-auto max-w-2xl p-4 pb-20">
      <h1 className="text-xl font-bold">จัดการวัตถุดิบ</h1>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-800 py-2">
          <div className="text-lg font-bold">{items.length}</div>
          <div className="text-xs text-gray-400">ทั้งหมด</div>
        </div>
        <div className="rounded-lg bg-orange-500/10 py-2">
          <div className="text-lg font-bold text-orange-400">{lowN}</div>
          <div className="text-xs text-gray-400">ใกล้หมด</div>
        </div>
        <div className="rounded-lg bg-red-500/10 py-2">
          <div className="text-lg font-bold text-red-400">{outN}</div>
          <div className="text-xs text-gray-400">หมดแล้ว</div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {(['list', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              tab === t ? 'bg-gray-700 text-white' : 'bg-gray-800/50 text-gray-400'
            }`}
          >
            {t === 'list' ? 'รายการวัตถุดิบ' : 'ประวัติ'}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาวัตถุดิบ…"
            className="mt-3 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500"
          />

          <div className="mt-3 space-y-2">
            {filtered.map((it) => {
              const b = badge(it.stock_status);
              const open = openId === it.id;

              return (
                <div key={it.id} className="rounded-xl border border-gray-700 bg-gray-800/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{it.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                        <span className={`rounded-full px-2 py-0.5 ${b.c}`}>{b.t}</span>
                        <span>คงเหลือ <b className="text-white">{it.qty_on_hand}</b></span>
                        <span>· เตือนที่ {it.reorder_point}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setOpenId(open ? null : it.id);
                        setAmount('');
                        setPoint(String(it.reorder_point));
                      }}
                      className="shrink-0 rounded-md bg-gray-700 px-3 py-1.5 text-xs text-white"
                    >
                      {open ? 'ปิด' : 'จัดการ'}
                    </button>
                  </div>

                  {open && (
                    <div className="mt-3 space-y-3 border-t border-gray-700 pt-3">
                      <div>
                        <div className="mb-1.5 text-xs text-gray-400">เติมสต็อก</div>
                        <div className="flex gap-1.5">
                          {[10, 20, 50, 100].map((n) => (
                            <button
                              key={n}
                              onClick={() => restock(it.id, n)}
                              disabled={busy}
                              className="flex-1 rounded-md border border-gray-600 py-1.5 text-xs hover:bg-white/10 disabled:opacity-40"
                            >
                              +{n}
                            </button>
                          ))}
                        </div>
                        <div className="mt-1.5 flex gap-1.5">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="ระบุเอง (ใส่ -5 เพื่อหักออก)"
                            className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-2 py-1.5 text-xs text-white placeholder-gray-500"
                          />
                          <button
                            onClick={() => restock(it.id, Number(amount))}
                            disabled={busy || !amount}
                            className="rounded-md bg-green-600 px-3 text-xs font-medium text-white disabled:opacity-40"
                          >
                            บันทึก
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 text-xs text-gray-400">จุดเตือน (เหลือเท่าไหร่ให้เตือน)</div>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            value={point}
                            onChange={(e) => setPoint(e.target.value)}
                            className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-2 py-1.5 text-xs text-white"
                          />
                          <button
                            onClick={() => savePoint(it.id)}
                            disabled={busy}
                            className="rounded-md bg-blue-600 px-3 text-xs font-medium text-white disabled:opacity-40"
                          >
                            ตั้งค่า
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className="mt-3 space-y-1.5">
          {history.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">ยังไม่มีประวัติ</div>
          ) : (
            history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate">{h.ingredient_name}</div>
                  <div className="text-xs text-gray-500">
                    {fmt(h.created_at)}{h.note ? ` · ${h.note}` : ''}
                  </div>
                </div>
                <span className={`shrink-0 font-semibold ${h.qty > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {h.qty > 0 ? '+' : ''}{h.qty}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}