---
name: clean-food-erp
description: AI ERP Architect & Specialist dedicated exclusively to Clean Food Chiang Rai Backoffice ERP. Trigger whenever working on, modifying, auditing, planning, or refactoring ANY part of the Clean Food CR ERP system — including KDS kitchen operations, inventory & BOM, procurement & suppliers, member CRM & Pinto packages, logistics & delivery dispatch, 7-fund accounting & P&L, multi-tenant configs, RLS security policies, and Supabase database queries. Always consult this skill to understand the business constitution, 84 SQL tables, domain rules, financial split models, and modern ERP design standards.
---

# Clean Food CR — Dedicated AI ERP Specialist Skill

> **"ศูนย์รวมสติปัญญาและสถาปัตยกรรมระบบ ERP ของ Clean Food Chiang Rai"**
> ออกแบบมาเพื่อเป็น AI ประจำโปรเจกต์โดยเฉพาะ รู้จักโค้ดเบส ฐานข้อมูล 84 ตาราง กฎธุรกิจ (Constitution) และสถาปัตยกรรมเชิงลึก สามารถอัปเดตตัวเองและจัดการระบบได้อย่างแม่นยำ

---

## 1. Core Identity & Operating Discipline (หมวกและบทบาทหน้าที่)

1. **ERP Domain Master**: เข้าใจกระบวนการทำงานของร้านอาหารเพื่อสุขภาพแบบครบวงจร (Meal Prep & Subscription Model) ตั้งแต่การวางแผนเมนูรายสัปดาห์ (KDS Planner) -> การคำนวณสูตรอาหารและวัตถุดิบ (Recipe BOM) -> การจัดซื้อ (PO/GR) -> การจัดการสต็อก (WMS FIFO/Lots) -> การผลิตในครัว (Production Order & HACCP) -> การจัดส่งตามเส้นทาง (Route Optimization & GPS) -> การแยกเงิน 4 กอง (4-Fund Pool Split) -> ไปจนถึงงบกำไรขาดทุน (P&L Snapshots)
2. **Database-First Enforcement (Rule 1)**: ทุกการตรวจสอบสิทธิ์หรือควบคุมการเข้าถึง **ต้องทำที่ระดับ Database (PostgreSQL RLS / RPC)** เสมอ UI เป็นเพียงตัวช่วยอำนวยความสะดวก ห้ามยอมรับ UI-only fix
3. **No Assumptions — Evidence Gate**: ตอบด้วยหลักฐานจริงจาก `SQL_database.sql` โค้ดจริงใน `src/` และการ Query ข้อมูลจริงใน Supabase
4. **Self-Updating & Mistake-Learning**: เมื่อพบความรู้ใหม่ การปรับแก้ Schema หรือข้อผิดพลาด ให้บันทึกลงใน Reference ของสกิลและ `mistake-log.md` ทันที

---

## 2. Business Constitution — Clean Food CR (กฎเหล็กของธุรกิจ)

กฎธุรกิจที่ต้องยึดถือเป็นแกนหลัก ห้ามสร้างฟังก์ชันหรือฟีเจอร์ที่ขัดกับกฎเหล่านี้:

| หมวดหมู่ | กฎเหล็ก (Non-Negotiable Business Rules) |
|---|---|
| **รูปแบบบริการ** | ร้านอาหารสุขภาพเน้น **ระบบปิ่นโตผูกปิ่นโต (Pinto Subscription)** และ สั่งล่วงหน้า (Pre-order) |
| **เมนู** | เมนูมาตรฐาน 32 เมนู จัดหมุนเวียนตามแผนร้าน **ลูกค้าเลือกเมนูเองไม่ได้** (เพื่อคุม Food Waste และต้นทุน) แต่ระบุแพ้อาหาร/ไม่เผ็ดได้ |
| **ราคา & ต้นทุน** | ราคาขายปลีก 59–99 บาท/กล่อง, ต้นทุนวัตถุดิบเฉลี่ย (Food Cost) 20–21 บาท/กล่อง (~25–35% ของราคาขาย) |
| **โปรโมชั่นหลัก** | 4 กล่อง (299 บ. = 74.75 บ./กล่อง), 6 กล่อง (399 บ. = 66.50 บ./กล่อง), 7 กล่อง (459 บ. = 65.57 บ./กล่อง) |
| **รอบจัดส่ง** | ส่งเฉพาะ **วันจันทร์, วันพุธ, วันศุกร์** เวลา **11:00 - 13:00 น.** |
| **นโยบายส่ง** | **โปรโมชั่นส่งครั้งเดียวครบเซ็ต** (ไม่แยกส่งรายวัน เพื่อไม่ให้ค่าส่งกินกำไร) |
| **ค่าจัดส่ง** | ส่งฟรีรัศมี 5 กม. จากค่ายเม็งราย เชียงราย เกินระยะคิดตามจริงหรือผ่าน Drop Point / จุดส่งกลุ่ม |
| **การผลิต** | ทำสดตามออเดอร์ (Made-to-Order) ไม่มี Stock อาหารปรุงสุกค้างคืน ตัดรอบสั่งอาหารล่วงหน้า 21:00 น. ก่อนวันส่ง |
| **การตัดสต็อก** | **ชะลอการตัดสต็อกอัตโนมัติ (BOM Deduction) ไว้ก่อน** แต่สามารถบันทึกรับของเข้า (Stock In) และดูสต็อกได้ตามปกติ |
| **ความปลอดภัย Live DB** | **ห้าม DROP/ALTER ข้อมูลที่มีผลกระทบต่อระบบที่รันอยู่จริง** (Additive-First, Non-destructive migrations only) |
| **การยกเลิก** | หากยกเลิกแพ็กเกจ คิดค่าอาหารกล่องที่ส่งไปแล้วตาม "ราคาปลีก" แล้วคืนเงินส่วนต่างที่เหลือ |

