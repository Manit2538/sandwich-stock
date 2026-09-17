'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MENU = [
  { href: '/dashboard',     label: 'ภาพรวม' },
  { href: '/ingredients',   label: 'วัตถุดิบและสต็อก' },
  { href: '/purchases',     label: 'ซื้อของ / เติมสต็อก' },
  { href: '/recipes',       label: 'สูตรอาหารและเมนู' },
  { href: '/plan',          label: 'วางแผนขายวันนี้' },
  { href: '/shopping-list', label: 'รายการซื้อของ' },
  { href: '/sales',         label: 'บันทึกยอดขาย' },
  { href: '/expenses',      label: 'ค่าใช้จ่าย' },
  { href: '/reports',       label: 'รายงานกำไร' },
  { href: '/settings',      label: 'ตั้งค่าร้าน' },
    { href: '/qr',          label: 'QR Code สั่งอาหาร' },
  { href: '/kitchen',       label: '🔔 ออร์เดอร์ลูกค้า' }
];

export default function AppNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (pathname.startsWith('/order/')) {

    return null;

  }

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button className="nav-fab" onClick={() => setOpen(true)} aria-label="เปิดเมนู">
        <span /><span /><span />
      </button>

      {open && <div className="nav-overlay" onClick={() => setOpen(false)} />}

      <aside className={`nav-drawer ${open ? 'open' : ''}`}>
        <div className="nav-drawer-head">
          <span>เมนูทั้งหมด</span>
          <button className="nav-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <nav className="nav-list">
          {MENU.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={`nav-item ${pathname === m.href ? 'active' : ''}`}
            >
              {m.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}