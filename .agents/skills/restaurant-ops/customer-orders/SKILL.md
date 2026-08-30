---
name: restaurant-customer-orders
description: Customer-facing QR ordering, Kitchen Display System, and bill/payment flow for Clean Food Chiang Rai's FOH Web App (Laravel + Vue). Trigger for ANY question about table QR ordering, order_id/bill_id/order_item schema, Kitchen Display order states, splitting or merging bills, promotions/discounts at checkout, or any "what happens if X fails mid-order" edge case. Also trigger before proposing changes to the ordering flow's database schema.
---

# Customer & Orders (FOH)

## Ownership: this is the Web App (Laravel + Vue), not AppSheet

This is the one module that lives entirely in the scalable platform stack, not AppSheet. Stock and payroll are BOH/AppSheet — see `inventory-stock/SKILL.md` and `staff-hr/SKILL.md` for those; don't pull their logic into this app, only reference their IDs (e.g. `order_item_id` for future stock deduction).

## Core schema (Phase 1)

- `tables`: table_no, QR code identifier.
- `orders`: order_id, table_no, status (open/closed/cancelled), created_at, bill_id (nullable until closed).
- `order_items`: order_item_id, order_id, dish_id (→ `Master_สินค้า` in menu-recipe), qty, status (received → cooking → served), notes (e.g. "ไม่ใส่ผัก").
- `bills`: bill_id, total, discount_type, discount_amount, payment_method(s) — **must support multiple payment methods per bill**, matching `accounting-tax/SKILL.md`'s rule. Don't design this as a single payment_method field.

## Kitchen Display System (KDS)

- Order items flow through states: received → cooking → served. Each state change should be timestamped — this is what lets `staff-hr` and `accounting-tax` reconstruct "what happened and when" if a dispute comes up later.
- **KDS needs a paper/manual fallback.** If the display goes down mid-service, staff need a way to keep taking and tracking orders (printed ticket, or a manual board) — don't ship KDS as the *only* path to the kitchen.

## Required edge cases — don't ship the happy path alone

These came up explicitly in system design review and must be handled, not deferred silently:

1. **Cancel an order item after it's already marked "served."** Needs an explicit reason field and shift-lead approval (see `staff-hr/SKILL.md` roles) — and once Phase 2 stock auto-deduction exists, this is exactly the case that needs the stock-return path from `inventory-stock/SKILL.md`. The two features are linked; don't build one without checking the other.
2. **Split a bill** (e.g. two customers at one table pay separately) and **merge bills** (e.g. two tables combined). Both need to preserve the item-level detail — a bill split that only tracks the total, not which items went to which sub-bill, breaks reconciliation later.
3. **Promotion/discount applied at checkout**, not per item — apply discount logic at the `bills` level so it interacts cleanly with the multi-payment-method requirement, rather than trying to discount individual `order_items` (which gets tangled with per-item stock/cost tracking in `menu-recipe`).
4. **QR scan with no active order for that table yet** vs. **QR scan for a table with an order already in progress** — the app must distinguish "start new order" from "add to existing order," or duplicate/orphaned order rows will appear.
5. **Network drop mid-submit** — the customer's app needs to know whether their order actually reached the kitchen or not; a silent failure here is a direct customer-trust problem, not just a technical bug.

## PDPA

Phase 2 customer accounts/membership will store phone numbers and order history — needs an explicit consent/retention design before that field goes live, same standard as `accounting-tax/SKILL.md`'s receipt data.

## Phase discipline

Phase 1 ships table QR ordering, KDS, and bill closing with the edge cases above. Phase 2 (membership, loyalty points, auto stock deduction hookup) waits until Phase 1 has run stable in real service — don't pull Phase 2 features forward just because they're technically easy to add once the schema exists.
