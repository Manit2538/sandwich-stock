'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';


const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Cat = { id: string; name: string };
type Exp = {
  id: string;
  amount: number;
  note: string | null;
  spent_at: string;
  category_name: string | null;
  kind: string;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function ExpensesClient({ storeId }: { storeId: string }) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [rows, setRows] = useState<Exp[]>([]);
  const [sum, setSum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [amount, setAmount] = useState('');
  const [catId, setCatId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayStr());
  const [kind, setKind] = useState<'fixed' | 'variable'>('variable');
  const [pay, setPay] = useState('cash');


  async function load() {
    const [c, e, s] = await Promise.all([
      sb.from('expense_categories').select('id,name').eq('store_id', storeId).order('name'),
      sb.from('expenses_view').select('*').eq('store_id', storeId)
        .order('spent_at', { ascending: false }).limit(50),
      sb.rpc('monthly_summary', { p_store_id: storeId, p_month: todayStr() }),
    ]);
    setCats((c.data ?? []) as Cat[]);
    setRows((e.data ?? []) as Exp[]);
    setSum(Array.isArray(s.data) ? s.data[0] : s.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [storeId]);

  async function add() {
    const n = Number(amount);
    if (!n || n <= 0) return alert('ใส่จำนวนเงินก่อนครับ');

    setBusy(true);
    const { error } = await sb.from('expenses').insert({
  store_id: storeId,
  category_id: catId || null,
  amount: n,
  kind,
  payment_method: pay,
  note: note.trim() || null,
  expense_date: date,          // เดิม spent_at
});

    setBusy(false);

    if (error) return alert('ไม่สำเร็จ: ' + error.message);
    setAmount(''); setNote('');
    await load();
  }

  async function remove(id: string) {
    if (!confirm('ลบรายการนี้?')) return;
    await sb.from('expenses').delete().eq('id', id);
    await load();
  }

  const baht = (v: any) => '฿' + Number(v ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });

  if (loading) return <div className="p-6 text-center text-stone-500">กำลังโหลด…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">ค่าใช้จ่าย</h1>

      {sum && (
        <div className="card space-y-1.5 text-sm">
          <div className="text-xs text-stone-500">สรุปเดือนนี้</div>
          <div className="flex justify-between"><span>รายรับ</span><b className="text-green-500">{baht(sum.revenue)}</b></div>
          <div className="flex justify-between text-stone-500"><span>ต้นทุนคงที่</span><span>{baht(sum.expense_fixed)}</span></div>
          <div className="flex justify-between text-stone-500"><span>ต้นทุนผันแปร</span><span>{baht(sum.expense_variable)}</span></div>
          <div className="flex justify-between border-t border-stone-400/20 pt-1.5">
            <b>กำไรสุทธิ</b>
            <b className={Number(sum.net_profit) >= 0 ? 'text-green-500' : 'text-red-500'}>
              {baht(sum.net_profit)}
            </b>
          </div>
        </div>
      )}

      <div className="card space-y-2">
        <div className="text-sm font-medium">บันทึกรายจ่าย</div>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="จำนวนเงิน"
          className="w-full rounded-lg border border-stone-400/50 bg-transparent px-3 py-2 text-lg font-bold"
        />
        <select
          value={catId}
          onChange={(e) => setCatId(e.target.value)}
          className="w-full rounded-lg border border-stone-400/50 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">— เลือกหมวดหมู่ —</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className="flex gap-2">
  {(['variable', 'fixed'] as const).map((k) => (
    <button
      key={k}
      type="button"
      onClick={() => setKind(k)}
      className={`flex-1 rounded-lg border py-2 text-xs ${
        kind === k
          ? 'border-orange-500 bg-orange-500/15 text-orange-500'
          : 'border-stone-400/50 text-stone-500'
      }`}
    >
      {k === 'fixed' ? 'ต้นทุนคงที่' : 'ต้นทุนผันแปร'}
    </button>
  ))}
</div>

<select
  value={pay}
  onChange={(e) => setPay(e.target.value)}
  className="w-full rounded-lg border border-stone-400/50 bg-transparent px-3 py-2 text-sm"
>
  <option value="cash">เงินสด</option>
  <option value="transfer">โอน</option>
  <option value="credit">บัตร/เครดิต</option>
</select>
        
        <div className="flex gap-2">
          <input
  value={note}
  onChange={(e) => setNote(e.target.value)}
  placeholder="หมายเหตุ (ไม่บังคับ)"
  className="w-full rounded-lg border border-stone-400/50 bg-transparent px-3 py-2 text-sm"
/>
<input
  type="date"
  value={date}
  onChange={(e) => setDate(e.target.value)}
  className="w-full rounded-lg border border-stone-400/50 bg-transparent px-3 py-2 text-sm"
/>
        </div>
        <button
          onClick={add}
          disabled={busy}
          className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-400/40 py-10 text-center text-sm text-stone-500">
          ยังไม่มีรายการ
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="card flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">{r.category_name ?? 'ไม่ระบุหมวด'}</div>
                <div className="text-xs text-stone-500">
                  {r.spent_at}{r.note ? ` · ${r.note}` : ''}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <b className="text-sm">{baht(r.amount)}</b>
                <button onClick={() => remove(r.id)} className="text-xs text-stone-400 hover:text-red-500">ลบ</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}