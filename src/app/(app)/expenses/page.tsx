import { requireStore } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/server';
import { fmtBaht, fmtDate, todayBkk } from '@/lib/format';
import { deleteExpense } from './actions';
import ExpenseForm from './ExpenseForm';
import { D, money } from '@/lib/decimal';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const { storeId } = await requireStore();
  const supabase = await createClient();
  const today = todayBkk();
  const monthStart = today.slice(0, 8) + '01';

  const [{ data: categories }, { data: expenses }] = await Promise.all([
    supabase.from('expense_categories').select('*').eq('store_id', storeId).order('name'),
    supabase.from('expenses').select('*, expense_categories(name)')
      .eq('store_id', storeId).gte('expense_date', monthStart)
      .order('expense_date', { ascending: false }),
  ]);

  const total = money((expenses ?? []).reduce((a: any, e: any) => a.plus(D(e.amount)), D(0)));
  const fixed = money((expenses ?? []).filter((e: any) => e.kind === 'fixed').reduce((a: any, e: any) => a.plus(D(e.amount)), D(0)));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">ค่าใช้จ่าย</h1>

      <div className="card grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-xs text-stone-500">รวมเดือนนี้</p><p className="text-lg font-bold">{fmtBaht(total)}</p></div>
        <div><p className="text-xs text-stone-500">ค่าใช้จ่ายคงที่</p><p className="text-lg font-bold">{fmtBaht(fixed)}</p></div>
      </div>

      <ExpenseForm categories={categories ?? []} today={today} />

      <ul className="space-y-2">
        {(expenses ?? []).map((e: any) => (
          <li key={e.id} className="card flex items-center justify-between gap-2 text-sm">
            <div>
              <p className="font-semibold">{e.expense_categories?.name ?? 'อื่น ๆ'}</p>
              <p className="text-xs text-stone-500">
                {fmtDate(e.expense_date)} • {e.kind === 'fixed' ? 'คงที่' : 'แปรผัน'}
                {e.payment_method && ` • ${e.payment_method}`}
              </p>
              {e.note && <p className="text-xs text-stone-500">{e.note}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold tabular-nums">{fmtBaht(e.amount)}</span>
              <form action={deleteExpense}>
                <input type="hidden" name="id" value={e.id} />
                <button className="text-danger" aria-label="ลบ">🗑️</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}