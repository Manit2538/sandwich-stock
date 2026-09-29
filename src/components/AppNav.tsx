'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MENU = [
  {
    title: 'ภาพรวม',
    items: [
      { href: '/dashboard', label: 'ภาพรวม', icon: '📊' },
    ],
  },
  {
    title: 'หน้าร้าน / การขาย',
    items: [
      { href: '/kitchen', label: 'ออร์เดอร์ลูกค้า', icon: '🔔' },
      { href: '/sales', label: 'บันทึกยอดขาย', icon: '💰' },
      { href: '/plan', label: 'วางแผนขายวันนี้', icon: '🗓️' },
      { href: '/qr', label: 'QR Code สั่งอาหาร', icon: '📱' },
    ],
  },
  {
    title: 'คลังและวัตถุดิบ',
    items: [
      { href: '/ingredients', label: 'วัตถุดิบและสต็อก', icon: '📦' },
      { href: '/purchases', label: 'ซื้อของ / เติมสต็อก', icon: '🛒' },
      { href: '/shopping-list', label: 'รายการซื้อของ', icon: '📋' },
      { href: '/recipes', label: 'สูตรอาหารและเมนู', icon: '🥪' },
    ],
  },
  {
    title: 'การเงินและรายงาน',
    items: [
      { href: '/expenses', label: 'ค่าใช้จ่าย', icon: '🧾' },
      { href: '/reports', label: 'รายงานกำไร', icon: '📈' },
      { href: '/reports/channels', label: 'กำไรแยกช่องทาง', icon: '🧮' },
    ],
  },
  {
    title: 'ตั้งค่า',
    items: [
      { href: '/settings', label: 'ตั้งค่าร้าน', icon: '⚙️' },
    ],
  },
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
          {MENU.map((group) => (
            <div key={group.title} className="nav-group">
              <div className="nav-group-title">{group.title}</div>
              {group.items.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className={`nav-item ${pathname === m.href ? 'active' : ''}`}
                >
                  <span className="nav-item-icon">{m.icon}</span>
                  <span>{m.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}