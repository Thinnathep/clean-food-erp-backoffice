# 10 — LINE Broadcast Design Spec
## Clean Food CR

*อ้างอิง: ช่องทางขายหลักคือ LINE OA (@282ovoyd) — ข้อความ Broadcast ต้องกระชับกว่า Facebook เพราะพื้นที่จอ LINE แคบกว่า*

---

## 1. รูปแบบภาพ LINE Broadcast (Rich Message / Image 1040×1040 หรือ 1040×1560)

### Layout โครงสร้าง

```
[ Safe Zone 5% ]
┌───────────────────────┐
│  Badge เวลา cutoff       │  ← เช่น "สั่งก่อน 21:00"
│                         │
│   ภาพอาหาร (Hero)       │  ← 45–50% พื้นที่ (เล็กกว่า Facebook เล็กน้อย
│                         │     เพราะพื้นที่ข้อความต้องมากกว่า)
│                         │
│  Headline (สั้นกว่า FB)  │
│  ราคา + จำนวนกล่อง       │
│  ปุ่ม CTA แบบ Rich Menu  │  ← ใหญ่ ชัด กดง่ายบนมือถือ
└───────────────────────┘
```

---

## 2. Spacing / Grid / Padding / Margin

- Grid: 8 column (พื้นที่จอ LINE แคบกว่า Facebook)
- Margin ขอบนอก: 48px
- Padding content block: 24px
- ระยะห่าง Badge cutoff → ภาพอาหาร: 16px
- ระยะห่าง ราคา → ปุ่ม CTA: 32px

---

## 3. Typography

- Headline: Prompt Bold 40–48px (เล็กกว่า Facebook version ~10% เพราะพื้นที่จำกัด)
- ราคา: Poppins Bold 36–40px, Accent Orange
- Body/เงื่อนไข: Sarabun Regular 16–18px
- ปุ่ม CTA: Prompt SemiBold 18–20px

---

## 4. Icon

- Icon นาฬิกา/เวลา → คู่กับ badge "สั่งก่อน 21:00 น."
- Icon มอเตอร์ไซค์ส่ง → คู่กับข้อความรอบส่ง "11:00–13:00"

---

## 5. Photo Style

- ภาพอาหารเดียวกับชุด Facebook/Poster เพื่อความสม่ำเสมอของแบรนด์ (ไม่ต้องถ่ายใหม่แยกช่องทาง)
- ครอปให้เหมาะกับอัตราส่วนจอ LINE (เน้นตรงกลางภาพ)

---

## 6. Button / CTA

- ใน LINE ควรออกแบบให้ตรงกับปุ่มจริงใน Rich Menu/Flex Message: ปุ่มกว้างเต็มความกว้าง container, สูง 48–56px
- ข้อความปุ่มสั้นมาก เช่น "สั่งเลย" / "ดูโปร" (ไม่ควรเกิน 6 ตัวอักษรไทย)

---

## 7. เนื้อหาเฉพาะที่ต้องมีใน LINE Broadcast (ตามข้อมูลจริง)

- แจ้งเวลาปิดรับออเดอร์: 21:00 น.
- แจ้งรอบส่ง: 11:00–13:00 น.
- ปุ่มลิงก์ไปหน้าสั่งซื้อ/แคตตาล็อกเมนู

---

## 8. Priority & Visual Hierarchy

1. Badge เวลา cutoff (LINE เป็นช่องทางที่ต้องกระตุ้น action ก่อนเวลาปิดรับออเดอร์)
2. ภาพอาหาร + ราคา
3. ปุ่ม CTA
4. Headline
5. เงื่อนไข/รอบส่ง

**หมายเหตุ:** ต่างจาก Facebook ตรงที่ LINE broadcast ต้องเน้น "ความเร่งด่วนของเวลา" มากกว่า เพราะเป้าหมายคือกระตุ้นให้สั่งก่อนตัดรอบ 21:00 น.
