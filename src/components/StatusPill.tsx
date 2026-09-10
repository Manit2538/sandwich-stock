type Props = { status: 'ok' | 'warn' | 'danger'; label: string };

const ICON = { ok: '✅', warn: '⚠️', danger: '❌' } as const;
const CLS = { ok: 'pill-ok', warn: 'pill-warn', danger: 'pill-danger' } as const;

/** ไม่พึ่งสีอย่างเดียว — มีทั้งไอคอนและข้อความกำกับเสมอ */
export default function StatusPill({ status, label }: Props) {
  return <span className={CLS[status]}><span aria-hidden>{ICON[status]}</span>{label}</span>;
}