'use client';

type Props = {
  rows: Record<string, any>[];
  filename?: string;
  label?: string;
};

export default function ExportButton({ rows, filename = 'export', label = '⬇️ ดาวน์โหลด Excel' }: Props) {
  function handleExport() {
    if (!rows?.length) {
      alert('ไม่มีข้อมูลให้ดาวน์โหลด');
      return;
    }

    const headers = Object.keys(rows[0]);

    const esc = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => esc(r[h])).join(',')),
    ].join('\n');

    // \uFEFF = BOM ทำให้ Excel อ่านภาษาไทยไม่เพี้ยน
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={handleExport} className="btn-ghost text-xs">
      {label}
    </button>
  );
}