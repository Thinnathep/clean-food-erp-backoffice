# 13 — Banner Layout Design Spec
## Clean Food CR (Facebook Cover / Website Hero Banner)

*หมายเหตุ: Website เป็นเพียงข้อมูลประกอบ ไม่ใช่ช่องทางขายหลัก — banner นี้จึงเน้นสร้างความน่าเชื่อถือ (trust) มากกว่ากระตุ้นซื้อทันที*

---

## 1. ขนาดมาตรฐาน

- Facebook Cover: 1640×924px
- Website Hero: 1920×800px (wide)

---

## 2. Layout โครงสร้าง

```
[ Safe Zone 5% ]
┌───────────────────────────────────┐
│  Logo (left)         │  Headline    │
│                       │  Subheadline │
│   ภาพอาหาร Hero        │              │
│   (ขวา หรือเต็มพื้นหลัง  │  CTA เล็ก    │
│    แบบ overlay)        │              │
└───────────────────────────────────┘
```

- **โครงสร้างแบบ Split:** ซ้าย = ข้อความ (40%), ขวา = ภาพอาหาร (60%)
- ใช้ gradient green overlay บางๆ บนภาพ ฝั่งที่มีข้อความ เพื่อให้ text อ่านง่ายโดยไม่บังภาพ

---

## 3. Grid / Spacing / Padding / Margin

- Grid: 12 column, gutter 24px
- Margin ขอบนอก: 48–64px (wide banner ต้องเผื่อ margin มากกว่าปกติเพราะพื้นที่ crop ต่างกันในแต่ละแพลตฟอร์ม)
- Padding text block: 40px
- Safe zone สำหรับ Facebook Cover: เผื่อพื้นที่ 20% ด้านล่างสำหรับ profile picture overlap (ไม่วาง text สำคัญโซนนี้)

---

## 4. Typography

- Headline: Prompt Bold 40–48px (banner แนวนอน headline ไม่ควรใหญ่เกินเพราะพื้นที่แนวตั้งจำกัด)
- Subheadline: Prompt Medium 20–24px
- CTA text (ถ้ามี): Prompt SemiBold 16–18px

---

## 5. Icon

- Icon เล็กประกอบ trust signal เช่น "ทำสดตามออเดอร์" / "ส่งฟรีในเขตเมือง" วางเป็นแถวเล็กใต้ subheadline
- ขนาด icon 20px คู่กับ text 14–16px

---

## 6. Photo Style

- ภาพอาหาร wide-angle หรือ lifestyle (คนกำลังรับกล่องอาหาร) เพื่อสื่อความน่าเชื่อถือมากกว่าโปรโมชั่นเฉพาะราคา
- โทนแสงเดียวกับชุดภาพหลักของแบรนด์

---

## 7. Button / CTA

- Banner นี้เน้น brand awareness มากกว่าปิดการขาย → CTA เป็นทางเลือก ไม่บังคับต้องมี
- ถ้ามี ใช้ text link แบบ underline หรือปุ่ม outline (ไม่ใช้ปุ่ม solid Accent Orange เต็มแบบโปรโมชั่น เพราะ banner นี้ไม่ใช่จุดขายตรง)

---

## 8. Priority & Visual Hierarchy

1. ภาพอาหาร/lifestyle (สร้างความรู้สึกแบรนด์)
2. Headline (ข้อความแบรนด์หลัก ไม่ใช่ราคาโปร)
3. Subheadline
4. Trust signal icons
5. CTA (รอง)

**เหตุผล:** ต่างจาก Promotion Post ที่เน้นราคา/ปิดการขาย banner นี้ใช้จุดที่ลูกค้าเห็นแบรนด์ครั้งแรก (cover photo/เว็บไซต์) จึงเน้นสร้างความน่าเชื่อถือและตัวตนแบรนด์มากกว่า