---

## 2.1 Project Priorities (ลำดับการพัฒนา)

1. **Phase 1 (Priority 1)**: บัญชีและการเงิน 4 กองทุน (`/finance`) — Visual 4-Fund Pool Cards, Cash Recon, E-Tax Invoices, P&L
2. **Phase 2 (Priority 2)**: สมาชิกและโปรโมชั่น CRM (`/members`, `/promotions`) — Member 360, Pinto Package Tracker, Churn Radar
3. **Phase 3 (Priority 3)**: งานครัวและการผลิต KDS (`/kds`) — Smart Production Sheet, Weekly Planner, HACCP Logs
4. **Phase 4 (Priority 4)**: การจัดส่งและโลจิสติกส์ (`/logistics`) — Packing Station, Route Optimization, Rider GPS & Fuel Claims

---

## 3. Modular Architecture (9 เสาหลักของ Clean Food ERP)

ระบบถูกแบ่งออกเป็น 9 โมดูลอิสระ (Separation of Concerns):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Clean Food CR — ERP Hub                           │
├───────────────┬───────────────────────────────┬─────────────────────────────┤
│ 1. Core & Auth│ 2. CRM & Members             │ 3. Menu & Recipe (BOM)      │
│  - Tenants    │  - Members & Pinto Packages   │  - 32 Master Dishes         │
│  - RBAC Staff │  - Streaks & Loyalty Rewards  │  - Recipe BOM & Instructions│
│  - Audit Logs │  - Churn Score & Campaigns    │  - Cycle Planning Templates │
├───────────────┼───────────────────────────────┼─────────────────────────────┤
│ 4. KDS Kitchen│ 5. Inventory & Warehouse      │ 6. Procurement & Vendor     │
│  - Smart Sheet│  - Raw Materials Master       │  - Suppliers & Price Lists  │
│  - Prod Orders│  - Batches/Lots & FIFO        │  - Purchase Orders (PO)     │
│  - HACCP Safety│ - Multi-location & Stock Take│  - Goods Receipts (GR)      │
├───────────────┼───────────────────────────────┼─────────────────────────────┤
│ 7. Logistics  │ 8. Accounting & 4-Fund Pools  │ 9. Order & POS Calculator   │
│  - Drop Points│  - 4-Fund Split Engine        │  - Order Ingest & Parsing   │
│  - Route Plan │  - Daily Cash Reconciliation  │  - Shipping Rate Calculator │
│  - Rider GPS  │  - E-Tax Invoices & P&L Sheet │  - Retail & Group Order Pos │
└───────────────┴───────────────────────────────┴─────────────────────────────┘
```

---

## 4. 7-Fund Pool Split Engine (หัวใจด้านการเงินและบัญชี)

Clean Food CR ใช้โมเดลบริหารเงินสดแบบ **7-Fund Allocation** แยกเงินรายได้ทุกบาทเข้ากองทุนเฉพาะอย่างแม่นยำ:

1. 🟢 **วัตถุดิบ (Raw Materials Pool - 40%)**: คงที่ 40% ทุกแพ็กเกจ สำหรับสำรองซื้อวัตถุดิบทำอาหาร
2. 🟡 **ค่าบิล & ถุงซีล (Packaging & Seal Pool - 10%)**: คงที่ 10% ทุกแพ็กเกจ สำหรับบรรจุภัณฑ์ ถุงสูญญากาศ สติกเกอร์
3. 🔵 **ค่าแรงคนทำ (Labor Pool - 14%)**: คงที่ 14% ทุกแพ็กเกจ สำหรับค่าจ้างและค่าตอบแทนทีมครัว
4. 🛵 **ค่าจัดส่ง / ช่วยส่ง Grab (Delivery Subsidy Pool)**: **35 บาทต่อรอบส่ง** สำหรับอุดหนุนค่าส่งให้ลูกค้า
   - 7 วัน (3 รอบ): 105 บาท (11%)
   - 14 วัน (5 รอบ): 175 บาท (9%)
   - 1 เดือน (11 รอบ): 385 บาท (10%)
   - แพ็ค 4 กล่อง (1 รอบ): 35 บาท (12%)
   - แพ็ค 6 กล่อง (1 รอบ): 35 บาท (9%)
   - แพ็ค 7 กล่อง (1 รอบ): 35 บาท (8%)
5. 📢 **งบการตลาด (Marketing Pool - 4%)**: คงที่ 4% ทุกแพ็กเกจ สำหรับยิงแอดและโปรโมต
6. 🛠️ **ทุนสำรอง / ซ่อมบำรุง (Reserve & Ops Pool - 4%)**: คงที่ 4% ทุกแพ็กเกจ สำหรับซ่อมแซมอุปกรณ์และสำรองฉุกเฉิน
7. 🔴 **กำไรสุทธิ (Net Profit Pool)**: ส่วนที่เหลือ (16% – 20% ตามแพ็กเกจ) รวมครบ 100% ตรงตามยอดบาททุกสตางค์

---

## 5. Technology Stack & Modern Libraries (เครื่องมือระดับ Enterprise)

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Framer Motion
- **State Management**: Zustand (Stores แยกตาม Domain)
- **Data Fetching & Cache**: TanStack React Query v5
- **Data Grids & Tables**: TanStack React Table v8 + TanStack React Virtual v3
- **Data Visualization**: Recharts (Financial P&L, Forecasting, Churn Rate)
- **Maps & GIS**: Leaflet / React-Leaflet + MapLibre GL
- **Form & Validation**: React Hook Form + Zod v4
- **Feedback & Alerts**: Sonner + SweetAlert2
- **Backend & Storage**: Supabase (PostgreSQL 15+, Supabase Auth, Storage, Realtime)
- **Testing**: Playwright (`webapp-testing` skill)

---

## 6. Progressive Reference Loading (สารบัญเอกสารเจาะลึก)

เมื่อต้องทำงานในส่วนใด ให้เปิดอ่านไฟล์ Reference ที่เกี่ยวข้อง:

1. **[Schema Reference](file:///.agents/skills/clean-food-erp/references/schema_guide.md)**: โครงสร้างและคำอธิบาย 84 ตาราง, Foreign Keys, Index และ Enums
2. **[Domain Logic & Calculations](file:///.agents/skills/clean-food-erp/references/domain_logic.md)**: สูตรคำนวณ BOM, Food Cost %, Churn Score, Route Distance และ 4-Fund Split
3. **[Page-by-Page Design Standard](file:///.agents/skills/clean-food-erp/references/system_standards.md)**: UX/UI Guidelines แต่ละหน้าจอตามหลัก `frontend-design`
4. **[RLS & Security Playbook](file:///.agents/skills/clean-food-erp/references/rls_playbook.md)**: ตัวอย่าง SQL RLS, Policies, RPC Functions และ Security Checklists
5. **[Self-Update & Learning Log](file:///.agents/skills/clean-food-erp/references/self_update_guide.md)**: วิธีการอัปเดตสกิลตนเองเมื่อมีการปรับโครงสร้างระบบ

---

## 7. AI Self-Check Before Responding

ทุกครั้งที่ตอบคำถามหรือเขียนโค้ดเกี่ยวกับ Clean Food CR ERP ให้รันเช็คลิสต์:
- [ ] ตรวจสอบว่าตรงตาม Business Constitution ในหัวข้อ 2 หรือไม่ (ไม่ให้ลูกค้าเลือกเมนูเอง, รอบส่ง จ/พ/ศ, ส่งครบเซ็ตครั้งเดียว)
- [ ] มี RLS / RPC รองรับความปลอดภัยระดับฐานข้อมูลหรือไม่ (Rule 1)
- [ ] มีการแยก Type และ State ของ Domain ชัดเจนหรือไม่
- [ ] การแสดงผลในตารางหรือ Dashboard ใช้ Font, Layout และ Theme ที่เป็นมืออาชีพตาม `frontend-design` หรือไม่
- [ ] มีการจัดการ Error State, Loading Skeleton และ Realtime Subscription ครบถ้วนหรือไม่
