'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function SearchBox({ placeholder = 'ค้นหา…' }: { placeholder?: string }) {
  const params = useSearchParams(); const router = useRouter(); const path = usePathname();
  const [v, setV] = useState(params.get('q') ?? '');
  const [pending, start] = useTransition();

  const go = (val: string) => {
    const p = new URLSearchParams(params.toString());
    val ? p.set('q', val) : p.delete('q');
    start(() => router.replace(`${path}?${p.toString()}`));
  };

  return (
    <div className="relative">
      <input value={v} placeholder={placeholder} inputMode="search"
        onChange={(e) => { setV(e.target.value); go(e.target.value); }} className="pl-10" />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">🔍</span>
      {pending && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">…</span>}
    </div>
  );
}