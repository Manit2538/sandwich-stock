import Link from 'next/link';

export default function AlertCenter({ items }: { items: any[] }) {
  if (!items.length) {
    return (
      <div className="card">
        <p className="text-sm">🔔 ศูนย์แจ้งเตือน</p>
        <p className="mt-2 text-sm text-ok">✅ ไม่มีรายการที่ต้องจัดการตอนนี้</p>
      </div>
    );
  }
  return (
    <div className="card">
      <p className="mb-3 font-semibold">🔔 ศูนย์แจ้งเตือน ({items.length})</p>
      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id}
              className={`rounded-xl p-3 text-sm ${n.severity === 'critical'
                ? 'bg-red-50 dark:bg-red-950/40' : 'bg-amber-50 dark:bg-amber-950/40'}`}>
            <p className="font-semibold">{n.title}</p>
            {n.body && <p className="mt-0.5 text-stone-600 dark:text-stone-300">{n.body}</p>}
            {n.action_url && (
              <Link href={n.action_url} className="mt-2 inline-block font-semibold text-brand underline">
                จัดการเลย →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}