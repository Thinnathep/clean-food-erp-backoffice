---
name: restaurant-staff-hr
description: Staff scheduling, timesheet, payroll, and access-control (roles) logic for Clean Food Chiang Rai. Trigger for ANY question about clock-in/out, timesheet calculation, payroll formulas, staff roles/permissions in AppSheet or the Web App, or audit-trail questions like "who did this action." Also trigger before granting any new permission level or adding a new staff role.
---

# Staff & HR

## Ownership: AppSheet (BOH), with role checks referenced by FOH

Timesheet and payroll live in AppSheet like inventory does. But **role/permission definitions** (who can void a bill, who can edit a served order, who can adjust stock manually) are referenced by the FOH Web App too — this file is the shared source of truth for "who can do what," even though the enforcement code sits in two different systems (AppSheet security filters + Web App backend checks).

## Timesheet & payroll

- Clock-in/out captured via AppSheet form (timestamp + staff ID), one row per shift.
- Payroll calculation should reference **actual clocked hours**, not scheduled hours — scheduled-hours-based payroll silently overpays no-shows and underpays overtime. If asked to build a payroll formula, confirm it's reading the timesheet table, not the schedule table.
- Rate table (hourly/monthly, by staff) lives in its own small sheet, not hardcoded into the payroll formula — a hardcoded rate means every raise requires editing the formula itself, which is fragile and easy to get wrong under time pressure.

## Roles (minimum set — expand only with a stated reason)

| Role | Can do |
|---|---|
| Owner/GG | everything, including void/refund and price changes |
| Shift lead | close daily books, approve void requests, view all reports |
| Kitchen staff | update Kitchen Display order status only |
| Front/cashier staff | take orders, accept payment, cannot void without shift-lead approval |

**Void/refund and price-override actions must always be gated behind shift-lead-or-above**, and every gated action needs a `changed_by` + `timestamp` logged (same audit-trail requirement `inventory-stock/SKILL.md` needs for stock adjustments) — a permission system with no log of who used it isn't meaningfully enforced, just theoretically enforced.

## Common failure mode to flag

**UI-only permission hiding is not real access control.** Hiding a "void" button from a cashier's screen stops accidental clicks but doesn't stop a technically savvy staff member or a bug from reaching the same action another way. If asked to "restrict this to managers," always check whether the restriction is enforced at the data/backend layer (AppSheet security filter, or a backend check in the Web App) — not just a hidden button. Flag it explicitly as "UI convenience only, pending real enforcement" if that's genuinely all that's been built so far.

## PDPA note

Staff personal data (ID card numbers, bank account for payroll) needs the same retention/consent discipline as customer data — don't treat staff data as exempt just because it's internal.
