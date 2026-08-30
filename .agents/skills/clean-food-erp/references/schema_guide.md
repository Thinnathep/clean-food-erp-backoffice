# Database Schema Reference — Clean Food CR ERP

> **Source of Truth**: `SQL_database.sql` (PostgreSQL 15+ บน Supabase)
> รวม 84 ตาราง ครอบคลุมระบบ ERP ครบวงจร

---

## สรุปการแบ่งกลุ่ม 84 ตารางตาม Domain

```
├── 1. Core & Multi-Tenant (6 ตาราง)
│   ├── erp_tenants                  — องค์กร/สาขาหลัก
│   ├── erp_tenant_subscriptions    — แพ็กเกจ SaaS ของ Tenant
│   ├── erp_tenant_users            — ผู้ใช้ระดับ Tenant และสิทธิ์
│   ├── erp_tenant_configs          — การตั้งค่าเฉพาะ Tenant
│   ├── erp_staff                   — พนักงาน (ADMIN, RIDER, KITCHEN, MANAGER)
│   └── erp_audit_logs              — บันทึกประวัติการแก้ไขข้อมูล
│
├── 2. Members, CRM & Gamification (12 ตาราง)
│   ├── members                     — ฐานข้อมูลลูกค้า/สมาชิก
│   ├── member_addresses            — ที่อยู่จัดส่งหลายแห่งต่อสมาชิก
│   ├── pinto_packages              — แพ็กเกจปิ่นโตที่สมาชิกซื้อ
│   ├── meal_deduction_logs         — ประวัติการตัดยอดมื้ออาหาร
│   ├── erp_member_streaks          — สถิติการสั่งต่อเนื่อง (Streak)
│   ├── erp_member_meal_schedules   — ตารางการส่งอาหารรายสมาชิก
│   ├── erp_member_ban_logs         — ประวัติการแบน/ปลดแบน
│   ├── erp_blacklist               — รายชื่อและเบอร์โทรที่ถูกขึ้นบัญชีดำ
│   ├── erp_churn_scores            — คะแนนความเสี่ยงการเลิกใช้บริการ
│   ├── erp_menu_preferences        — ความชอบอาหาร/สิ่งที่ไม่ทาน
│   ├── erp_crm_interactions        — บันทึกการติดต่อสอบถาม/ดูแลลูกค้า
│   └── erp_crm_campaigns           — แคมเปญการตลาด CRM
│
├── 3. Menu & Recipe Engineering (6 ตาราง)
│   ├── menu_items                  — แคตตาล็อกเมนูอาหาร 32 รายการ
│   ├── erp_recipes                 — สูตรอาหาร Bill of Materials (BOM)
│   ├── erp_recipe_steps            — ขั้นตอนการปรุงและระยะเวลา
│   ├── menu_cycle_templates        — เทมเพลตเมนูหมุนเวียน 4 สัปดาห์
│   ├── pinto_meal_plan             — แผนเมนูประจำวัน/สัปดาห์
│   └── weekly_plans                — ข้อมูล Metadata การวางแผนรายสัปดาห์
│
├── 4. Kitchen Operations & HACCP (6 ตาราง)
│   ├── erp_production_orders       — ใบสั่งผลิตประจำกะ (Morning/Evening)
│   ├── erp_production_order_items  — รายการผลิต แผน vs จริง vs ของเสีย (Waste)
│   ├── erp_stock_deductions        — บันทึกการตัดสต็อกอัตโนมัติตาม BOM
│   ├── erp_kitchen_sessions        — รอบการเปิด-ปิดครัว
│   ├── erp_kitchen_checklist       — เช็คลิสต์งานครัวประจำวัน
│   ├── erp_kitchen_checklist_master— แม่แบบเช็คลิสต์งานครัว
│   └── erp_food_safety_logs        — บันทึกความปลอดภัยอาหาร HACCP (อุณหภูมิ/สุขอนามัย)
│
├── 5. Inventory & Warehouse (7 ตาราง)
│   ├── erp_inventory_items         — รายการวัตถุดิบและบรรจุภัณฑ์
│   ├── erp_inventory_batches       — ล็อตสินค้า วันหมดอายุ และต้นทุนต่อล็อต
│   ├── erp_inventory_locations     — สถานที่จัดเก็บ (แห้ง, แช่เย็น, แช่แข็ง)
│   ├── erp_inventory_transactions  — บัญชีคุมยอดเคลื่อนไหวสต็อก (In/Out/Transfer)
│   ├── erp_inventory_adjustments   — การปรับปรุงยอดสต็อกจากการนับจริง (Stock Take)
│   ├── erp_unit_conversions        — ตารางแปลงหน่วย (กก. -> กรัม, ลัง -> ชิ้น)
│   └── erp_units                   — หน่วยนับมาตรฐาน
│
├── 6. Procurement & Vendor (5 ตาราง)
│   ├── erp_suppliers               — ข้อมูลซัพพลายเออร์/ผู้ขาย
│   ├── erp_supplier_price_lists    — บัญชีราคาและประวัติราคาจากซัพพลายเออร์
│   ├── erp_purchase_orders         — ใบสั่งซื้อสินค้า (PO)
│   ├── erp_purchase_order_items    — รายการสินค้าในใบสั่งซื้อ
│   ├── erp_goods_receipts          — ใบรับสินค้าเข้าคลัง (GR)
│   └── erp_goods_receipt_items     — รายการรับสินค้าและการตรวจรับคุณภาพ (QC)
│
├── 7. Logistics & Fleet (14 ตาราง)
│   ├── erp_deliveries              — รายการงานจัดส่ง
│   ├── erp_delivery_routes         — แผนเส้นทางการวิ่งส่งของไรเดอร์
│   ├── erp_delivery_route_stops    — ลำดับจุดส่ง (Stop Sequence) และหลักฐานการส่ง
│   ├── erp_rider_gps_logs          — พิกัด GPS ความเร็ว แบตเตอรี่ของไรเดอร์
│   ├── erp_rider_performance       — สถิติ KPI และค่าตอบแทนไรเดอร์
│   ├── erp_fuel_claims             — เบิกค่าน้ำมันตามระยะทางวิ่งจริง
│   ├── erp_vehicles                — ยานพาหนะของร้านและค่าเสื่อมราคา
│   ├── erp_vehicle_logs            — บันทึกการบำรุงรักษารถ
│   ├── erp_fuel_prices             — ราคาน้ำมันอ้างอิงรายวัน (Bangchak API)
│   ├── erp_drop_points             — จุดส่งรวมประจำโซน/อาคาร
│   ├── erp_group_orders            — ออเดอร์กลุ่มประจำจุดส่ง
│   ├── erp_buddy_groups            — กลุ่มบัดดี้ผูกปิ่นโตร่วมกัน
│   ├── erp_delivery_schedules      — ตารางวันนัดส่งอาหาร
│   └── erp_pickup_orders           — ออเดอร์รับเองหน้าร้าน
│
├── 8. Finance, 4-Fund Pools & Invoices (11 ตาราง)
│   ├── erp_split_configs           — สัดส่วนการแยกเงิน 4 กอง (Material/Labor/Ops/Profit)
│   ├── erp_fund_pools              — ยอดคงเหลือและเป้าหมายของแต่ละกองทุน
│   ├── erp_revenue_buckets         — ตารางจัดสรรรายรับเข้ากองทุน
│   ├── erp_fund_transactions       — ประวัติการเข้า-ออกของแต่ละกองทุน
│   ├── erp_expense_categories      — หมวดหมู่รายจ่าย
│   ├── erp_financial_transactions  — รายการเดินบัญชีการเงิน
│   ├── erp_bank_accounts           — บัญชีธนาคารและพร้อมเพย์ของร้าน
│   ├── erp_cash_reconciliations    — รายงานกระทบยอดเงินสดประจำวัน
│   ├── erp_invoices                — ใบเสร็จรับเงิน/ใบกำกับภาษีเต็มรูป (E-Tax)
│   ├── erp_invoice_items           — รายการในใบเสร็จ/ใบกำกับภาษี
│   └── erp_pl_snapshots            — งบกำไรขาดทุนรายเดือน (P&L)
│
└── 9. Orders, Promotions & POS (7 ตาราง)
    ├── orders                      — ตารางออเดอร์หลัก
    ├── order_items                 — รายการอาหารในออเดอร์
    ├── orders_web                  — ออเดอร์จากหน้าเว็บ/ลูกค้าสั่งเอง
    ├── promotions                  — โปรโมชั่นและโค้ดส่วนลด
    ├── erp_promotion_usage         — ประวัติการใช้โปรโมชั่น
    ├── erp_shipping_discounts      — ส่วนลดค่าจัดส่งตามยอดสั่งซื้อ
    └── payments                    — รายการชำระเงินและตรวจสลิป
```

