'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard', label: 'ภาพรวม', icon: '🏠' },
  { href: '/sales',     label: 'บันทึกขาย', icon: '🧾' },
  { href: '/plan',      label: 'วางแผน', icon: '📋' },
  { href: '/ingredients', label: 'สต็อก', icon: '📦' },
  { href: '/reports',   label: 'กำไร', icon: '📈' },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur
                    dark:border-stone-800 dark:bg-stone-950/95"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="mx-auto flex max-w-lg">
        {TABS.map((t) => {
          const active = path.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link href={t.href}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium
                  ${active ? 'text-brand' : 'text-stone-500 dark:text-stone-400'}`}>
                <span className="text-xl leading-none">{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}