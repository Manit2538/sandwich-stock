'use client';

type Item = { name: string; qty: number; price: number };

type Props = {
  storeName?: string;
  orderNo?: string;
  platform?: string;
  datetime?: string;
  items: Item[];
  grossSales?: number;
  discount?: number;
  netSales?: number;
  note?: string;
};

export default function ReceiptButton(p: Props) {
  function print() {
    const baht = (n: number) =>
      Number(n ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const rows = p.items
      .map(
        (it) => `<tr>
          <td class="l">${it.name}</td>
          <td class="c">${it.qty}</td>
          <td class="r">${baht(it.price * it.qty)}</td>
        </tr>`
      )
      
      .join('');

    const html = `<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8">
<title>ใบเสร็จ ${p.orderNo ?? ''}</title>
<style>
  @page { size: 72mm auto; margin: 0; }
* { box-sizing: border-box; }
body {
  font-family: "Sarabun", "Tahoma", sans-serif;
  font-size: 11px;
  width: 74mm;
  padding: 0 3mm 0 5mm;   /* ★ เพิ่มซ้ายเป็น 5mm */
  margin: 0;
  color: #000;
}

.center { text-align: center; }
.shop { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
.meta { font-size: 10px; color: #000; }
hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th { font-size: 10px; border-bottom: 1px solid #000; padding: 2px 0; }
td { padding: 2px 0; vertical-align: top; }
.l { text-align: left; word-break: break-word; }
.c { text-align: center; width: 28px; }
.r { text-align: right; width: 58px; }
.sum { display: flex; justify-content: space-between; padding: 1px 0; }
.total { font-size: 13px; font-weight: 700; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
.foot { margin-top: 8px; font-size: 10px; }
.logo {
  display: block;
  margin: 0 auto -2px; /* ★ เพิ่มค่าติดลบเพื่อดึงโลโก้ขึ้นไป */
  max-width: 45mm;
  height: auto;
  filter: grayscale(100%) contrast(250%);
}

</style></head>
<body>
  <div class="center">
    <img src="/logo-receipt.png" alt="Logo" class="logo" />
    <!-- <div class="shop">${p.storeName ?? 'ร้านของฉัน'}</div> -->
    <div class="meta">${p.platform ?? ''}</div>
    <div class="meta">${p.datetime ?? ''}</div>
    ${p.orderNo ? `<div class="meta">เลขที่ ${p.orderNo}</div>` : ''}
  </div>
  <hr>
  <table>
    <thead><tr><th class="l">รายการ</th><th class="c">จำนวน</th><th class="r">ราคา</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <hr>
  <div class="sum"><span>ยอดรวม</span><span>${baht(p.grossSales ?? 0)}</span></div>
  ${Number(p.discount ?? 0) > 0 ? `<div class="sum"><span>ส่วนลด</span><span>-${baht(p.discount!)}</span></div>` : ''}
  <div class="sum total"><span>ยอดสุทธิ</span><span>฿${baht(p.netSales ?? 0)}</span></div>
  ${p.note ? `<div class="foot">หมายเหตุ: ${p.note}</div>` : ''}
  <div class="center foot">ขอบคุณที่ใช้บริการ</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=400,height=700');
if (!w) {
  alert('เบราว์เซอร์บล็อกหน้าต่างใหม่ กรุณาอนุญาต popup');
  return;
}
w.document.write(html);
w.document.close();
w.focus();

const doPrint = () => {
  w.print();
  w.close();
};

const img = w.document.querySelector('img.logo') as HTMLImageElement | null;
if (img && !img.complete) {
  img.onload = () => setTimeout(doPrint, 150);
  img.onerror = () => setTimeout(doPrint, 150);
} else {
  setTimeout(doPrint, 350);
}
  }

  return (
    <button type="button" onClick={print} className="btn-ghost text-xs">
      🖨️ ปริ้นใบเสร็จ
    </button>
  );
}