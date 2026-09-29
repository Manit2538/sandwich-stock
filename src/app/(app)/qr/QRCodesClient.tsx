'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

type Props = { storeId: string; storeName: string };

const CARDS = [
  {
    key: 'takeaway',
    title: 'สั่งกลับบ้าน',
    subtitle: 'สแกนเพื่อสั่งอาหาร · รับที่ร้าน',
    emoji: '🥡',
    color: '#16a34a',
    query: '?type=takeaway',
  },
  {
    key: 'company',
    title: 'สั่งในบริษัท',
    subtitle: 'สแกนแล้วเลือกฝ่าย · เราเดินไปส่งให้',
    emoji: '🏢',
    color: '#ea580c',
    query: '?type=company',
  },
];

export default function QRCodesClient({ storeId, storeName }: Props) {
  const [origin, setOrigin] = useState('');
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => setOrigin(window.location.origin), []);

  const urlOf = (q: string) => `${origin}/order/${storeId}${q}`;

  function download(key: string, title: string) {
    const canvas = refs.current[key]?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `QR-${title}.png`;
    a.click();
  }

  if (!origin) return <div className="p-6 text-center text-stone-500">กำลังเตรียม QR…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-lg font-bold">QR Code สั่งอาหาร</h1>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-white"
        >
          ปริ้นท์ทั้งสองใบ
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((c) => (
          <div
            key={c.key}
            ref={(el) => { refs.current[c.key] = el; }}
            className="break-inside-avoid rounded-2xl border-2 bg-white p-5 text-center text-black"
            style={{ borderColor: c.color }}
          >
            <div className="text-3xl">{c.emoji}</div>
            <div className="mt-1 text-lg font-bold" style={{ color: c.color }}>
              {c.title}
            </div>
            <div className="text-xs text-gray-500">{storeName}</div>

            <div className="my-4 flex justify-center">
              <QRCodeCanvas
                value={urlOf(c.query)}
                size={220}
                level="M"
                includeMargin
                fgColor="#000000"
                bgColor="#ffffff"
              />
            </div>

            <div className="text-sm font-medium">{c.subtitle}</div>
            <div className="mt-2 break-all text-[10px] text-gray-400">{urlOf(c.query)}</div>

            <button
              onClick={() => download(c.key, c.title)}
              className="mt-3 w-full rounded-lg py-2 text-xs font-semibold text-white print:hidden"
              style={{ backgroundColor: c.color }}
            >
              ดาวน์โหลดรูป PNG
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}