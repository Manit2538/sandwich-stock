'use client';
import { useActionState, useState } from 'react';
import { signIn, signUp } from './actions';

export default function LoginPage() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [state, action, pending] = useActionState(mode === 'in' ? signIn : signUp, null as any);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
      <div className="mb-6 text-center">
        <p className="text-5xl">🥪</p>
        <h1 className="mt-2 text-2xl font-bold">Sandwich Stock &amp; Profit</h1>
        <p className="text-sm text-stone-500">จัดการต้นทุน สต็อก และกำไร ในที่เดียว</p>
      </div>

      <div className="card">
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
          <button onClick={() => setMode('in')}
            className={`rounded-lg py-2 text-sm font-semibold ${mode === 'in' ? 'bg-white shadow dark:bg-stone-700' : ''}`}>
            เข้าสู่ระบบ
          </button>
          <button onClick={() => setMode('up')}
            className={`rounded-lg py-2 text-sm font-semibold ${mode === 'up' ? 'bg-white shadow dark:bg-stone-700' : ''}`}>
            สมัครใช้งาน
          </button>
        </div>

        <form action={action} className="space-y-4">
          {mode === 'up' && (
            <div>
              <label htmlFor="store_name">ชื่อร้าน</label>
              <input id="store_name" name="store_name" required placeholder="เช่น ร้านแซนวิชย่างบ้านนา" />
            </div>
          )}
          <div>
            <label htmlFor="email">อีเมล</label>
            <input id="email" name="email" type="email" required inputMode="email" autoComplete="email" />
          </div>
          <div>
            <label htmlFor="password">รหัสผ่าน</label>
            <input id="password" name="password" type="password" required minLength={6}
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
          </div>

          {state?.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-danger dark:bg-red-950/40">❌ {state.error}</p>}
          {state?.message && <p className="rounded-xl bg-green-50 p-3 text-sm text-ok dark:bg-green-950/40">✅ {state.message}</p>}

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? 'กำลังดำเนินการ…' : mode === 'in' ? 'เข้าสู่ระบบ' : 'สมัครและสร้างร้าน'}
          </button>
        </form>
      </div>
    </main>
  );
}