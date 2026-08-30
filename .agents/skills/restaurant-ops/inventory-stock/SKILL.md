---
name: restaurant-inventory-stock
description: Raw-material stock management for Clean Food Chiang Rai — AppSheet-based ERP (BOH), Google Sheets stock ledger, real-time balance calculation, and auto-deduction-from-recipe planning. Trigger for ANY question about stock in/out, low-stock alerts, AppSheet Virtual Columns, Master_วัตถุดิบ schema/sync errors, or connecting recipe usage to stock deduction. Also trigger when the user mentions AppSheet "Regenerate Structure" errors or column-count mismatches between AppSheet and Google Sheets.
---

# Inventory & Stock

## Ownership: this lives in AppSheet (BOH), not the FOH Web App

Stock management is back-office. It is **not** part of the customer-facing Web App. If a task description starts drifting toward "build stock deduction into the ordering flow," that's a Phase 2 *connection* between systems, not a reason to move stock logic into FOH — see the Phase rules below and `customer-orders/SKILL.md`'s handoff to this file.

## Current architecture (AppSheet + Sheets sync)

- Master table: `Master_วัตถุดิบ` in Google Sheets, mirrored into AppSheet.
- **Column-count mismatches are a known, recurring failure mode.** If AppSheet reports a different column count than the Sheet actually has (e.g. Sheet has 7, AppSheet sees 6), the fix is: user manually clicks "Regenerate Structure" on that table in AppSheet to re-pull the schema. Don't try to patch this from the Sheets side — the mismatch is in AppSheet's cached schema, not the data.
- Real-time balance is done via an **AppSheet Virtual Column** (e.g. "สต็อกคงเหลือปัจจุบัน", type Number) on the รับสต็อก/เบิกสต็อก entry forms — it computes live via a cross-table subtraction formula rather than storing a static balance. This means staff see updated stock the instant they submit a form, without needing a separate recalculation step.
- The Sheets-side ledger column (e.g. F: เบิกออกสะสม in สต็อกวัตถุดิบ) should point at the **current** transaction table with a formula like `=SUMIFS('บันทึกสต็อกออก'!D:D, 'บันทึกสต็อกออก'!B:B, A3)`. If this stops updating after a schema change, the fix is almost always that the formula is still pointed at the old table/columns — check the formula reference first, not the data.

## Design principle: don't auto-deduct stock from orders yet

**Do not build automatic recipe-based stock deduction in Phase 1.** This requires every recipe's ingredient list to be accurate and stable first — if recipes drift even slightly, stock balances silently accumulate error that's expensive to trace back later. Phase 1 keeps stock deduction manual (staff logs it via AppSheet forms) running in parallel with FOH sales.

**Phase 2** (only once recipes are confirmed stable, see `menu-recipe/SKILL.md`): when an `order_item`'s status becomes "เสิร์ฟแล้ว" (served), auto-deduct the recipe's ingredients from stock, plus:
- A **low-stock alert** once ingredients cross a defined threshold.
- A **stock-return path** for cancelled orders — if an order is cancelled *after* auto-deduction has already run, the ingredients must be added back, or stock will drift downward for no visible reason. Don't ship auto-deduction without this return path; they're the same feature.

## Fields to reserve now, even if unused

Add these to the stock schema in Phase 1 even before Phase 2 logic exists, since Sheets columns are expensive to insert later: a link from stock ledger rows back to the `order_item_id` that triggered them (once Phase 2 exists), and a `changed_by` + `timestamp` pair for every manual stock adjustment (this doubles as the audit trail staff-hr/SKILL.md expects for any inventory discrepancy investigation).

## When troubleshooting a sync or formula issue

Don't guess. Ask to see (or check) the actual AppSheet error message and the actual Sheets formula — the two historical fixes above (Regenerate Structure, formula re-pointing) look similar on the surface but require checking different places. Confirm which one is happening before proposing a fix.
