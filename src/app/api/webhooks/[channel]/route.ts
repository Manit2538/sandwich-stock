// src/app/api/webhooks/[channel]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/channels';

export async function POST(
  req: NextRequest,
  { params }: { params: { channel: string } }
) {
  const rawBody = await req.text();
  const adapter = getAdapter(params.channel);
  if (!adapter) return NextResponse.json({ error: 'unknown channel' }, { status: 404 });

  // 1. ตรวจลายเซ็น กันคนยิง webhook ปลอม
  if (!adapter.verifySignature(rawBody, req.headers)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  // 2. บันทึก payload ดิบก่อนเสมอ แล้วค่อยประมวลผลทีหลัง
  //    ตอบ 200 ให้เร็วที่สุด ไม่งั้นแพลตฟอร์มจะ retry รัวๆ
  await saveRawEvent(params.channel, payload);

  return NextResponse.json({ ok: true });
}