---
name: restaurant-accounting-tax
description: Thai food-business accounting, VAT/ภ.พ.30, billing, and receipt logic for Clean Food Chiang Rai. Trigger for ANY question about VAT registration status, tax rate, ใบกำกับภาษี, ใบเสร็จ numbering, discount-then-record-net accounting, multi-payment-method bills, PDPA on customer/receipt data, or anomalies in the "บันทึกรายรับ" / "สรุปรายวัน-เดือน-ปี" Google Sheets. Also trigger when reviewing or writing SUMIFS/VLOOKUP formulas in the accounting workbook, or Apps Script that touches Bills/receipts.
---

# Accounting & Tax

## Current tax setup (verify before quoting numbers)

- Default state: **ไม่จด VAT** — this is a config flag in sheet ตั้งค่า, column Q2. **Never assume this has changed.** Always ask GG or check the sheet before stating VAT is or isn't being charged.
- If prices are already VAT-inclusive (Thai restaurant norm, and the current default assumption), the customer-facing total does **not** change when VAT registration is toggled on — VAT is carved out of the existing price, not added on top. If the shop prices *exclusive* of VAT, that's a different config (sheet ตั้งค่า, Q4) and changes the customer total.
- Tax settings live in sheet `ตั้งค่า`, columns P–T: VAT registration y/n, VAT rate, price-inclusive y/n, tax ID, shop name/address for tax invoices, receipt number prefix.

## Bills schema (V3)

`Bills` sheet, linked to `บันทึกรายรับ` via a new column **L (รหัสบิล)**. Fields: discount, VAT, receipt number, print status, PDF link — plus whatever fields `customer-orders/SKILL.md` defines for `bill_id`/`payment_method`/`discount_type`. Don't redesign this schema without checking that file too — Bills is shared ground between accounting and ordering.

## Non-negotiable accounting rules

1. **Record net, not gross-then-adjust.** When a bill closes, the row written to `บันทึกรายรับ` must be the amount *after* discount, not the full price with a separate later adjustment. Writing full price and correcting later is how books stop matching actual cash — don't propose it even as a "temporary" measure.
2. **Multi-payment-method bills are normal, not an edge case.** One bill can be ฿100 cash + ฿150 transfer. Never design or accept a schema that forces a single payment method per bill — that's a known real-world failure mode here.
3. **Monthly VAT summary** (`สรุปภาษีขาย`) tracks: sales before VAT, VAT on sales, VAT on purchases (manual entry), net VAT payable — prepared for ภ.พ.30 filing once registered. Don't build automatic ภ.พ.30 filing; this stays a summary sheet for the owner/accountant.
4. **Daily close is a manual, deliberate action** ("ปิดยอดวันนี้" menu button via Apps Script), not an automatic trigger, and it should refuse to run twice on the same day. It writes to `ประวัติสรุปรายวัน` as *frozen values*, not live formulas — live formulas re-evaluate based on whatever date filter is selected later, which breaks historical trend charts if you don't freeze the number on close.

## Known historical bugs (don't reintroduce these patterns)

These were real bugs found in the pre-V3 accounting file — if you see similar patterns anywhere else in the workbook (or new formulas built the same way), flag them:

- **Column F/G swap**: a VLOOKUP accidentally sat in the "quantity" column instead of the "sale amount" column, silently overwriting manual entry. Rule: quantity columns must be plain manual-entry cells, never formula cells — a formula in a manual-entry column is itself a red flag worth checking for anywhere in the sheet.
- **SUMIFS pointed at the wrong column**: summary sheets summed a text column ("ประเภทการขาย") instead of the numeric sales column ("ยอดขาย"), so dashboards silently showed 0 regardless of real sales. Rule: whenever reviewing a SUMIFS/SUMIF, confirm the sum_range argument is actually numeric, not just "the column that looked right."
- **Exact-datetime comparisons breaking date filters**: comparing dates with `=` fails the moment a timestamp is attached (e.g., a row logged at 10:00 doesn't match a filter for "5/7/2026" at midnight). Rule: date filters must always be range checks (`>= start of day` AND `< start of next day`), never exact equality.
- **Hardcoded formula ranges** (e.g. `$3:$202`) silently drop data once a real month's transactions exceed the range. Rule: any new formula range should assume real monthly volume can exceed a few hundred rows — size generously (500–1000+) or use whole-column references, and say so explicitly if you don't.

## PDPA note

Receipts and Bills may carry customer phone numbers (Phase 2 membership) — any field like this needs an explicit retention/consent stance before being added, not silently bolted on because it's technically easy in Sheets.

## When something doesn't add up

Don't guess why a dashboard number looks wrong. Ask to see the actual formula in the cell (or check via Apps Script) — the historical bugs above show that "looks right" formulas were confidently wrong for a long time before being caught. Verify against the formula, not against intuition about what it should be doing.
