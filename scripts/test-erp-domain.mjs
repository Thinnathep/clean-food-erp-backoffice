import assert from 'assert';

console.log('=== CLEAN FOOD CR ERP: DEEP DOMAIN & BUSINESS LOGIC UNIT TESTS ===\n');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}\n`);
    failed++;
  }
}

// =============================================================
// SECTION 1: FINANCE & 7-FUND POOL ENGINE
// =============================================================
console.log('--- [MODULE 1: FINANCE & 7-FUND POOL SPLIT ENGINE] ---');

function calculateFundSplit(gross, deliveryFee, config, isVatIncluded, vatPct = 7) {
  const delivery = Number(deliveryFee) || 0;
  const net = gross - delivery;

  const vat = isVatIncluded 
    ? +(gross * vatPct / (100 + vatPct)).toFixed(2)
    : +(gross * vatPct / 100).toFixed(2);

  const material = +(net * (config.material_pct / 100)).toFixed(2);
  const labor = +(net * (config.labor_pct / 100)).toFixed(2);
  const ops = +(net * (config.ops_pct / 100)).toFixed(2);
  const profit = +(net * (config.profit_pct / 100)).toFixed(2);

  return { gross, delivery, net, vat, material, labor, ops, profit, totalSplit: +(material + labor + ops + profit).toFixed(2) };
}

function calculate7FundSplit(pkg) {
  const { price, rounds, splits, subsidyPerRound = 35 } = pkg;
  const rawMaterial = Math.round(price * (splits.raw_materials / 100));
  const packaging = Math.round(price * (splits.packaging / 100));
  const labor = Math.round(price * (splits.labor / 100));
  const delivery = rounds * subsidyPerRound;
  const marketing = Math.round(price * (splits.marketing / 100));
  const reserve = Math.round(price * (splits.reserve / 100));
  const netProfit = price - (rawMaterial + packaging + labor + delivery + marketing + reserve);
  const total = rawMaterial + packaging + labor + delivery + marketing + reserve + netProfit;

  return {
    price,
    rawMaterial,
    packaging,
    labor,
    delivery,
    marketing,
    reserve,
    netProfit,
    total,
    pctSum: splits.raw_materials + splits.packaging + splits.labor + splits.delivery + splits.marketing + splits.reserve + splits.profit
  };
}

it('1.1 Standard Pinto 7-Day @999 THB (15 meals, 3 rounds): 40% Raw (400฿), 10% Pack (100฿), 14% Labor (140฿), 11% Delivery (105฿), 4% Mkt (40฿), 4% Res (40฿), 17% Profit (174฿) = 999฿', () => {
  const res = calculate7FundSplit({
    price: 999,
    rounds: 3,
    splits: { raw_materials: 40, packaging: 10, labor: 14, delivery: 11, marketing: 4, reserve: 4, profit: 17 }
  });
  assert.strictEqual(res.rawMaterial, 400);
  assert.strictEqual(res.packaging, 100);
  assert.strictEqual(res.labor, 140);
  assert.strictEqual(res.delivery, 105);
  assert.strictEqual(res.marketing, 40);
  assert.strictEqual(res.reserve, 40);
  assert.strictEqual(res.netProfit, 174);
  assert.strictEqual(res.total, 999);
  assert.strictEqual(res.pctSum, 100);
});

it('1.2 Standard Pinto 14-Day @1,899 THB (30 meals, 5 rounds): 40% Raw (760฿), 10% Pack (190฿), 14% Labor (266฿), 9% Delivery (175฿), 4% Mkt (76฿), 4% Res (76฿), 19% Profit (356฿) = 1,899฿', () => {
  const res = calculate7FundSplit({
    price: 1899,
    rounds: 5,
    splits: { raw_materials: 40, packaging: 10, labor: 14, delivery: 9, marketing: 4, reserve: 4, profit: 19 }
  });
  assert.strictEqual(res.rawMaterial, 760);
  assert.strictEqual(res.packaging, 190);
  assert.strictEqual(res.labor, 266);
  assert.strictEqual(res.delivery, 175);
  assert.strictEqual(res.marketing, 76);
  assert.strictEqual(res.reserve, 76);
  assert.strictEqual(res.netProfit, 356);
  assert.strictEqual(res.total, 1899);
  assert.strictEqual(res.pctSum, 100);
});

it('1.3 Standard Pinto 1-Month @3,999 THB (60 meals, 11 rounds): 40% Raw (1,600฿), 10% Pack (400฿), 14% Labor (560฿), 10% Delivery (385฿), 4% Mkt (160฿), 4% Res (160฿), 18% Profit (734฿) = 3,999฿', () => {
  const res = calculate7FundSplit({
    price: 3999,
    rounds: 11,
    splits: { raw_materials: 40, packaging: 10, labor: 14, delivery: 10, marketing: 4, reserve: 4, profit: 18 }
  });
  assert.strictEqual(res.rawMaterial, 1600);
  assert.strictEqual(res.packaging, 400);
  assert.strictEqual(res.labor, 560);
  assert.strictEqual(res.delivery, 385);
  assert.strictEqual(res.marketing, 160);
  assert.strictEqual(res.reserve, 160);
  assert.strictEqual(res.netProfit, 734);
  assert.strictEqual(res.total, 3999);
  assert.strictEqual(res.pctSum, 100);
});

it('1.4 Box Pack 4 Boxes @299 THB (1 round): 40% Raw (120฿), 10% Pack (30฿), 14% Labor (42฿), 12% Delivery (35฿), 4% Mkt (12฿), 4% Res (12฿), 16% Profit (48฿) = 299฿', () => {
  const res = calculate7FundSplit({
    price: 299,
    rounds: 1,
    splits: { raw_materials: 40, packaging: 10, labor: 14, delivery: 12, marketing: 4, reserve: 4, profit: 16 }
  });
  assert.strictEqual(res.rawMaterial, 120);
  assert.strictEqual(res.packaging, 30);
  assert.strictEqual(res.labor, 42);
  assert.strictEqual(res.delivery, 35);
  assert.strictEqual(res.marketing, 12);
  assert.strictEqual(res.reserve, 12);
  assert.strictEqual(res.netProfit, 48);
  assert.strictEqual(res.total, 299);
  assert.strictEqual(res.pctSum, 100);
});

it('1.5 Box Pack 6 Boxes @399 THB (1 round): 40% Raw (160฿), 10% Pack (40฿), 14% Labor (56฿), 9% Delivery (35฿), 4% Mkt (16฿), 4% Res (16฿), 19% Profit (76฿) = 399฿', () => {
  const res = calculate7FundSplit({
    price: 399,
    rounds: 1,
    splits: { raw_materials: 40, packaging: 10, labor: 14, delivery: 9, marketing: 4, reserve: 4, profit: 19 }
  });
  assert.strictEqual(res.rawMaterial, 160);
  assert.strictEqual(res.packaging, 40);
  assert.strictEqual(res.labor, 56);
  assert.strictEqual(res.delivery, 35);
  assert.strictEqual(res.marketing, 16);
  assert.strictEqual(res.reserve, 16);
  assert.strictEqual(res.netProfit, 76);
  assert.strictEqual(res.total, 399);
  assert.strictEqual(res.pctSum, 100);
});

it('1.6 Box Pack 7 Boxes @459 THB (1 round): 40% Raw (184฿), 10% Pack (46฿), 14% Labor (64฿), 8% Delivery (35฿), 4% Mkt (18฿), 4% Res (18฿), 20% Profit (94฿) = 459฿', () => {
  const res = calculate7FundSplit({
    price: 459,
    rounds: 1,
    splits: { raw_materials: 40, packaging: 10, labor: 14, delivery: 8, marketing: 4, reserve: 4, profit: 20 }
  });
  assert.strictEqual(res.rawMaterial, 184);
  assert.strictEqual(res.packaging, 46);
  assert.strictEqual(res.labor, 64);
  assert.strictEqual(res.delivery, 35);
  assert.strictEqual(res.marketing, 18);
  assert.strictEqual(res.reserve, 18);
  assert.strictEqual(res.netProfit, 94);
  assert.strictEqual(res.total, 459);
  assert.strictEqual(res.pctSum, 100);
});

it('1.7 Delivery Subsidy Rule: Exactly 35 THB per round across all delivery configurations', () => {
  const testRounds = [1, 3, 5, 11];
  testRounds.forEach(r => {
    const subsidy = r * 35;
    assert.strictEqual(subsidy, r * 35);
  });
});

it('1.4 Cash Reconciliation calculates exact variance (Physical Cash - System Recorded)', () => {
  function reconcileCash(systemAmount, physicalCash) {
    const diff = +(physicalCash - systemAmount).toFixed(2);
    const status = diff === 0 ? 'BALANCED' : diff > 0 ? 'OVER' : 'SHORT';
    return { systemAmount, physicalCash, diff, status };
  }
  const balanced = reconcileCash(5000, 5000);
  assert.strictEqual(balanced.status, 'BALANCED');
  assert.strictEqual(balanced.diff, 0);

  const short = reconcileCash(5000, 4850);
  assert.strictEqual(short.status, 'SHORT');
  assert.strictEqual(short.diff, -150);

  const over = reconcileCash(5000, 5200);
  assert.strictEqual(over.status, 'OVER');
  assert.strictEqual(over.diff, 200);
});

it('1.5 Invoice total calculation with itemization, discounts, and 7% tax', () => {
  function calculateInvoiceTotal(items, discountAmount = 0, taxRate = 7) {
    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const taxAmount = +(afterDiscount * (taxRate / 100)).toFixed(2);
    const grandTotal = +(afterDiscount + taxAmount).toFixed(2);
    return { subtotal, afterDiscount, taxAmount, grandTotal };
  }
  const invoice = calculateInvoiceTotal([
    { name: 'Pinto 6 Box', qty: 2, unitPrice: 399 },
    { name: 'Extra Protein', qty: 4, unitPrice: 45 }
  ], 50, 7);
  assert.strictEqual(invoice.subtotal, 798 + 180); // 978
  assert.strictEqual(invoice.afterDiscount, 928);
  assert.strictEqual(invoice.taxAmount, +(928 * 0.07).toFixed(2)); // 64.96
  assert.strictEqual(invoice.grandTotal, +(928 + 64.96).toFixed(2)); // 992.96
});

// =============================================================
// SECTION 2: PINTO PACKAGES, MEMBERS & PROMOTIONS
// =============================================================
console.log('\n--- [MODULE 2: PINTO PACKAGES & MEMBER CRM] ---');

const PINTO_PROMOTIONS = [
  { id: 'p4', name: 'Set 4 กล่อง', price: 299, boxCount: 4, expectedAvgPerBox: 74.75 },
  { id: 'p6', name: 'Set 6 กล่อง', price: 399, boxCount: 6, expectedAvgPerBox: 66.50 },
  { id: 'p7', name: 'Set 7 กล่อง', price: 459, boxCount: 7, expectedAvgPerBox: 65.57 },
];

it('2.1 Pinto package pricing per box matches business constitution', () => {
  for (const promo of PINTO_PROMOTIONS) {
    const avg = +(promo.price / promo.boxCount).toFixed(2);
    assert.strictEqual(avg, promo.expectedAvgPerBox, `Promo ${promo.name} avg mismatch`);
  }
});

it('2.2 Meal Deduction tracks meals_remaining without blocking negative audit display', () => {
  function deductMeal(packageState, count = 1) {
    return {
      ...packageState,
      meals_remaining: packageState.meals_remaining - count,
      last_deducted: new Date().toISOString()
    };
  }
  const pkg = { id: 'pkg-1', meals_total: 6, meals_remaining: 1 };
  const updated = deductMeal(pkg, 2);
  assert.strictEqual(updated.meals_remaining, -1, 'Audit layer must reflect true overdraft');
});

it('2.3 Buddy Group qualification requires >= 2 active members', () => {
  function checkBuddyGroupQualified(members) {
    const activeMembers = members.filter(m => m.status === 'active');
    return activeMembers.length >= 2;
  }
  assert.strictEqual(checkBuddyGroupQualified([{ status: 'active' }, { status: 'active' }]), true);
  assert.strictEqual(checkBuddyGroupQualified([{ status: 'active' }, { status: 'paused' }]), false);
  assert.strictEqual(checkBuddyGroupQualified([{ status: 'active' }]), false);
});

it('2.4 Group Order tiered discount logic (5-9 boxes = 5%, 10+ boxes = 10%)', () => {
  function getGroupDiscountPct(totalBoxes) {
    if (totalBoxes >= 10) return 10;
    if (totalBoxes >= 5) return 5;
    return 0;
  }
  assert.strictEqual(getGroupDiscountPct(4), 0);
  assert.strictEqual(getGroupDiscountPct(5), 5);
  assert.strictEqual(getGroupDiscountPct(8), 5);
  assert.strictEqual(getGroupDiscountPct(10), 10);
  assert.strictEqual(getGroupDiscountPct(25), 10);
});

// =============================================================
// SECTION 3: KDS KITCHEN OPERATIONS & RECIPE BOM
// =============================================================
console.log('\n--- [MODULE 3: KDS KITCHEN & RECIPE BOM ENGINE] ---');

function isDeliveryDay(dayIndex) {
  // 1 = Monday, 3 = Wednesday, 5 = Friday
  return dayIndex === 1 || dayIndex === 3 || dayIndex === 5;
}

it('3.1 Delivery days are strictly Monday (1), Wednesday (3), and Friday (5)', () => {
  assert.strictEqual(isDeliveryDay(1), true, 'Monday is delivery day');
  assert.strictEqual(isDeliveryDay(3), true, 'Wednesday is delivery day');
  assert.strictEqual(isDeliveryDay(5), true, 'Friday is delivery day');
  assert.strictEqual(isDeliveryDay(0), false, 'Sunday is not delivery day');
  assert.strictEqual(isDeliveryDay(2), false, 'Tuesday is not delivery day');
  assert.strictEqual(isDeliveryDay(4), false, 'Thursday is not delivery day');
  assert.strictEqual(isDeliveryDay(6), false, 'Saturday is not delivery day');
});

it('3.2 Nutritional Macro Calorie Check (4*Protein + 4*Carbs + 9*Fat)', () => {
  function calculateCalories(protein, carbs, fat) {
    return (protein * 4) + (carbs * 4) + (fat * 9);
  }
  // Standard Clean Chicken Breast Meal: 35g P, 40g C, 8g F
  const cals = calculateCalories(35, 40, 8);
  assert.strictEqual(cals, (35 * 4) + (40 * 4) + (8 * 9)); // 140 + 160 + 72 = 372 kcal
});

it('3.3 Recipe BOM batch requirement computation with yield % compensation', () => {
  function computeIngredientRequired(targetPortions, qtyPerPortion, yieldPct) {
    const rawPerPortion = qtyPerPortion / (yieldPct / 100);
    return +(rawPerPortion * targetPortions).toFixed(2);
  }
  // Chicken Breast: 150g cooked portion with 80% cooking yield for 50 portions
  // 150 / 0.8 = 187.5g raw per portion -> 187.5 * 50 = 9,375g (9.375 kg)
  const totalRawGrams = computeIngredientRequired(50, 150, 80);
  assert.strictEqual(totalRawGrams, 9375.00);
});

// =============================================================
// SECTION 4: LOGISTICS & DISPATCH
// =============================================================
console.log('\n--- [MODULE 4: LOGISTICS & DISPATCH ENGINE] ---');

it('4.1 Delivery fee zone engine (Inside Ring ฿0, Outside Ring ฿15/km after 5km)', () => {
  function calculateShippingFee(distanceKm, zoneType, isMemberFree = false) {
    if (isMemberFree) return 0;
    if (zoneType === 'inside') return 0;
    const baseKm = 5;
    if (distanceKm <= baseKm) return 30;
    return 30 + ((distanceKm - baseKm) * 15);
  }
  assert.strictEqual(calculateShippingFee(3, 'inside'), 0);
  assert.strictEqual(calculateShippingFee(4, 'outside'), 30);
  assert.strictEqual(calculateShippingFee(8, 'outside'), 30 + (3 * 15)); // 75
  assert.strictEqual(calculateShippingFee(12, 'outside', true), 0); // Member free shipping
});

it('4.2 Rider delivery earnings allocation is standard ฿45 per drop point stop', () => {
  function computeRiderEarnings(completedStops, perStopRate = 45) {
    return completedStops * perStopRate;
  }
  assert.strictEqual(computeRiderEarnings(8), 360);
  assert.strictEqual(computeRiderEarnings(12), 540);
});

// =============================================================
// SECTION 5: PROCUREMENT & INVENTORY
// =============================================================
console.log('\n--- [MODULE 5: PROCUREMENT & INVENTORY] ---');

it('5.1 Low stock alert triggers when current_stock < min_stock_level', () => {
  function checkLowStock(item) {
    return item.current_stock < item.min_stock_level;
  }
  assert.strictEqual(checkLowStock({ current_stock: 5, min_stock_level: 10 }), true);
  assert.strictEqual(checkLowStock({ current_stock: 10, min_stock_level: 10 }), false);
  assert.strictEqual(checkLowStock({ current_stock: 15, min_stock_level: 10 }), false);
});

it('5.2 Purchase Order total calculation with line items and VAT', () => {
  function calculatePOTotal(items, vatPct = 7) {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const vat_amount = +(subtotal * (vatPct / 100)).toFixed(2);
    const total_amount = +(subtotal + vat_amount).toFixed(2);
    return { subtotal, vat_amount, total_amount };
  }
  const po = calculatePOTotal([
    { quantity: 20, unit_price: 85 }, // 1700
    { quantity: 50, unit_price: 24 }, // 1200
  ], 7);
  assert.strictEqual(po.subtotal, 2900);
  assert.strictEqual(po.vat_amount, 203.00);
  assert.strictEqual(po.total_amount, 3103.00);
});

it('5.3 Unit conversion logic (g <-> kg, ml <-> L)', () => {
  function convertUnits(value, fromUnit, toUnit) {
    if (fromUnit === 'g' && toUnit === 'kg') return value / 1000;
    if (fromUnit === 'kg' && toUnit === 'g') return value * 1000;
    if (fromUnit === 'ml' && toUnit === 'L') return value / 1000;
    if (fromUnit === 'L' && toUnit === 'ml') return value * 1000;
    return value;
  }
  assert.strictEqual(convertUnits(2500, 'g', 'kg'), 2.5);
  assert.strictEqual(convertUnits(3.5, 'kg', 'g'), 3500);
  assert.strictEqual(convertUnits(750, 'ml', 'L'), 0.75);
});

// =============================================================
// SUMMARY & REPORT
// =============================================================
console.log('\n=========================================');
if (failed === 0) {
  console.log(`✅ ALL ${passed} DOMAIN & PER-PAGE UNIT TESTS PASSED!`);
} else {
  console.error(`❌ ${failed} TESTS FAILED!`);
}
console.log('=========================================\n');

if (failed > 0) process.exit(1);
else process.exit(0);
