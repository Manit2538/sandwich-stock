import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import ThemeToggle from '@/components/ThemeToggle';
import { requireStore } from '@/lib/supabase/queries';
import { signOut } from '@/app/login/actions';

const MENU = [
  { href: '/dashboard', label: 'ภาพรวม' },
  { href: '/ingredients', label: 'วัตถุดิบและสต็อก' },
  { href: '/purchases', label: 'ซื้อของ / เติมสต็อก' },
  { href: '/recipes', label: 'สูตรอาหารและเมนู' },
  { href: '/plan', label: 'วางแผนขายวันนี้' },
  { href: '/shopping-list', label: 'รายการซื้อของ' },
  { href: '/sales', label: 'บันทึกยอดขาย' },
  { href: '/expenses', label: 'ค่าใช้จ่าย' },
  { href: '/reports', label: 'รายงานกำไร' },
  { href: '/settings', label: 'ตั้งค่าร้าน' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { store } = await requireStore();

  return (
    <div className="min-h-dvh pb-20">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <span className="text-2xl">🥪</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{store.name}</p>
            <p className="text-[11px] text-stone-500">เวลาไทย (Asia/Bangkok)</p>
          </div>
          <ThemeToggle />
          <form action={signOut}><button className="rounded-full p-2 text-xl" aria-label="ออกจากระบบ">🚪</button></form>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4">{children}</main>

      <div className="mx-auto max-w-lg px-4 pb-6">
        <details className="card">
          <summary className="cursor-pointer font-semibold">เมนูทั้งหมด</summary>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {MENU.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="btn-ghost w-full text-sm">{m.label}</Link>
              </li>
            ))}
          </ul>
        </details>
      </div>

      <BottomNav />
    </div>
  );
}