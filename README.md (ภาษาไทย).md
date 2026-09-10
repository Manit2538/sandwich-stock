# 🥪 Sandwich Stock & Profit   

ระบบจัดการต้นทุน สต็อก และกำไร สำหรับร้านแซนวิชย่างเดลิเวอรีขนาดเล็ก
Mobile-first · ภาษาไทย · PWA · เงินบาท (฿) · เวลา Asia/Bangkok

## ✨ ฟีเจอร์ใน MVP
- บันทึกวัตถุดิบ หน่วยฐาน จุดสั่งซื้อ และสต็อกเป้าหมาย
- บันทึกซื้อของ → คำนวณต้นทุนต่อหน่วยและต้นทุนเฉลี่ยถ่วงน้ำหนักอัตโนมัติ
- สร้างสูตรเมนู → คำนวณต้นทุน กำไร และ Margin ต่อชิ้นทันที
- วางแผนขาย → คำนวณวัตถุดิบที่ต้องใช้ แยกเป็นเขียว/เหลือง/แดง
- สร้างรายการซื้อของอัตโนมัติพร้อมงบประมาณ
- บันทึกยอดขาย → ตัดสต็อกแบบ FIFO และบันทึก COGS จริง
- บันทึกของเสีย ปรับสต็อกจากการนับจริง พร้อมประวัติทุกครั้ง
- รายงานกำไรรายวัน / 7 วัน / รายเดือน และกำไรรายเมนู
- ศูนย์แจ้งเตือน: ของใกล้หมด หมดสต็อก ใกล้หมดอายุ กำไรต่ำกว่าเป้า ต้นทุนพุ่ง

## 🚧 ยังไม่รองรับ (แสดง "อยู่ระหว่างพัฒนา" ในหน้าจอ)
- เชื่อมต่อ API GrabFood / LINE MAN / ShopeeFood (ต้องมี credentials จริง)
- อัปโหลดรูปเมนู
- กราฟแนวโน้มย้อนหลัง
- บันทึกข้อมูลแบบออฟไลน์

## 🧰 เทคโนโลยี
Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Storage) · decimal.js · Vitest

---

## 1) ติดตั้งเครื่องมือ

ต้องมี **Node.js 20 ขึ้นไป** และ **Git**

```bash
node -v   # ควรเป็น v20.x หรือสูงกว่า
npm -v
```

## 2) ติดตั้งโปรเจกต์

```bash
git clone <URL ของ repo>
cd sandwich-stock
npm install
```

## 3) สร้างโปรเจกต์ Supabase

1. เข้า https://supabase.com → **New project**
2. ตั้งชื่อโปรเจกต์ + ตั้ง Database Password (เก็บไว้ให้ดี)
3. เลือก Region: **Southeast Asia (Singapore)**
4. รอสร้างเสร็จประมาณ 2 นาที

### คัดลอก API Keys
ไปที่ **Project Settings → API** แล้วคัดลอก
- `Project URL`
- `anon public` key

## 4) ตั้งค่า Environment Variables

คัดลอกไฟล์ตัวอย่าง แล้วใส่ค่าจริง

```bash
# Windows PowerShell
Copy-Item .env.local.example .env.local
# macOS / Linux
cp .env.local.example .env.local
```

แก้ไฟล์ `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_TZ=Asia/Bangkok
```

## 5) รัน Migrations

