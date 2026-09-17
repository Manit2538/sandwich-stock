import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * อัปเดต matcher ให้ยกเว้น path สำหรับลูกค้า (เช่น /order)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js|order/.*).*)',
  ],
};
