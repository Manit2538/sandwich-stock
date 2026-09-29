'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Row = { id: string; name: string };

export default function ListManager({
  storeId,
  table,
  title,
  placeholder,
  scoped = true,
  extra,
  hint,
}: {
  storeId: string;
  table: 'ingredient_categories' | 'base_units' | 'expense_categories';
  title: string;
  placeholder: string;
  scoped?: boolean;                      // false = ตารางไม่มี store_id
  extra?: Record<string, any>;           // ค่า default คอลัมน์เพิ่มเติม
  hint?: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [input, setInput] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    let q = sb.from(table).select('id, name');
    if (scoped) q = q.eq('store_id', storeId);
    const { data } = await q.order('name');
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    load();
  }, [storeId, table]);

  async function addRow() {
    const v = input.trim();
    if (!v) return;
    setBusy(true);

    const payload: Record<string, any> = { name: v, ...(extra ?? {}) };
    if (scoped) payload.store_id = storeId;

    const { error } = await sb.from(table).insert(payload);
    setBusy(false);
    if (error) {
      return alert(
        error.message.includes('duplicate') ? 'มีชื่อนี้อยู่แล้ว' : error.message
      );
    }
    setInput('');
    await load();
  }

  async function saveEdit(id: string) {
    const v = editVal.trim();
    if (!v) return;
    setBusy(true);
    const { error } = await sb.from(table).update({ name: v }).eq('id', id);
    setBusy(false);
    if (error) return alert(error.message);
    setEditId(null);
    await load();
  }

  async function del(id: string, name: string) {
    if (!confirm(`ลบ "${name}" ใช่ไหม?`)) return;
    setBusy(true);
    const { error } = await sb.from(table).delete().eq('id', id);
    setBusy(false);
    if (error) {
      return alert(
        error.message.includes('foreign key')
          ? 'ลบไม่ได้ เพราะยังมีข้อมูลใช้งานอยู่'
          : 'ลบไม่ได้: ' + error.message
      );
    }
    await load();
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-gray-500">{rows.length} รายการ</span>
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}

      <div className="mt-3 flex gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addRow()}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-2.5 py-1.5 text-sm text-white placeholder-gray-500"
        />
        <button
          onClick={addRow}
          disabled={busy || !input.trim()}
          className="rounded-md bg-green-600 px-3.5 text-sm font-medium text-white disabled:opacity-40"
        >
          เพิ่ม
        </button>
      </div>

      <div className="mt-2.5 space-y-1">
        {rows.length === 0 ? (
          <div className="py-4 text-center text-xs text-gray-500">ยังไม่มีรายการ</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-md bg-black/20 px-2.5 py-1.5"
            >
              {editId === r.id ? (
                <>
                  <input
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(r.id)}
                    autoFocus
                    className="flex-1 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-white"
                  />
                  <button onClick={() => saveEdit(r.id)} className="text-xs text-green-400">
                    บันทึก
                  </button>
                  <button onClick={() => setEditId(null)} className="text-xs text-gray-500">
                    ยกเลิก
                  </button>
                </>
              ) : (
                <>
                  <span className="truncate text-sm">{r.name}</span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => {
                        setEditId(r.id);
                        setEditVal(r.name);
                      }}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => del(r.id, r.name)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      ลบ
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}