ไปที่ Supabase Dashboard → **SQL Editor** → **New query**
แล้วรันไฟล์ตามลำดับ (คัดลอกเนื้อหาไปวางแล้วกด Run):

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_functions.sql`

> ⚠️ ต้องรันตามลำดับ เพราะไฟล์ที่ 2 และ 3 อ้างอิงตารางจากไฟล์ที่ 1

## 6) ปิดการยืนยันอีเมล (สำหรับการทดสอบ)

Supabase → **Authentication → Providers → Email** → ปิด **Confirm email** → Save
(ถ้าใช้งานจริง แนะนำให้เปิดไว้)

## 7) รันแอป

```bash
npm run dev
```

เปิด http://localhost:3000 → กด **สมัครใช้งาน** → ใส่ชื่อร้าน อีเมล รหัสผ่าน
ระบบจะสร้างร้าน หน่วยวัด หมวดหมู่ และแพลตฟอร์มพื้นฐานให้อัตโนมัติ

## 8) ใส่ข้อมูลตัวอย่าง (ไม่บังคับ)

หลังสมัครสมาชิกแล้ว เปิด `supabase/seed.sql`
แก้บรรทัด `where email = 'you@example.com'` เป็นอีเมลที่คุณสมัคร
แล้วนำไปรันใน SQL Editor

จะได้วัตถุดิบ 10 รายการ พร้อมสต็อกเริ่มต้น และเมนู 3 รายการพร้อมสูตร

## 9) รัน Unit Tests

```bash
npm run test          # รันครั้งเดียว
npm run test:watch    # รันแบบ watch
```

ครอบคลุม: การแปลงหน่วย · ต้นทุนเฉลี่ย · ต้นทุนเมนู · ตัดสต็อก FIFO · กำไร · รายการซื้อของ

## 10) ติดตั้งเป็นแอปบนมือถือ (PWA)

**Android (Chrome):** เปิดเว็บ → เมนู ⋮ → "ติดตั้งแอป" / "เพิ่มไปยังหน้าจอหลัก"
**iPhone (Safari):** เปิดเว็บ → ปุ่มแชร์ → "เพิ่มไปยังหน้าจอโฮม"

> ต้องเป็น HTTPS จึงจะติดตั้งได้ (ใช้ URL จาก Vercel)

## 11) Deploy ขึ้น Vercel

```bash
npm i -g vercel
vercel login
vercel
```

หรือผ่านหน้าเว็บ:
1. Push โค้ดขึ้น GitHub
2. https://vercel.com → **Add New → Project** → เลือก repo
3. ใส่ Environment Variables ทั้ง 3 ตัวจาก `.env.local`
4. กด **Deploy**

หลัง Deploy: กลับไปที่ Supabase → **Authentication → URL Configuration**
ใส่ Site URL เป็น URL ของ Vercel (เช่น `https://sandwich-stock.vercel.app`)

---

## 📖 คู่มือใช้งานเบื้องต้น

### เริ่มต้นครั้งแรก
1. **ตั้งค่าร้าน** → กำหนดเป้ากำไร ค่าคอมแต่ละแพลตฟอร์ม
2. **วัตถุดิบและสต็อก** → เพิ่มวัตถุดิบทั้งหมด
3. **ซื้อของ / เติมสต็อก** → บันทึกการซื้อครั้งแรก (ระบบคำนวณต้นทุน/หน่วยให้)
4. **สูตรอาหารและเมนู** → สร้างเมนูและใส่สูตร → ดูต้นทุนและกำไรทันที

### ใช้งานประจำวัน
1. **วางแผนขายวันนี้** → ใส่จำนวนที่คิดว่าจะขาย → ดูว่าของพอไหม
2. **สร้างรายการซื้อของ** → ไปซื้อของตามลิสต์
3. **ซื้อของ / เติมสต็อก** → บันทึกที่ซื้อมา
4. **บันทึกยอดขาย** → ทุกครั้งที่มีออร์เดอร์ (ระบบตัดสต็อกให้)
5. **รายงานกำไร** → ดูสรุปตอนสิ้นวัน

### เคล็ดลับ
- ตั้ง **จุดสั่งซื้อใหม่** = ปริมาณที่ใช้ประมาณ 2 วัน จะได้เตือนทัน
- ตั้ง **สต็อกเป้าหมาย** = ปริมาณที่ใช้ประมาณ 1 สัปดาห์
- กรอก **วันหมดอายุ** ทุกครั้งที่ซื้อของสด ระบบจะตัดของที่ใกล้หมดอายุก่อนเสมอ
- ถ้าสต็อกในระบบไม่ตรงกับของจริง ใช้ปุ่ม **"นับสต็อกจริง"** ในหน้าวัตถุดิบ

---

## 🗂️ โครงสร้างโปรเจกต์

```
src/lib/          ← ตรรกะการคำนวณล้วน (ทดสอบได้ 100%)
src/lib/supabase/ ← เชื่อมต่อฐานข้อมูล
src/app/(app)/    ← หน้าจอทั้งหมด (ต้องล็อกอิน)
src/components/   ← UI components ที่ใช้ซ้ำ
supabase/         ← Migrations + Seed data
tests/            ← Unit tests
```

## ❓ แก้ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
|---|---|
| `Invalid API key` | ตรวจว่า `.env.local` ถูกต้อง แล้ว restart `npm run dev` |
| หน้าขาว / redirect วนไปหน้า login | ล้าง cookies ของ localhost แล้วล็อกอินใหม่ |
| `permission denied for table` | ยังไม่ได้รัน `0002_rls.sql` |
| `function fn_... does not exist` | ยังไม่ได้รัน `0003_functions.sql` |
| Seed แจ้ง "ไม่พบผู้ใช้" | ต้องสมัครสมาชิกในแอปก่อน แล้วแก้อีเมลใน seed.sql |
| PWA ติดตั้งไม่ได้ | ต้องเปิดผ่าน HTTPS เท่านั้น |

## 📄 License
MIT