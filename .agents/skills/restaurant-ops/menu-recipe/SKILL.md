---
name: restaurant-menu-recipe
description: Menu, recipe, food-cost, and pricing logic for Clean Food Chiang Rai. Trigger for ANY question about recipe schema, ingredient-to-dish cost rollup, GP% (gross profit margin), platform commission (delivery apps), menu pricing changes, or the Master_สินค้า / recipe linkage tables. Also trigger before proposing any new menu item, price change, or promotion that could affect margin.
---

# Menu & Recipe Costing

## Ownership: this is the pricing brain other modules read from, not write to

`accounting-tax`, `inventory-stock`, and `customer-orders` all reference this module's output (price, cost, GP%) — they should never redefine cost/price logic locally. If a price or cost figure looks inconsistent between modules, this file's schema is the source of truth; the other sheet is stale or mis-linked.

## Core schema

- `Master_สินค้า`: dish name, selling price, category, active/inactive flag, platform-specific price overrides (see below).
- `Recipe_Ingredients` (per dish, one-to-many): links a dish to its ingredients in `Master_วัตถุดิบ` with quantity-per-serving. This is the linkage `inventory-stock/SKILL.md`'s Phase 2 auto-deduction depends on — it must be accurate and complete *before* Phase 2 stock automation is turned on, not after.
- **Cost per dish** = SUMPRODUCT of (ingredient qty-per-serving × current ingredient unit cost from `Master_วัตถุดิบ`), computed live, not hardcoded — a hardcoded cost silently goes stale the moment an ingredient price changes.
- **GP% = (selling price − cost) / selling price.** Track this per dish, not just store-wide — a store-wide average GP hides individual dishes quietly losing money.

## Platform commission handling

Delivery-platform prices (Grab, LINE MAN, etc.) are **not** the same as walk-in/QR-order prices, because platform commission (typically 25–35%) must be absorbed somewhere:
- Either raise the platform-facing price to cover commission (most common), or accept a lower margin on platform orders — this must be a conscious per-dish decision, not a blanket rule, since some dishes have thinner margins than others and a flat markup can push a low-margin dish to an unattractive price.
- Store platform price as an explicit override column per dish, not a global multiplier — a global multiplier breaks the moment one dish needs a different treatment.

## Rules for any menu/price change

1. **Never change a price without recomputing GP% first** and showing it — a price bump that looks good on gut feel can still land below the shop's target margin if ingredient costs moved since it was last checked.
2. **New menu items need a full Recipe_Ingredients row before going live**, not "we'll cost it out later" — an un-costed item breaks both this module's GP tracking and inventory's future auto-deduction.
3. **Seasonal ingredient price swings** (produce especially) should trigger a cost recheck on affected dishes — don't treat ingredient unit cost as a set-once value.

## Phase discipline

Phase 1: manual cost/price entry and GP tracking, used for owner decision-making. Phase 2: this data becomes the live input for `inventory-stock`'s auto-deduction and could feed a future "suggested price" feature for the Vertical SaaS product — don't build the Phase 2 automation until Phase 1's recipe data has been stable and verified in real use for a full cycle (recommend at least one full month), since automation built on unstable recipe data just automates the wrong numbers faster.
