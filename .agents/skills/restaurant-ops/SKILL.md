---
name: restaurant-ops
description: Router skill for Clean Food Chiang Rai's full restaurant operations knowledge base — accounting/tax, inventory/stock, menu/recipe costing, staff/HR, and customer/order flow (QR ordering, Kitchen Display, POS). ALWAYS trigger this before answering ANY question touching Thai restaurant/food-business operations — VAT/ภ.พ.30, stock deduction, recipe cost, GP%, staff timesheet/payroll, table QR ordering, Kitchen Display System, bill/promotion logic, Google Sheets + AppSheet + Apps Script architecture — even if the question looks small or only touches one topic. Do NOT answer restaurant-ops questions from general knowledge; route to the correct reference file below first.
---

# Restaurant Ops — Router (Hub)

This is a **hub**, not a content file. It exists because the full domain (accounting, stock, menu, staff, customer orders) is too large and too fast-changing for one file — same reason the Notion "System Design Plan" is split into a hub + 9 spokes. Keep this file short. Route, don't duplicate.

## Architecture ground truth (confirm before answering anything)

> **FOH (Front of House) = Web App.** Customer QR ordering, Kitchen Display, bill/cashier screen.
> **BOH (Back of House) = AppSheet.** ERP only — stock, payroll/timesheet, purchasing, sales history viewing.
>
> An AI agent previously proposed building POS inside AppSheet — **this was wrong and has been corrected**. Never suggest building order-taking/POS logic inside AppSheet. If unsure, re-check Notion's "📝 อัปเดตการพัฒนาระบบ" page before answering — don't assume from this file alone, since architecture notes get amended there first.

## Route table — read the matching file below, not this one, for real answers

| Topic / trigger words | Read this file |
|---|---|
| VAT, ภ.พ.30, ใบกำกับภาษี, ใบเสร็จ, บิล, จดทะเบียนภาษี, PDPA ข้อมูลลูกค้า, สูตร SUMIFS บัญชี | `accounting-tax/SKILL.md` |
| สต็อกวัตถุดิบ, รับสต็อก, เบิกสต็อก, low stock alert, หักสต็อกอัตโนมัติ, Virtual Column AppSheet | `inventory-stock/SKILL.md` |
| สูตรอาหาร, ต้นทุนต่อจาน, ราคาขาย, GP%, Master_สินค้า, ค่าคอมแพลตฟอร์มส่งอาหาร | `menu-recipe/SKILL.md` |
| พนักงาน, Timesheet, ค่าแรง, payroll, สิทธิ์การเข้าถึง (roles), audit trail | `staff-hr/SKILL.md` |
| QR สั่งอาหาร, เมนูลูกค้า, Kitchen Display, จอครัว, ปิดบิล, โปรโมชั่น/ส่วนลด, table_no, bill_id, order_id | `customer-orders/SKILL.md` |
| ภาพรวมสถาปัตยกรรม 4 ชั้น, roadmap เปิดร้าน, edge case checklist ทั้งระบบ | Notion "System Design Plan" hub directly — these are cross-cutting and don't have one clean owner file |

If a question spans more than one file (e.g. "ยกเลิกออเดอร์หลังตัดสต็อกไปแล้ว, ใครมีสิทธิ์ทำ, กระทบบัญชียังไง"), read **all** relevant files — don't guess from one.

## Standing rules across every module

1. **Design-first, schema-first.** Every new field goes into the Google Sheets schema *before* it's needed, because Sheets are expensive to restructure later (see each module's schema section). Never propose a "quick fix" that skips this.
2. **Fallback always exists.** Any digital flow (ordering, Kitchen Display, printing) needs a non-digital fallback for when the system is down. If a proposal has none, flag it as incomplete — don't silently let it pass.
3. **Phase discipline.** Everything is explicitly Phase 1 (needed to open) or Phase 2 (safe to add later without restructuring). Don't blur these — if asked to build something, check which phase it belongs to and say so.
4. **PDPA.** Any field storing customer phone numbers, order history, or member data needs a stated retention/consent stance — don't design it silently.
5. **Source of truth for the latest state**: Notion pages "🍜 แผนออกแบบระบบร้าน" (design) and "📝 อัปเดตการพัฒนาระบบ" (latest changelog/3P update) — these get edited as the project evolves faster than these skill files will. If something here conflicts with a recent Notion update, Notion wins; flag the discrepancy to GG rather than silently picking one.
