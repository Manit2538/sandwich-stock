// src/components/PrintReceipt.tsx
'use client';

export default function PrintReceipt({ sale, shop }: { sale: any; shop: any }) {
  const handlePrint = () => {
    const w = window.open('', '', 'width=320,height=600');
    if (!w) return;
    w.document.write(`
      <html><head><meta charset="utf-8"><title>ใบเสร็จ</title>
      <style>
        @page { size: 58mm auto; margin: 2mm; }
        body { font-family: 'Sarabun', sans-serif; font-size: 12px; width: 54mm; }
        .c { text-align: center; } .r { text-align: right; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
      </style></head><body>
        <div class="c"><b>${shop?.name ?? 'ร้านแซนด์วิช'}</b><br/>${shop?.phone ?? ''}</div>
        <div class="line"></div>
        <div>เลขที่: ${sale.id}</div>
        <div>วันที่: ${new Date(sale.sold_at).toLocaleString('th-TH')}</div>
        <div class="line"></div>
        <table>
          ${sale.items.map((i: any) => `
            <tr><td>${i.name} x${i.qty}</td><td class="r">${(i.price * i.qty).toFixed(2)}</td></tr>
          `).join('')}
        </table>
        <div class="line"></div>
        <table><tr><td><b>รวม</b></td><td class="r"><b>${sale.total.toFixed(2)} ฿</b></td></tr></table>
        <div class="line"></div>
        <div class="c">ขอบคุณที่อุดหนุนค่ะ 🙏</div>
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return <button onClick={handlePrint} className="btn">🖨️ ปริ้นใบเสร็จ</button>;
}