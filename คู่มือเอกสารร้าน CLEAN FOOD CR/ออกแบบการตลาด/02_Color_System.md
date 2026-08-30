# 02 — Color System
## Clean Food CR

---

## 1. Palette

| Role | Hex | ชื่อ | การใช้งาน |
| --- | --- | --- | --- |
| Primary | `#6DBE45` | Healthy Green | พื้นหลัง header, ปุ่มหลัก, โลโก้, กราฟิกหลัก |
| Secondary | `#4A8F2B` | Dark Green | Text บนพื้นเขียวอ่อน, เส้นขอบ, hover state, gradient คู่กับ Primary |
| Accent | `#F6A623` | Warm Orange | CTA button, badge โปรโมชั่น, ราคา, จุดที่ต้องการให้สายตาหยุด |
| Background | `#F7F9F5` | Off-white Green Tint | พื้นหลังหลักของทุกงาน (แทนขาวล้วน เพื่อความอบอุ่น) |
| Text | `#222222` | Primary Text | Headline, body text หลัก |
| Secondary Text | `#666666` | Muted Text | Subheadline, caption, เงื่อนไขย่อย |
| Success | `#39B54A` | Success Green | สถานะสำเร็จ, checkmark, badge "จัดส่งแล้ว" |
| Error | `#E53935` | Error Red | แจ้งเตือน, badge "โควต้าเต็ม", สินค้าหมด |

---

## 2. สัดส่วนการใช้สี (60-30-10 Rule)

- **60% Background** — `#F7F9F5` เป็นพื้นหลักของทุก layout
- **30% Primary/Secondary Green** — กราฟิก, พื้นที่ header/footer, การ์ดโปรโมชั่น
- **10% Accent Orange** — เฉพาะจุด CTA, ราคา, badge — ห้ามใช้เกิน 10% ของพื้นที่ทั้งหมด เพื่อรักษาความพรีเมียม

---

## 3. Contrast & Accessibility

- Text `#222222` บน Background `#F7F9F5` → contrast สูง อ่านง่ายสำหรับกลุ่มผู้สูงอายุ
- ห้ามวาง Secondary Text `#666666` บนพื้น Primary Green โดยตรง (contrast ต่ำ) — ให้ใช้สีขาว (`#FFFFFF`) แทนเมื่ออยู่บนพื้นเขียว
- CTA Button ใช้ Accent Orange + ตัวอักษรสีขาว เท่านั้น (ห้ามใช้ text สีเข้มบนปุ่มส้ม)

---

## 4. Gradient (ใช้เฉพาะ Background/Section ใหญ่)

- Green Gradient: `#6DBE45 → #4A8F2B` ทิศทาง 135° ใช้กับ header banner เท่านั้น
- ห้ามทำ gradient บน text หรือปุ่ม CTA

---

## 5. การใช้สีตามองค์ประกอบ

| องค์ประกอบ | สีที่ใช้ |
| --- | --- |
| ปุ่ม CTA หลัก | Accent Orange + ตัวอักษรขาว |
| ปุ่มรอง/Outline | Primary Green border + text green, พื้นโปร่งใส |
| Badge ราคา/โปรโมชั่น | Accent Orange |
| การ์ดเมนู/โปรโมชั่น | Background ขาวอมเขียว + shadow เบา + ขอบ Primary Green บาง |
| Icon | Secondary Green (outline) |
| แจ้งเตือนผิดพลาด/หมดโควต้า | Error Red |
| แจ้งยืนยันสำเร็จ | Success Green |
