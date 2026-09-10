export default function StatCard({ label, value, sub, tone = 'neutral' }: {
  label: string; value: string; sub?: string;
  tone?: 'neutral' | 'good' | 'bad';
}) {
  const toneCls = tone === 'good' ? 'text-ok' : tone === 'bad' ? 'text-danger' : '';
  return (
    <div className="card">
      <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${toneCls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{sub}</p>}
    </div>
  );
}