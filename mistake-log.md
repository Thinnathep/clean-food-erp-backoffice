# AI Mistake & Learning Log — Clean Food CR ERP

> บันทึกข้อผิดพลาดและสิ่งที่ได้เรียนรู้ เพื่อป้องกันไม่ให้ AI ทำผิดซ้ำในโปรเจกต์นี้

---

## [2026-08-30] Initial System Audit & Setup
- **Trigger**: ตรวจสอบระบบทั้งหมดกับ `SQL_database.sql` และคำสั่ง lint/healthcheck
- **สิ่งที่ตรวจพบ**:
  1. มี 5 ตารางที่มี RLS เปิดใช้งานแต่ยังไม่มี Policy: `erp_recipe_steps`, `erp_tenant_configs`, `erp_tenant_subscriptions`, `erp_tenant_users`, `erp_tenants` ทำให้ Supabase Client ติด Permission Error
  2. โค้ดใน `PromotionManagement.tsx` และ `ProcurementDashboard.tsx` มีการเรียก setState synchronously ภายใน useEffect ทำให้เกิด cascading renders
  3. ฟังก์ชัน `fetchLogisticsConfig` ใน `PromotionManagement.tsx` ถูกเรียกก่อนประกาศ (Hoisting issue)
- **วิธีป้องกัน**:
  1. เขียน Migration เติม RLS Policies ให้ครบทุกตาราง
  2. ใช้ React Query หรือ Callback ในการ fetch ข้อมูลแทน setState โดยตรงใน useEffect
  3. ตรวจสอบลำดับการประกาศ Function และ Types เสมอก่อนบันทึกไฟล์

## [2026-08-30] Live System Safety & Priority Setting
- **Trigger**: ผู้ใช้แจ้งเตือนว่าระบบกำลังเปิดให้บริการจริง (Live in operation) และกำหนดลำดับ Phase 1: กลุ่ม B (การเงิน 4 กองทุน) -> Phase 2: กลุ่ม C (สมาชิกและ CRM)
- **กฎที่ต้องปฏิบัติ**:
  1. ห้าม DROP/ALTER Column หรือข้อมูลที่มีผลกระทบต่อระบบที่กำลังรันอยู่เด็ดขาด (Additive-First strategy)
  2. ชะลอการตัดสต็อกอัตโนมัติ (Automated BOM Deduction) ไว้ก่อน แต่เปิดให้รับเข้าสต็อก (Stock In) ได้ตามปกติ
  3. ตรวจสอบ Backward Compatibility ทุกครั้งที่มีการแก้ไข Database Layer หรือ API

## [2026-08-30] PostgREST Foreign Key Embedding & Bundle Optimization
- **Trigger**: เกิด Error HTTP 400 จาก PostgREST: `erp_pickup_orders?select=*,orders:order_id(...)` และปัญหาหน้าเว็บโหลดช้าจากขนาด Bundle 1.86MB
- **สาเหตุ**:
  1. ตาราง `erp_pickup_orders.order_id` เป็นฟิลด์ `text` ที่ไม่มี Foreign Key Constraint ใน PostgreSQL ทำให้ PostgREST ไม่สามารถ Join แบบ `orders:order_id(...)` ได้โดยตรง
  2. การ Import หน้า Page ทั้งหมดแบบ Eager Static ใน `App.tsx` ทำให้เบราว์เซอร์ต้องดาวน์โหลดทั้งระบบตั้งแต่เปิดหน้าแรก
- **วิธีแก้ไข & ป้องกัน**:
  1. ในกรณีที่ตารางมีฟิลด์ `customer_name`, `customer_phone` อยู่แล้ว ให้ Query `*` จากตารางโดยตรง หรือถ้าต้องการ Join ข้ามตารางต้องตรวจสอบ Foreign Key Constraint ใน Schema ก่อน
  2. ใช้ `React.lazy` + `Suspense` ใน `App.tsx` เพื่อทำ Code Splitting แยกแต่ละหน้า
  3. กำหนด `manualChunks` ใน `vite.config.ts` แยก Vendor Chunks ทำให้ Entry Bundle ลดลงจาก 1,862 kB เหลือเพียง 81 kB (เร็วขึ้น 95%)

