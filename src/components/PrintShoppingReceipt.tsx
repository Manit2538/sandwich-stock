'use client';

export default function PrintShoppingReceipt({ list, shop }: { list: any; shop: any }) {
  const handlePrint = () => {
    const w = window.open('', '', 'width=320,height=600');
    if (!w) return;

    const items = list.shopping_list_items ?? [];

    w.document.write(`
      <html>
      <head><meta charset="utf-8"><title>ใบรายการซื้อของ</title>
      <style>
        @page { size: 80mm auto; margin: 2mm; }
        body { font-family: 'Sarabun', sans-serif; font-size: 12px; width: 72mm; color: #000; }
        .c { text-align: center; } 
        .r { text-align: right; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { border-bottom: 1px solid #000; padding-bottom: 2px; }
        td { padding: 2px 0; vertical-align: top; }
      </style>
      </head>
      <body>
        <div class="c" style="font-weight: bold; font-size: 14px;">${shop?.name ?? 'รายการซื้อของ'}</div>
        <div class="c" style="font-size: 10px;">วันที่แผน: ${list.production_plans?.plan_date ?? '-'}</div>
        <div class="c" style="font-size: 10px;">สร้างเมื่อ: ${new Date(list.created_at).toLocaleString('th-TH')}</div>
        <div class="line"></div>
        
        <table>
          <tr>
            <th align="left">รายการ</th>
            <th align="right">จำนวน</th>
          </tr>
          ${items.map((i: any) => `
            <tr>
              <td>${i.ingredients?.name ?? '-'}</td>
              <td class="r">${i.qty_short ?? 0} ${i.units?.name_th ?? ''}</td>
            </tr>
          `).join('')}
        </table>

        <div class="line"></div>
        <table>
          <tr>
            <td><b>ยอดรวมประเมิน</b></td>
            <td class="r"><b>฿${Number(list.estimated_total ?? 0).toFixed(2)}</b></td>
          </tr>
        </table>

        <div class="line"></div>
        <div class="c" style="font-size: 10px;">--- ใบรายการซื้อวัตถุดิบ ---</div>
      </body>
      </html>
    `);

    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return (
    <button onClick={handlePrint} className="btn-secondary w-full">
      🖨️ พิมพ์รายการซื้อของ
    </button>
  );
}