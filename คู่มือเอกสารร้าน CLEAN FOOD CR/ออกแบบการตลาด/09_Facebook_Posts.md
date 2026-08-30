# 09 — Facebook Posts Design Spec
## Clean Food CR

---

## 1. รูปแบบโพสต์ Facebook (Square 1080×1080 + Feed Portrait 1080×1350)

### 1.1 Layout โครงสร้างหลัก

```
[ Safe Zone 5% ทุกด้าน ]
┌───────────────────────────┐
│ Logo เล็ก (top-left)        │  ← 40px height
│                             │
│      ภาพอาหาร (Hero)        │  ← 50–60% ของพื้นที่
│                             │
│  Headline                  │
│  Subheadline                │
│  Price Badge                │
│  CTA Button (pill)          │
│                             │
│ Footer: ช่องทางสั่งซื้อ       │  ← LINE OA / เบอร์ / ลิงก์
└───────────────────────────┘
```

---

## 2. Spacing / Grid / Padding / Margin

- Grid: 12 column (Square) / 8 column (Portrait feed)
- Gutter: 24px
- Margin ขอบนอก: 64px (Square), 56px (Portrait)
- Padding content block: 32px
- ระยะห่าง Logo → ภาพอาหาร: 24px
- ระยะห่าง CTA → Footer: 40px

---

## 3. Typography

- Headline: Prompt Bold 44–52px
- Subheadline: Prompt Medium 22–26px, สี `#666666`
- ราคา: Poppins Bold 36–40px, สี Accent Orange
- Footer text (ช่องทางสั่งซื้อ): Sarabun Regular 16–18px

---

## 4. Icon

- Icon ช่องทางสั่งซื้อ (LINE, Facebook) → outline minimal, ขนาด 24px วางคู่กับ text footer
- Icon "ส่งฟรี" ถ้ามีในโพสต์ → outline รถ/กล่อง วางใกล้เงื่อนไขจัดส่ง

---

## 5. Photo Style

- ภาพอาหารเป็น hero หลักเสมอ แสงธรรมชาติ โทนอุ่น
- หลีกเลี่ยงการใส่ text ทับภาพอาหารโดยตรง (ยกเว้น badge ราคาแบบ glass effect)
- อัตราส่วนภาพที่ใช้ 1:1 (Square) หรือ 4:5 (Portrait) — ไม่ครอปภาพจนขาดองค์ประกอบสำคัญ

---

## 6. Button / CTA

- Pill shape, Accent Orange, ตัวอักษรขาว Prompt SemiBold
- วางตำแหน่ง: กึ่งกลางด้านล่างของ content block เหนือ footer
- ขนาดปุ่ม: กว้างอย่างน้อย 40% ของความกว้าง artwork เพื่อให้เห็นชัดในฟีดมือถือ

---

## 7. Priority & Visual Hierarchy

1. ภาพอาหาร (Hero)
2. Headline + ราคา
3. CTA Button
4. Subheadline
5. Footer (ช่องทางสั่งซื้อ)
6. Logo

**หมายเหตุการใช้งานจริงบน Facebook:** ข้อความ 20% แรกของโพสต์ (caption) ต้องสรุปโปรโมชั่นให้ครบใน 1–2 บรรทัดแรก เนื่องจาก Facebook ตัดข้อความ "อ่านเพิ่มเติม" หลังบรรทัดที่ 3