## [2026-08-30] Deep Frontend Query, Asset & Recharts Audit
- **Trigger**: ตรวจพบ Error 404 เมื่อดึง `erp_members`, `kds_daily_production`, คำเตือน Empty Image src `""`, Recharts `-1` dimensions, และ WebSocket race condition บน Realtime channel
- **สาเหตุ & สิ่งที่แก้ไข**:
  1. ตารางสมาชิกในฐานข้อมูลชื่อ `members` (ไม่ใช่ `erp_members`) และฟิลด์ LTV คือ `lifetime_value` (ไม่ใช่ `total_spent`) -> แก้ไขใน `LTVAnalysis.tsx` และ `RevenueRecorder.tsx`
  2. ฟังก์ชัน `fetchKdsDailyProduction` ใน `src/features/kds/api.ts` เดิม query view ที่ไม่มีอยู่จริง -> แก้ไขให้ Query ตาราง `erp_member_meal_schedules` พร้อม Join `menu_items` แล้ว Aggregate ตาม `menu_item_id`
  3. แท็ก `<img src={...} />` ใน `MenuManagement.tsx` และ `MenuSettings.tsx` เดิมส่ง `""` ทำให้เบราว์เซอร์ดาวน์โหลดหน้าเว็บซ้ำ -> เพิ่มเงื่อนไข Ternary และ Fallback Icon
  4. Recharts `ResponsiveContainer` ใน `FinanceCharts.tsx` -> เพิ่ม `minWidth={0}` และ `min-w-0` เพื่อป้องกัน Error คำนวณขนาด `-1`
  5. Supabase Realtime Channel ใน `TodayView.tsx` -> ใช้ Unique Channel Name ต่อ Instance เพื่อป้องกัน WebSocket Connection Race
  6. สร้างสคริปต์ตรวจสอบความถูกต้องของ Query ทั้งหมดแบบอัตโนมัติ `npm run test:integrity` ตรวจสอบ 94 ไฟล์ครบ 100%

## [2026-08-30] Members Column Schema & Browser Intervention Hardening
- **Trigger**: ตรวจพบ Error PostgREST เมื่อดึง/บันทึกฟิลด์ `nickname` ในตาราง `members` จาก `DropPointManagement.tsx` และ `PromotionManagement.tsx`, และ Chrome Lazy Load Intervention บนหน้า `/menu/member`
- **สาเหตุ & สิ่งที่แก้ไข**:
  1. ในตาราง `members` ไม่มีคอลัมน์ชื่อ `nickname` (ฟิลด์ชื่อเล่น/LINE ชื่อจริงใน DB คือ `line_display_name`) -> อัปเดตการ Select, Update, Insert ใน `DropPointManagement.tsx` และ `PromotionManagement.tsx` ให้ใช้ `line_display_name` พร้อม Fallback
  2. การตั้งค่า `loading="lazy"` ให้รูปภาพทั้งหมดใน `MenuManagement.tsx` ทำให้ Chrome Deferred Image Events และแสดง Intervention Warning -> แก้ไข `MenuCard` ให้รูป 8 รายการแรกโหลดแบบ `eager` ส่วนที่เหลือโหลดแบบ `lazy`, เพิ่ม `decoding="async"`, และใส่ `onError` fallback ป้องกันหน้าจอค้างหรือรูปแตก
  3. ยกระดับชุด Unit Test ใน `scripts/test-erp-domain.mjs` ครอบคลุมทั้ง 5 โมดูลหลัก (การเงิน 4 กองทุน, สมาชิก & ปิ่นโต, ครัว KDS & Recipe BOM, โลจิสติกส์, จัดซื้อ & สต็อก) รวม 17 เคส ทดสอบ Business Logic เพียวๆ ทำให้รองรับการปรับเปลี่ยน UI ในอนาคตโดยไม่กระทบผลการทดสอบ

