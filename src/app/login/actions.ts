'use server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signIn(_prev: any, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  });
  if (error) return { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
  redirect('/dashboard');
}

export async function signUp(_prev: any, formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const storeName = String(formData.get('store_name') || 'ร้านแซนวิชของฉัน');

  const { error } = await supabase.auth.signUp({
    email, password, options: { data: { full_name: storeName } },
  });
  if (error) return { error: `สมัครไม่สำเร็จ: ${error.message}` };

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { error: rpcErr } = await supabase.rpc('fn_bootstrap_store', { p_store_name: storeName });
    if (rpcErr) return { error: `สร้างร้านไม่สำเร็จ: ${rpcErr.message}` };
    redirect('/dashboard');
  }
  return { error: null, message: 'สมัครสำเร็จ กรุณายืนยันอีเมลแล้วเข้าสู่ระบบ' };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}