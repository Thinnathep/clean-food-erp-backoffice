# 10 — AI Memory (สำหรับส่งต่อให้ ChatGPT / Antigravity / AI ตัวอื่น)

> Source: สรุปรวมจากไฟล์ทั้งหมดในชุดนี้ — ใช้เป็น context เดียวที่ verified แล้ว
> อ้างอิงกับ: ทุกไฟล์ในชุด Business Foundation

## ✅ Verified Facts (ยืนยันจากไฟล์ต้นฉบับ — ใช้อ้างอิงได้)

```yaml
business_name: Clean Food CR
product_type: Healthy meal planning
menu_count: 32
price_range_thb: [59, 99]
avg_food_cost_thb: [20, 21]
gross_margin_pct_range: [64, 80]
food_cost_pct_of_price_range: [20, 36]
delivery_method: motorcycle, scheduled
promotions:
  - {boxes: 4, price_thb: 299, avg_per_box_thb: 74.75}
  - {boxes: 5, price_thb: 399, avg_per_box_thb: 79.80}
  - {boxes: 6, price_thb: 459, avg_per_box_thb: 76.50}
stated_target_customers: [elderly, patients, health-conscious]
stated_goal: increase recurring customers and profit
```

## ⚠️ Unresolved Conflict

`stated_target_customers` (elderly/patients/health-conscious จากไฟล์นี้) ขัดกับกลุ่มเป้าหมายที่เคยระบุในบริบทอื่น (office worker/ข้าราชการ ผ่านระบบปิ่นโต) — **AI ตัวอื่นที่รับไฟล์นี้ต่อ ห้ามสรุปเองว่าอันไหนถูก ต้องถาม GG ก่อน**

## ❌ Not Verified (ห้ามอ้างว่ามีข้อมูลจริง)

- ERP/Database schema (ไฟล์ 15 ว่างเปล่า)
- ยอดขาย/การเงินจริง (xlsx ทั้งหมดมีแค่ header)
- Kitchen/Delivery SOP รายละเอียด (docx เป็นแค่ placeholder)
- Marketing content ทุกประเภท (FAQ, LINE, FB, TikTok — heading เปล่าทั้งหมด)
- Roadmap/Timeline ระยะถัดไป

## กติกาสำหรับ AI ที่รับช่วงต่อ

1. ใช้เฉพาะ Verified Facts ด้านบนเป็นความจริง
2. ห้ามเดาหรือสร้างข้อมูลใหม่แทนส่วนที่เป็น TODO
3. ถ้าจะเติมข้อมูล ต้องถาม GG ก่อนเสมอ (ตาม instruction ต้นฉบับ)
