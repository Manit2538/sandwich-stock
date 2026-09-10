'use client';
import { useFormStatus } from 'react-dom';

/** ปุ่มที่ยืนยันก่อนทำงานจริง (ใช้กับลบ / ปรับสต็อก) */
export default function ConfirmButton({ message, children, className = 'btn-danger' }: {
  message: string; children: React.ReactNode; className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit" disabled={pending} className={className}
      onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}
    >
      {pending ? 'กำลังบันทึก…' : children}
    </button>
  );
}