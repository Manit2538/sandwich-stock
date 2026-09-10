'use client';

// เปลี่ยนวิธี import แบบนี้ Vercel จะไม่พยายามหา declaration file
const { useFormStatus } = require('react-dom');

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