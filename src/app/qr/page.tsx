'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STORE_ID = '9e99ccc8-88ef-4092-9a9a-99293db146dd';

export default function QRPage() {
  const [url, setUrl] = useState('');
  const [storeName, setStoreName] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUrl(`${window.location.origin}/order/${STORE_ID}`);
    supabase
      .from('stores')
      .select('name')
      .eq('id', STORE_ID)
      .single()
      .then(({ data }) => setStoreName(data?.name ?? ''));
  }, []);

  function download() {
    const canvas = boxRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'qr-order.png';
    a.click();
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-center text-xl font-bold">QR สั่งอาหาร</h1>

      <div ref={boxRef} className="rounded-2xl border-2 bg-white p-6 text-center text-black">
        <div className="text-lg font-bold">{storeName}</div>
        <div className="mb-4 text-sm text-gray-500">สแกนเพื่อสั่งอาหาร</div>
       {url && (
  <div className="flex justify-center my-4">
    <QRCodeCanvas value={url} size={240} level="M" />
  </div>
)}

        <div className="mt-4 text-sm font-medium">📱 สั่งเอง · รอรับที่ร้าน</div>
        <div className="mt-1 text-xs text-gray-400">ชำระเงินที่เคาน์เตอร์</div>
      </div>

      <button
        onClick={download}
        className="mt-4 w-full rounded-lg bg-gray-800 py-2.5 text-sm font-semibold text-white"
      >
        ดาวน์โหลด PNG
      </button>

      <button
        onClick={() => window.print()}
        className="mt-2 w-full rounded-lg border py-2.5 text-sm"
      >
        พิมพ์
      </button>

      <div className="mt-4 break-all rounded-lg bg-gray-100 p-3 text-xs text-gray-600">
        {url}
      </div>
    </div>
  );
}