# 12 — Square Post Layout Design Spec
## Clean Food CR (TikTok Cover / Instagram-style Square ใช้ร่วมกับ Facebook/LINE)

---

## 1. ขนาดมาตรฐาน

- 1080×1080px (Square หลัก สำหรับ Facebook/LINE/TikTok cover)

---

## 2. Layout โครงสร้าง (เวอร์ชันย่อยของ Facebook Post แต่ปรับให้ modular สำหรับใช้ซ้ำหลายโปร)

```
[ Safe Zone 5% ]
┌───────────────────┐
│ Logo เล็ก (corner)   │
│                     │
│   ภาพอาหาร (Hero)    │  ← สัดส่วนคงที่ 1:1 crop กึ่งกลาง
│                     │
│  Headline (2 บรรทัด │
│  สูงสุด)             │
│                     │
│  Price + Badge      │
│                     │
│  ปุ่ม CTA (pill)      │
└───────────────────┘
```

---

## 3. Grid / Spacing / Padding / Margin

- Grid: 12 column, gutter 24px
- Margin ขอบนอก: 64px
- Padding content: 32px
- ความสูง section ภาพ : section ข้อความ = 55:45 (สัดส่วนคงที่ทุกโพสต์ในชุดนี้เพื่อความเป็นระบบ)

---

## 4. Typography

- Headline: Prompt Bold 44–52px, **จำกัดไม่เกิน 2 บรรทัด**
- ราคา: Poppins Bold 36–40px
- Body/เงื่อนไข (ถ้ามี): Sarabun Regular 16px

---

## 5. Icon

- Icon เดียวตามธีมโปร (ใหม่/คุ้มค่า/สุดคุ้ม) วางเป็น badge มุมบน
- ขนาด icon คงที่ 32–40px ทุกโพสต์เพื่อความสม่ำเสมอ (modular system)

---

## 6. Photo Style

- ภาพอาหาร crop สัดส่วน 1:1 กึ่งกลาง (subject centered) เผื่อการแสดงผลบนหน้าปกวิดีโอ TikTok ที่อาจถูกครอปซ้ำ
- แสงธรรมชาติโทนอุ่นตามมาตรฐานแบรนด์

---

## 7. Button / CTA

- Pill shape, Accent Orange, กว้างอย่างน้อย 40% ของความกว้าง artwork
- ข้อความสั้น (ไม่เกิน 4–5 คำ) เพราะพื้นที่จำกัดกว่าโพสต์แนวตั้ง

---

## 8. Priority & Visual Hierarchy

1. ภาพอาหาร
2. Headline + ราคา
3. Badge ธีมโปร
4. ปุ่ม CTA

**หมายเหตุการใช้งาน:** เทมเพลตนี้ออกแบบให้เป็น "โมดูล" ที่สลับแค่ภาพ/ราคา/ธีมได้ทันที เพื่อให้ผลิตโพสต์ใหม่รายสัปดาห์ได้เร็ว โดยไม่ต้องออกแบบ layout ใหม่ทุกครั้ง — ตอบโจทย์การทำงานคนเดียว