---

## ข้อควรระวังเชิงลึก (Database Gotchas & Inconsistencies)

1. **`orders` vs `erp_deliveries` / `erp_kds_tasks` Foreign Keys**:
   - ตาราง `orders` ใช้ `order_id text UNIQUE` เป็น Primary Reference ในหลาย Foreign Key (เช่น `fk_kds_order`, `fk_deliveries_order`) แต่บางตารางอ้างอิง `id uuid`
   - **แนวทางแก้ไข**: ในโค้ด frontend/backend ให้ส่ง `order_id` (เช่น `RT-260503-XXXX`) สำหรับฟังก์ชันธุรกิจ และ `id` (UUID) สำหรับ Internal System ID
2. **5 ตารางที่มี RLS แต่ไม่มี Policy**:
   - `erp_recipe_steps`, `erp_tenant_configs`, `erp_tenant_subscriptions`, `erp_tenant_users`, `erp_tenants`
   - จะถูก Block ทุกคำสั่ง Query จาก Supabase Client หากไม่เพิ่ม Policy ที่เหมาะสม
3. **`pinto_meal_plan` Meal Slots**:
   - ในระบบเดิมมีการรองรับ `meal_type` (meal_1 ถึง meal_6) ซึ่งเชื่อมกับ `weekly_plans`
   - หากมีการ query ต้องระวังกรณี `menu_item_id IS NULL` สำหรับมื้อที่ยังไม่ได้กำหนดเมนู
