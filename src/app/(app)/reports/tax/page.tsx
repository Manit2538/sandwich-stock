'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { summarizeTax, DEFAULT_ALLOWANCES, type Allowances } from '@/lib/tax';
import Link from 'next/link';


// จัดรูปแบบเงินในไฟล์นี้เอง ไม่ต้องพึ่ง lib/format
const baht = (n: number) =>
  '฿' + Number(n || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

const ALLOW_KEY = 'tax-allowances-v1';


type Row = {
  tax_year: number;
  half: 'H1' | 'H2';
  period: string;
  order_count: number;
  revenue: number;
  platform_fee: number;
  total_cost: number;
};

const FIELDS: { key: keyof Allowances; label: string; hint?: string }[] = [
  { key: 'personal', label: 'ส่วนตัว', hint: 'สูงสุด 60,000' },
  { key: 'spouse', label: 'คู่สมรส', hint: 'สูงสุด 60,000' },
  { key: 'child', label: 'บุตร', hint: 'คนละ 30,000' },
  { key: 'parent', label: 'บิดามารดา', hint: 'คนละ 30,000' },
  { key: 'socialSecurity', label: 'ประกันสังคม', hint: 'สูงสุด 9,000' },
  { key: 'lifeInsurance', label: 'ประกันชีวิต', hint: 'สูงสุด 100,000' },
  { key: 'healthInsurance', label: 'ประกันสุขภาพ', hint: 'สูงสุด 25,000' },
  { key: 'fund', label: 'RMF / SSF' },
  { key: 'donation', label: 'เงินบริจาค' },
  { key: 'other', label: 'ลดหย่อนอื่นๆ' },
];

export default function TaxReportPage() {
  const supabase = createClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [scope, setScope] = useState<'H1' | 'FULL'>('FULL');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllow, setShowAllow] = useState(false);
  const [allow, setAllow] = useState<Allowances>(DEFAULT_ALLOWANCES);
  const [allowReady, setAllowReady] = useState(false);

// โหลดค่าที่เคยกรอกไว้ (ทำใน effect เพื่อไม่ให้ SSR กับ client ไม่ตรงกัน)
useEffect(() => {
  try {
    const saved = localStorage.getItem(ALLOW_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Allowances>;
      // merge กับค่าเริ่มต้น เผื่อในอนาคตเพิ่มช่องใหม่
      setAllow({ ...DEFAULT_ALLOWANCES, ...parsed });
    }
  } catch {
    // ข้อมูลเสียหาย -> ใช้ค่าเริ่มต้น
  }
  setAllowReady(true);
}, []);

// บันทึกทุกครั้งที่แก้ไข (หลังโหลดเสร็จแล้วเท่านั้น)
useEffect(() => {
  if (!allowReady) return;
  try {
    localStorage.setItem(ALLOW_KEY, JSON.stringify(allow));
  } catch {
    // เช่น โหมดไม่ระบุตัวตน / พื้นที่เต็ม
  }
}, [allow, allowReady]);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('v_tax_period').select('*')
        .eq('tax_year', year).order('period');
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, [year, supabase]);

  const filtered = useMemo(
    () => (scope === 'H1' ? rows.filter((r) => r.half === 'H1') : rows),
    [rows, scope],
  );

  const sum = useMemo(() => {
  const revenue = filtered.reduce((a, r) => a + Number(r.revenue), 0);
  const cost = filtered.reduce((a, r) => a + Number(r.total_cost), 0);
  const fee = filtered.reduce((a, r) => a + Number(r.platform_fee), 0);
  const orders = filtered.reduce((a, r) => a + Number(r.order_count), 0);
  return { cost, fee, orders, ...summarizeTax(revenue, cost, fee, allow) };
}, [filtered, allow]);

  function exportCsv() {
    const head = ['งวด', 'จำนวนบิล', 'รายได้', 'ค่าธรรมเนียม', 'ต้นทุน'];
    const body = filtered.map((r) =>
      [r.period, r.order_count, r.revenue, r.platform_fee, r.total_cost].join(','));
    const total = ['รวม', sum.orders, sum.revenue, sum.fee, sum.cost].join(',');
    const foot = [
      '', '', '', '', '',
      `หักค่าใช้จ่าย,${sum.expense}`,
      `ค่าลดหย่อนรวม,${sum.deduction}`,
      `เงินได้สุทธิ,${sum.netIncome}`,
      `ภาษีโดยประมาณ,${sum.estimatedTax}`,
    ].join('\n');
    const csv = '\uFEFF' + [head.join(','), ...body, total, foot].join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-${year}-${scope}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 pb-24">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-xl font-bold text-white">เอกสารยื่นภาษี</h1>
      <p className="mt-1 text-xs text-gray-400">บุคคลธรรมดา • เงินได้ 40(8) • ไม่จด VAT</p>
    </div>
    <Link
      href="/reports"
      className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800"
    >
      ← กลับหน้ารายงาน
    </Link>
  </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-gray-700 bg-gray-900 p-2 text-sm text-white">
          {[0, 1, 2].map((i) => {
            const y = new Date().getFullYear() - i;
            return <option key={y} value={y}>ปี {y + 543}</option>;
          })}
        </select>

        <select value={scope} onChange={(e) => setScope(e.target.value as 'H1' | 'FULL')}
          className="rounded-lg border border-gray-700 bg-gray-900 p-2 text-sm text-white">
          <option value="H1">ครึ่งปีแรก (ภ.ง.ด.94)</option>
          <option value="FULL">ทั้งปี (ภ.ง.ด.90)</option>
        </select>

        <button onClick={exportCsv}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
          ส่งออก CSV
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-gray-400">กำลังโหลด…</p>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full min-w-[420px] text-xs">
              <thead className="bg-gray-900 text-[10px] text-gray-400">
                <tr>
                  <th className="p-2 pl-2.5 text-left">งวด</th>
                  <th className="p-2 text-right">บิล</th>
                  <th className="p-2 text-right">รายได้</th>
                  <th className="p-2 text-right">ค่าธรรมเนียม</th>
                  <th className="p-2 pr-2.5 text-right">ต้นทุน</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-500">ไม่มีข้อมูลในปีนี้</td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.period} className="border-t border-gray-800 text-gray-200">
                    <td className="p-2 pl-2.5 whitespace-nowrap font-medium">{r.period}</td>
                    <td className="p-2 text-right">{r.order_count}</td>
                    <td className="p-2 text-right whitespace-nowrap">{baht(r.revenue)}</td>
                    <td className="p-2 text-right whitespace-nowrap text-red-400">-{baht(r.platform_fee)}</td>
                    <td className="p-2 pr-2.5 text-right whitespace-nowrap text-red-400">-{baht(r.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-700 bg-gray-900 font-bold text-white">
                <tr>
                  <td className="p-2 pl-2.5">รวม</td>
                  <td className="p-2 text-right">{sum.orders}</td>
                  <td className="p-2 text-right whitespace-nowrap">{baht(sum.revenue)}</td>
                  <td className="p-2 text-right whitespace-nowrap text-red-400">-{baht(sum.fee)}</td>
                  <td className="p-2 pr-2.5 text-right whitespace-nowrap text-red-400">-{baht(sum.cost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-5 rounded-xl border border-gray-800">
            <button onClick={() => setShowAllow((v) => !v)}
              className="flex w-full items-center justify-between p-4 text-sm font-semibold text-white">
              <span>ค่าลดหย่อน — รวม {baht(sum.deduction)}</span>
              <span className="text-gray-400">{showAllow ? '▲' : '▼'}</span>
            </button>

            {showAllow && (
              <div className="grid grid-cols-2 gap-3 border-t border-gray-800 p-4">
                {FIELDS.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-[11px] text-gray-400">{f.label}</span>
                    {f.hint && <span className="ml-1 text-[9px] text-gray-600">{f.hint}</span>}
                    <input
                      type="number" min={0} inputMode="numeric"
                      value={allow[f.key] || ''}
                      placeholder="0"
                      onChange={(e) =>
                        setAllow((p) => ({ ...p, [f.key]: Number(e.target.value) || 0 }))}
                      className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-right text-sm text-white"
                    />
                  </label>
                ))}
          <button
            onClick={() => {
              setAllow(DEFAULT_ALLOWANCES);
              try { localStorage.removeItem(ALLOW_KEY); } catch {}
             }}
             className="col-span-2 mt-1 rounded-lg border border-gray-700 py-2 text-xs text-gray-400">
             รีเซ็ตเป็นค่าเริ่มต้น
          </button>

              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-gray-800 p-4">
            <h2 className="text-sm font-semibold text-white">สรุปสำหรับกรอกแบบ</h2>
            <dl className="mt-3 space-y-2 text-xs">
              <Line label="เงินได้พึงประเมิน 40(8)" value={baht(sum.revenue)} />
              <Line label="หักเหมา 60%" value={baht(sum.expenseFlat)} hint={sum.useFlat ? 'คุ้มกว่า' : undefined} />
              <Line label="หักตามจริง" value={baht(sum.expenseActual)} hint={!sum.useFlat ? 'คุ้มกว่า' : undefined} />
              <Line label="ค่าลดหย่อนรวม" value={baht(sum.deduction)} />
              <Line label="เงินได้สุทธิ" value={baht(sum.netIncome)} bold />
              <Line label="ภาษีโดยประมาณ" value={baht(sum.estimatedTax)} bold green />
            </dl>
            <p className="col-span-2 text-center text-[10px] text-gray-600">
             ค่าที่กรอกจะถูกจำไว้ในเครื่องนี้โดยอัตโนมัติ
            </p>

            <p className="mt-3 text-[10px] leading-relaxed text-gray-500">
              ตัวเลขนี้เป็นการประมาณการเบื้องต้น โปรดตรวจทานกับนักบัญชีก่อนยื่นจริง
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Line({ label, value, hint, bold, green }: {
  label: string; value: string; hint?: string; bold?: boolean; green?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-gray-400">
        {label}
        {hint && <span className="ml-1.5 rounded bg-emerald-900 px-1.5 py-0.5 text-[9px] text-emerald-300">{hint}</span>}
      </dt>
      <dd className={`whitespace-nowrap ${bold ? 'font-bold' : ''} ${green ? 'text-green-400' : 'text-gray-200'}`}>
        {value}
      </dd>
    </div>
  );
}