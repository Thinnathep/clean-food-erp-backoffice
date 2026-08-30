# 04 — Design System
## Clean Food CR

---

## 1. Grid System

- **Social Post (1:1, 1080×1080):** Grid 12 column, gutter 24px, margin ขอบนอก 64px
- **Poster (A4/Portrait):** Grid 8 column, gutter 20px, margin ขอบนอก 80px
- **Banner (Wide/Facebook Cover):** Grid 12 column, gutter 24px, margin ขอบนอก 48px

---

## 2. Spacing Scale (8px Base Unit)

| Token | Value | การใช้งาน |
|---|---|---|
| xs | 8px | ระยะระหว่าง icon กับ text |
| sm | 16px | ระยะภายใน card เล็ก |
| md | 24px | ระยะระหว่าง element ในกลุ่มเดียวกัน |
| lg | 40px | ระยะระหว่างกลุ่มเนื้อหา (section gap) |
| xl | 64px | Margin ขอบนอกของ artwork |
| xxl | 96px | ระยะ breathing room รอบ headline หลัก (Apple-style) |

---

## 3. Padding & Margin มาตรฐาน

- **Card/Container padding:** 24–32px ทุกด้าน
- **Button padding:** แนวนอน 32px / แนวตั้ง 14px
- **Section margin (ระหว่างบล็อกเนื้อหา):** 40–64px
- **ขอบนอกสุดของภาพ (Safe Zone):** ห้ามวาง text/element สำคัญในระยะ 5% จากขอบภาพทุกด้าน

---

## 4. Rounded Card System

| องค์ประกอบ | Border Radius |
|---|---|
| Card ใหญ่ (โปรโมชั่น, เมนู) | 24px |
| Card เล็ก (badge, tag) | 12px |
| ปุ่ม CTA | 999px (pill shape) |
| รูปภาพในกรอบ | 20px |

---

## 5. Shadow System

- **Soft Shadow มาตรฐาน:** `0px 4px 16px rgba(34,34,34,0.08)` — ใช้กับ card ทุกใบ
- **Elevated Shadow (สำหรับปุ่ม CTA หรือ badge เด่น):** `0px 6px 20px rgba(246,166,35,0.25)` (ใช้เงาโทนส้มจาง เพื่อเน้น CTA)
- **ห้ามใช้:** เงาเข้ม/คมชัดแบบ hard shadow เพราะขัดกับความรู้สึก premium/minimal

---

## 6. Glass Effect (ใช้เฉพาะจุด)

- ใช้เฉพาะกับ badge ราคาที่วางทับภาพอาหาร หรือ tag บนรูปภาพ
- คุณสมบัติ: พื้นหลังขาวโปร่งแสง 70–80% + blur เบา + ขอบบางสีขาว 1px
- **ห้ามใช้ glass effect กับ text บล็อกใหญ่หรือปุ่ม CTA หลัก**

---

## 7. Icon System

- Style: Outline, Minimal, Rounded stroke (stroke width 1.5–2px)
- ขนาดมาตรฐาน: 24px (UI เล็ก), 40px (การ์ดโปรโมชั่น), 64px (Infographic/ไฮไลต์)
- สี: Secondary Green `#4A8F2B` เป็นหลัก, ใช้ Accent Orange เฉพาะ icon ที่ต้องการเน้น (เช่น badge "ส่งฟรี")

---

## 8. Component Library (แนวคิดหลัก — ไม่ใช่โค้ด)

| Component | ลักษณะ |
|---|---|
| Promotion Card | Rounded 24px, soft shadow, รูปอาหาร + badge ราคา + ชื่อโปร + ปุ่ม CTA |
| CTA Button | Pill shape, พื้น Accent Orange, text ขาว, elevated shadow |
| Price Badge | Glass effect, ตัวเลข Poppins Bold สีขาว/เขียวเข้ม |
| Info Tag (ส่งฟรี/แจ้งแพ้อาหารได้) | Rounded 12px, outline icon + text สั้น |
| Section Divider | เส้นบาง 1px สี Primary Green อ่อน 20% opacity + white space รอบข้าง |
