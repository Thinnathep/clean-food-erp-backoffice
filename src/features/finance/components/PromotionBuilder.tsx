import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import {
  Receipt, Truck, Zap, Save, RotateCcw,
  Sparkles, Loader2, Tag, ChevronDown, ChevronUp, CheckCircle2
} from 'lucide-react';

interface Props {
  isDarkMode?: boolean;
}

import { STANDARD_7FUND_PACKAGES } from '../types';

// 📦 Standard Packages Presets (7 กองทุน & ช่วยค่าส่ง 35฿/รอบ)
const STANDARD_PRESETS = STANDARD_7FUND_PACKAGES.map(p => ({
  id: p.id,
  name: p.name,
  code: p.code,
  price: p.price,
  meals: p.meals,
  deliveryRounds: p.rounds,
  days: p.days,
  tag: p.tag,
  desc: p.desc,
  split: {
    material: p.splitPct.material,
    packaging: p.splitPct.packaging,
    labor: p.splitPct.labor,
    deliverySub: p.splitPct.deliverySub,
    marketing: p.splitPct.marketing,
    maintenance: p.splitPct.maintenance,
    profit: p.splitPct.profit
  },
  splitAmount: p.splitAmount
}));


const DEFAULTS = {
  promoName: 'ผูกปิ่นโต 14 วัน (30 มื้อ)',
  promoCode: 'PINTO_14D_1899',
  price: 1899,
  meals: 30,
  deliveryCount: 5,
  promoDays: 14,
  includeVat: false,
  gpPercentage: 0,
  promoCustomers: 10,
  // 7 Fund Percentages
  materialPct: 40,
  packagingPct: 10,
  laborPct: 14,
  deliverySubPct: 9,
  marketingPct: 4,
  maintenancePct: 4,
  profitPct: 19,
  // Advanced Overhead (Optional)
  billMonthly: 0,
  rentMonthly: 0,
  depreciationMonthly: 0,
  insuranceMonthly: 0,
  contingencyPct: 0
};

export const PromotionBuilder: React.FC<Props> = ({ isDarkMode = false }) => {
  const [activePreset, setActivePreset] = useState<string>('pinto_14d');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [showAdvancedOverhead, setShowAdvancedOverhead] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [promoName, setPromoName] = useState(DEFAULTS.promoName);
  const [promoCode, setPromoCode] = useState(DEFAULTS.promoCode);
  const [price, setPrice] = useState(DEFAULTS.price);
  const [meals, setMeals] = useState(DEFAULTS.meals);
  const [deliveryCount, setDeliveryCount] = useState(DEFAULTS.deliveryCount);
  const [promoDays, setPromoDays] = useState(DEFAULTS.promoDays);
  const [promoCustomers, setPromoCustomers] = useState(DEFAULTS.promoCustomers);
  const [includeVat, setIncludeVat] = useState(DEFAULTS.includeVat);
  const [gpPercentage, setGpPercentage] = useState(DEFAULTS.gpPercentage);

  // 7 Funds Split States
  const [materialPct, setMaterialPct] = useState(DEFAULTS.materialPct);
  const [packagingPct, setPackagingPct] = useState(DEFAULTS.packagingPct);
  const [laborPct, setLaborPct] = useState(DEFAULTS.laborPct);
  const [deliverySubPct, setDeliverySubPct] = useState(DEFAULTS.deliverySubPct);
  const [marketingPct, setMarketingPct] = useState(DEFAULTS.marketingPct);
  const [maintenancePct, setMaintenancePct] = useState(DEFAULTS.maintenancePct);
  const [profitPct, setProfitPct] = useState(DEFAULTS.profitPct);

  // Advanced Overhead States
  const [billMonthly, setBillMonthly] = useState(DEFAULTS.billMonthly);
  const [rentMonthly, setRentMonthly] = useState(DEFAULTS.rentMonthly);
  const [depreciationMonthly, setDepreciationMonthly] = useState(DEFAULTS.depreciationMonthly);
  const [insuranceMonthly, setInsuranceMonthly] = useState(DEFAULTS.insuranceMonthly);
  const [contingencyPct, setContingencyPct] = useState(DEFAULTS.contingencyPct);

  // --- AUTO-SAVE DRAFT SYSTEM ---
  useEffect(() => {
    const savedDraft = localStorage.getItem('promotion_builder_draft_v3');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.promoName) setPromoName(draft.promoName);
        if (draft.promoCode) setPromoCode(draft.promoCode);
        if (draft.price !== undefined) setPrice(draft.price);
        if (draft.meals !== undefined) setMeals(draft.meals);
        if (draft.deliveryCount !== undefined) setDeliveryCount(draft.deliveryCount);
        if (draft.promoDays !== undefined) setPromoDays(draft.promoDays);
        if (draft.materialPct !== undefined) setMaterialPct(draft.materialPct);
        if (draft.packagingPct !== undefined) setPackagingPct(draft.packagingPct);
        if (draft.laborPct !== undefined) setLaborPct(draft.laborPct);
        if (draft.deliverySubPct !== undefined) setDeliverySubPct(draft.deliverySubPct);
        if (draft.marketingPct !== undefined) setMarketingPct(draft.marketingPct);
        if (draft.maintenancePct !== undefined) setMaintenancePct(draft.maintenancePct);
        if (draft.profitPct !== undefined) setProfitPct(draft.profitPct);
      } catch (e) {
        console.error('Error loading draft', e);
      }
    }
  }, []);

  const handleApplyPreset = (presetId: string) => {
    setActivePreset(presetId);
    const p = STANDARD_PRESETS.find(x => x.id === presetId);
    if (!p) return;
    setPromoName(p.name);
    setPromoCode(p.code);
    setPrice(p.price);
    setMeals(p.meals);
    setDeliveryCount(p.deliveryRounds);
    setPromoDays(p.days);
    setMaterialPct(p.split.material);
    setPackagingPct(p.split.packaging);
    setLaborPct(p.split.labor);
    setDeliverySubPct(p.split.deliverySub);
    setMarketingPct(p.split.marketing);
    setMaintenancePct(p.split.maintenance);
    setProfitPct(p.split.profit);
    toast.success(`โหลดข้อมูลแพ็กเกจ ${p.name} ครบ 7 หมวดเรียบร้อย`);
  };

  const handleSaveDraft = () => {
    const draft = {
      promoName, promoCode, price, meals, deliveryCount, promoDays, promoCustomers,
      includeVat, gpPercentage, materialPct, packagingPct, laborPct, deliverySubPct,
      marketingPct, maintenancePct, profitPct
    };
    localStorage.setItem('promotion_builder_draft_v3', JSON.stringify(draft));
    toast.success('บันทึกแบบร่างเรียบร้อยแล้ว');
  };

  const handleReset = () => {
    handleApplyPreset('pinto_14d');
    localStorage.removeItem('promotion_builder_draft_v3');
    toast.success('รีเซ็ตเป็นค่าเริ่มต้นเรียบร้อย');
  };

  // Calculations
  const calculations = useMemo(() => {
    const gpAmount = +(price * gpPercentage / 100).toFixed(2);
    const afterGp = price - gpAmount;
    const vatAmount = includeVat ? +(afterGp * 7 / 107).toFixed(2) : 0;
    const netRevenue = +(afterGp - vatAmount).toFixed(2);

    // 7 Funds amounts (Exact integer Baht when matching standard packages with 0 GP / No VAT)
    const matchedStd = STANDARD_PRESETS.find(p => 
      p.price === price &&
      p.meals === meals &&
      p.split.deliverySub === deliverySubPct &&
      p.split.profit === profitPct &&
      gpPercentage === 0 &&
      !includeVat
    );

    const materialAmount = matchedStd ? matchedStd.splitAmount.material : +(netRevenue * materialPct / 100).toFixed(2);
    const packagingAmount = matchedStd ? matchedStd.splitAmount.packaging : +(netRevenue * packagingPct / 100).toFixed(2);
    const laborAmount = matchedStd ? matchedStd.splitAmount.labor : +(netRevenue * laborPct / 100).toFixed(2);
    const deliverySubAmount = matchedStd ? matchedStd.splitAmount.deliverySub : +(netRevenue * deliverySubPct / 100).toFixed(2);
    const marketingAmount = matchedStd ? matchedStd.splitAmount.marketing : +(netRevenue * marketingPct / 100).toFixed(2);
    const maintenanceAmount = matchedStd ? matchedStd.splitAmount.maintenance : +(netRevenue * maintenancePct / 100).toFixed(2);
    const profitAmount = matchedStd ? matchedStd.splitAmount.profit : +(netRevenue * profitPct / 100).toFixed(2);

    const totalAllocatedPct = materialPct + packagingPct + laborPct + deliverySubPct + marketingPct + maintenancePct + profitPct;
    const totalCost = +(materialAmount + packagingAmount + laborAmount + deliverySubAmount + marketingAmount + maintenanceAmount).toFixed(2);

    // Per-unit metrics
    const revenuePerMeal = meals > 0 ? +(netRevenue / meals).toFixed(2) : 0;
    const costPerMeal = meals > 0 ? +(totalCost / meals).toFixed(2) : 0;
    const profitPerMeal = meals > 0 ? +(profitAmount / meals).toFixed(2) : 0;
    const subsidyPerRound = deliveryCount > 0 ? +(deliverySubAmount / deliveryCount).toFixed(2) : 0;

    const netMargin = netRevenue > 0 ? +((profitAmount / netRevenue) * 100).toFixed(1) : 0;

    // Score
    let score = 50;
    if (netMargin >= 18) score += 30; else if (netMargin >= 10) score += 15; else if (netMargin < 0) score -= 30;
    if (totalAllocatedPct === 100) score += 20;
    score = Math.max(0, Math.min(100, score));

    return {
      gpAmount, vatAmount, netRevenue,
      materialAmount, packagingAmount, laborAmount, deliverySubAmount,
      marketingAmount, maintenanceAmount, profitAmount,
      totalCost, totalAllocatedPct,
      revenuePerMeal, costPerMeal, profitPerMeal, subsidyPerRound,
      netMargin, score
    };
  }, [price, meals, deliveryCount, includeVat, gpPercentage, materialPct, packagingPct, laborPct, deliverySubPct, marketingPct, maintenancePct, profitPct]);

  const handleSaveStrategy = async () => {
    if (!promoName) return toast.error('กรุณาตั้งชื่อโปรโมชั่น');
    if (calculations.totalAllocatedPct !== 100) {
      return toast.error(`ผลรวมสัดส่วนกองทุนต้องเท่ากับ 100% พอดี (ปัจจุบัน ${calculations.totalAllocatedPct}%)`);
    }

    setIsSubmitting(true);
    try {
      // 1. Save or update Split Config
      const resolvedConfigName = promoName;
      const { data: existingConfigs } = await supabase
        .from('erp_split_configs')
        .select('id')
        .eq('config_name', resolvedConfigName)
        .eq('is_active', true)
        .limit(1);

      const splitConfigPayload = {
        config_name: resolvedConfigName,
        promotion_type: meals > 1 ? 'PINTO' : 'RETAIL',
        material_pct: materialPct,
        packaging_pct: packagingPct,
        labor_pct: laborPct,
        delivery_sub_pct: deliverySubPct,
        marketing_pct: marketingPct,
        maintenance_pct: maintenancePct,
        profit_pct: profitPct,
        ops_pct: 0,
        is_active: true,
        notes: `สูตรมาตรฐาน 7 กองทุน (04/08/2569): วัตถุดิบ ${materialPct}%, บิล/ถุง ${packagingPct}%, ค่าแรง ${laborPct}%, ช่วยส่ง Grab ${deliverySubPct}%, ตลาด ${marketingPct}%, ซ่อม ${maintenancePct}%, กำไรสุทธิ ${profitPct}%`
      };

      let splitConfigId: string;

      if (existingConfigs && existingConfigs.length > 0) {
        splitConfigId = existingConfigs[0].id;
        const { error: updateErr } = await supabase
          .from('erp_split_configs')
          .update(splitConfigPayload)
          .eq('id', splitConfigId);
        if (updateErr) throw updateErr;
      } else {
        const { data: newCfg, error: insertErr } = await supabase
          .from('erp_split_configs')
          .insert({ ...splitConfigPayload, is_default: false })
          .select()
          .single();
        if (insertErr) throw insertErr;
        splitConfigId = newCfg.id;
      }

      // 2. Save or update Promotions table
      const resolvedCode = promoCode || promoName.replace(/\s+/g, '_').toUpperCase();
      const promoPayload = {
        name: promoName,
        code: resolvedCode,
        price: price,
        meals_count: meals,
        days_count: promoDays,
        delivery_rounds: deliveryCount,
        promotion_type: meals > 1 ? 'PINTO' : 'RETAIL',
        is_active: true,
        sales_script: `แพ็กเกจ ${promoName} (${resolvedCode}) ราคา ฿${price.toLocaleString()} ได้ ${meals} มื้อ (จัดส่ง ${deliveryCount} รอบ) เฉลี่ยมื้อละ ฿${calculations.revenuePerMeal} งบช่วยส่ง Grab ฿${calculations.subsidyPerRound}/รอบ`,
        split_config_id: splitConfigId,
        discount_type: 'FIXED',
        discount_value: 0
      };

      const { data: existingPromo } = await supabase
        .from('promotions')
        .select('id')
        .eq('code', resolvedCode)
        .limit(1);

      if (existingPromo && existingPromo.length > 0) {
        const { error: promoErr } = await supabase
          .from('promotions')
          .update(promoPayload)
          .eq('id', existingPromo[0].id);
        if (promoErr) throw promoErr;
      } else {
        const { error: promoErr } = await supabase
          .from('promotions')
          .insert(promoPayload);
        if (promoErr) throw promoErr;
      }

      toast.success('บันทึกแผนกลยุทธ์โปรโมชั่น 7 กองทุนเรียบร้อยแล้ว!');
    } catch (err: any) {
      toast.error('ล้มเหลว: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const card = isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const input = isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700';

  return (
    <div className="space-y-6">
      {/* 🚀 Preset Header Bar */}
      <div className={`p-4 rounded-3xl border transition-all ${card}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              เทมเพลตมาตรฐาน Clean Food CR (อัปเดต 04/08/2569)
            </h3>
            <p className="text-xs text-slate-500 font-normal">คลิกเลือกแพ็กเกจเพื่อโหลดตัวเลขสัดส่วน 7 กองทุนและรอบจัดส่งอัตโนมัติ</p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-medium self-start md:self-auto">
            100% Balanced Pool
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {STANDARD_PRESETS.map(preset => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  isSelected 
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30' 
                    : isDarkMode ? 'border-slate-700 bg-slate-900/40 hover:border-slate-600' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{preset.name}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600">
                    ฿{preset.price.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal line-clamp-1">{preset.desc}</p>
                {isSelected && (
                  <div className="absolute top-0 right-0 w-2 h-2 rounded-bl-lg bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3-Step Wizard Inputs (5 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className={`p-5 rounded-3xl border transition-all ${card}`}>
            {/* Step Selector Navigation */}
            <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-200 dark:border-slate-700">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    currentStep === 1 
                      ? 'bg-indigo-500 text-white shadow-sm font-semibold' 
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>1.</span> ข้อมูลแพ็กเกจ
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    currentStep === 2 
                      ? 'bg-indigo-500 text-white shadow-sm font-semibold' 
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>2.</span> 7 กองทุน
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    currentStep === 3 
                      ? 'bg-indigo-500 text-white shadow-sm font-semibold' 
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>3.</span> ค่าใช้จ่ายเสริม
                </button>
              </div>
              <span className="text-[11px] text-slate-400 font-normal">ขั้นตอนที่ {currentStep}/3</span>
            </div>

            {/* STEP 1: Package Essentials */}
            {currentStep === 1 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Receipt size={12} className="text-indigo-500" /> ชื่อแพ็กเกจ
                    </label>
                    <input
                      type="text"
                      value={promoName}
                      onChange={e => setPromoName(e.target.value)}
                      placeholder="เช่น ผูกปิ่นโต 14 วัน (30 มื้อ)"
                      className={`w-full px-3.5 py-2 rounded-xl text-sm border outline-none font-medium ${input}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Tag size={12} className="text-emerald-500" /> รหัสโปร (Code)
                    </label>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                      placeholder="เช่น PINTO_14D_1899"
                      className={`w-full px-3.5 py-2 rounded-xl text-sm font-mono border outline-none font-medium ${input}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">ราคาขาย (฿)</label>
                    <input
                      type="number"
                      value={price || ''}
                      onChange={e => setPrice(Number(e.target.value) || 0)}
                      className={`w-full p-2.5 rounded-xl border outline-none font-semibold text-sm text-emerald-600 ${input}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">จำนวนมื้อ</label>
                    <input
                      type="number"
                      value={meals || ''}
                      onChange={e => setMeals(Number(e.target.value) || 0)}
                      className={`w-full p-2.5 rounded-xl border outline-none font-semibold text-sm text-indigo-600 ${input}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block flex items-center gap-1">
                      <Truck size={12} className="text-orange-500" /> รอบส่งจริง
                    </label>
                    <input
                      type="number"
                      value={deliveryCount || ''}
                      onChange={e => setDeliveryCount(Number(e.target.value) || 0)}
                      className={`w-full p-2.5 rounded-xl border outline-none font-semibold text-sm text-orange-600 ${input}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">ระยะเวลาคอร์ส (วัน)</label>
                    <input
                      type="number"
                      value={promoDays || ''}
                      onChange={e => setPromoDays(Number(e.target.value) || 0)}
                      className={`w-full p-2.5 rounded-xl border outline-none font-medium text-xs ${input}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">จำลองลูกค้า (คน)</label>
                    <input
                      type="number"
                      value={promoCustomers || ''}
                      onChange={e => setPromoCustomers(Number(e.target.value) || 0)}
                      className={`w-full p-2.5 rounded-xl border outline-none font-medium text-xs ${input}`}
                    />
                  </div>
                </div>

                {/* VAT & GP Switches */}
                <div className="p-3 bg-amber-500/5 rounded-xl border border-dashed border-amber-300/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt size={15} className="text-amber-500" />
                      <span className="text-xs font-medium">รวม VAT 7% ในราคาขาย</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIncludeVat(!includeVat)}
                      className={`w-11 h-5 rounded-full transition-all relative ${includeVat ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <motion.div animate={{ x: includeVat ? 22 : 0 }} className="absolute top-0.5 w-4 h-4 bg-white rounded-full left-0.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-amber-200/40">
                    <span className="text-xs font-medium">หัก GP แพลตฟอร์ม (Lineman/Grab)</span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        value={gpPercentage || ''}
                        onChange={e => setGpPercentage(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-14 text-right px-2 py-0.5 rounded-lg border text-xs font-bold outline-none dark:bg-slate-800"
                      />
                      <span className="text-[10px] text-slate-400">%</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-2.5 mt-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-1"
                >
                  ถัดไป: ตรวจสอบสัดส่วน 7 กองทุน ➔
                </button>
              </div>
            )}

            {/* STEP 2: 7-Fund Split Distribution */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    โครงสร้างสัดส่วน 7 กองทุน (มาตรฐาน 04/08/2569)
                  </p>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                    calculations.totalAllocatedPct === 100 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40' 
                      : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40'
                  }`}>
                    รวม: {calculations.totalAllocatedPct}%
                  </span>
                </div>

                {/* Split Bars */}
                <div className="space-y-2.5">
                  {[
                    { label: '🟢 วัตถุดิบ (Raw Materials)', pct: materialPct, set: setMaterialPct, color: '#10b981', desc: 'อกไก่ ผัก ข้าว เครื่องปรุงคลีน' },
                    { label: '🟡 ค่าบิล & ถุงซีล (Packaging & Bills)', pct: packagingPct, set: setPackagingPct, color: '#eab308', desc: 'ถุงซีล 2 ชั้น + ค่าไฟ + ค่าแก๊ส' },
                    { label: '🔵 ค่าแรงคนทำ (Kitchen Labor)', pct: laborPct, set: setLaborPct, color: '#3b82f6', desc: 'จ่ายทีมครัวและคนทำอาหาร' },
                    { label: '🛵 ช่วยค่าส่ง Grab (Delivery Subsidy)', pct: deliverySubPct, set: setDeliverySubPct, color: '#f97316', desc: '~30-34฿ ต่อรอบจัดส่ง' },
                    { label: '📢 งบการตลาด Ads/Content', pct: marketingPct, set: setMarketingPct, color: '#8b5cf6', desc: 'ยิงแอด ทำคอนเทนต์ TikTok/FB' },
                    { label: '🛠️ ทุนสำรอง/ซ่อมบำรุง', pct: maintenancePct, set: setMaintenancePct, color: '#64748b', desc: 'ซ่อมตู้เย็น ซ่อมเครื่องซีล' },
                    { label: '🔴 กำไรสุทธิเข้ากระเป๋า (Net Profit 19%)', pct: profitPct, set: setProfitPct, color: '#ec4899', desc: 'กำไรสุทธิปันผลเข้ากระเป๋า 19%' },
                  ].map(f => (
                    <div key={f.label} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{f.label}</span>
                        <div className="flex items-center gap-1 font-mono">
                          <input
                            type="number"
                            value={f.pct}
                            onChange={e => f.set(Number(e.target.value) || 0)}
                            className="w-14 text-right px-1.5 py-0.5 rounded-lg border text-xs font-semibold outline-none dark:bg-slate-800"
                          />
                          <span className="text-xs text-slate-400 font-normal">%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(f.pct * 2, 100)}%`, backgroundColor: f.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 py-2 rounded-xl border text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    ⬅ ย้อนกลับ
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="flex-[2] py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium shadow-md hover:bg-indigo-700 transition-all"
                  >
                    ถัดไป: ดูสรุปผลกำไร ➔
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Advanced Overhead (Collapsible) */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-500" /> ค่าใช้จ่ายคงที่เพิ่มเติม (Overhead)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedOverhead(!showAdvancedOverhead)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showAdvancedOverhead ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 font-normal">
                    ในโมเดล 7 กองทุน ค่าบิลและค่าแก๊สถูกรวมในหมวด 10% และงบซ่อมบำรุงอยู่ในหมวด 4% เรียบร้อยแล้ว (ไม่จำเป็นต้องกรอกส่วนนี้หากใช้สูตรมาตรฐาน)
                  </p>
                </div>

                {showAdvancedOverhead && (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-0.5 block">ค่าน้ำ/ไฟต่อเดือน</label>
                      <input type="number" value={billMonthly || ''} onChange={e => setBillMonthly(Number(e.target.value) || 0)} className={`w-full p-2 rounded-xl border ${input}`} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-0.5 block">ค่าเช่าที่ต่อเดือน</label>
                      <input type="number" value={rentMonthly || ''} onChange={e => setRentMonthly(Number(e.target.value) || 0)} className={`w-full p-2 rounded-xl border ${input}`} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-0.5 block">ค่าเสื่อมต่อเดือน</label>
                      <input type="number" value={depreciationMonthly || ''} onChange={e => setDepreciationMonthly(Number(e.target.value) || 0)} className={`w-full p-2 rounded-xl border ${input}`} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-0.5 block">ค่าประกันภัยต่อเดือน</label>
                      <input type="number" value={insuranceMonthly || ''} onChange={e => setInsuranceMonthly(Number(e.target.value) || 0)} className={`w-full p-2 rounded-xl border ${input}`} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-0.5 block">สำรองฉุกเฉิน (%)</label>
                      <input type="number" value={contingencyPct || ''} onChange={e => setContingencyPct(Number(e.target.value) || 0)} className={`w-full p-2 rounded-xl border ${input}`} />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full py-2 rounded-xl border text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    ⬅ ย้อนกลับไปสัดส่วนกองทุน
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Executive Scorecard & Profit Breakdown (7 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className={`p-6 rounded-3xl border transition-all relative overflow-hidden ${card}`}>
            <div className="space-y-4">
              {/* Header Analysis */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-semibold">วิเคราะห์ผลตอบแทน 7 กองทุน</h3>
                  <p className="text-xs text-slate-500 font-normal">7-Fund Net Profitability Scorecard</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Margin: {calculations.netMargin}%
                  </span>
                </div>
              </div>

              {/* Top Highlights: Net Revenue & Net Profit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                  <p className="text-[11px] uppercase font-medium opacity-90 mb-0.5">ยอดขายสุทธิ / แพ็กเกจ</p>
                  <p className="text-2xl font-bold font-mono">฿{calculations.netRevenue.toLocaleString()}</p>
                  <p className="text-xs opacity-90 mt-1 font-normal">เฉลี่ย ฿{calculations.revenuePerMeal}/มื้อ</p>
                </div>
                <div className="p-4 rounded-2xl bg-pink-600 text-white shadow-md shadow-pink-500/20">
                  <p className="text-[11px] uppercase font-medium opacity-90 mb-0.5">กำไรสุทธิเข้ากระเป๋า (19%)</p>
                  <p className="text-2xl font-bold font-mono">฿{calculations.profitAmount.toLocaleString()}</p>
                  <p className="text-xs opacity-90 mt-1 font-normal">กำไร ฿{calculations.profitPerMeal}/มื้อ 🔒</p>
                </div>
              </div>

              {/* Per-Meal & Per-Round Metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">ต้นทุนวัตถุดิบ/มื้อ</p>
                  <p className="text-sm font-semibold text-emerald-600 font-mono">
                    ฿{meals > 0 ? (calculations.materialAmount / meals).toFixed(2) : '0'}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">ค่าแรงคนทำ/มื้อ</p>
                  <p className="text-sm font-semibold text-blue-600 font-mono">
                    ฿{meals > 0 ? (calculations.laborAmount / meals).toFixed(2) : '0'}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">งบช่วยส่ง Grab/รอบ</p>
                  <p className="text-sm font-semibold text-orange-600 font-mono">
                    ฿{calculations.subsidyPerRound}
                  </p>
                </div>
              </div>

              {/* Full 7-Fund Amounts Table */}
              <div className={`p-4 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-slate-900/30 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-semibold uppercase text-slate-500">สรุปเงินที่แยกเข้าแต่ละกองทุน</h4>
                  <span className="text-[11px] font-mono font-normal text-slate-400">1 แพ็กเกจ</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300 font-normal flex items-center gap-1.5">🟢 กองทุนวัตถุดิบ ({materialPct}%)</span>
                    <span className="font-mono font-semibold text-emerald-600">฿{calculations.materialAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300 font-normal flex items-center gap-1.5">🟡 ค่าบิล & ถุงซีล ({packagingPct}%)</span>
                    <span className="font-mono font-semibold text-amber-600">฿{calculations.packagingAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300 font-normal flex items-center gap-1.5">🔵 ค่าแรงคนทำ ({laborPct}%)</span>
                    <span className="font-mono font-semibold text-blue-600">฿{calculations.laborAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300 font-normal flex items-center gap-1.5">🛵 ช่วยค่าส่ง Grab ({deliverySubPct}%)</span>
                    <span className="font-mono font-semibold text-orange-600">฿{calculations.deliverySubAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300 font-normal flex items-center gap-1.5">📢 งบการตลาด ({marketingPct}%)</span>
                    <span className="font-mono font-semibold text-purple-600">฿{calculations.marketingAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300 font-normal flex items-center gap-1.5">🛠️ ทุนสำรอง/ซ่อม ({maintenancePct}%)</span>
                    <span className="font-mono font-semibold text-slate-600">฿{calculations.maintenanceAmount.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-pink-600 flex items-center gap-1.5">🔴 กำไรสุทธิเข้ากระเป๋า ({profitPct}%)</span>
                    <span className="font-mono font-bold text-pink-600">฿{calculations.profitAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                    isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <RotateCcw size={14} /> รีเซ็ต
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                    isDarkMode ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400' : 'border-indigo-100 bg-indigo-50 text-indigo-600'
                  }`}
                >
                  <Save size={14} /> บันทึกร่าง
                </button>
                <button
                  type="button"
                  onClick={handleSaveStrategy}
                  disabled={isSubmitting}
                  className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  บันทึกสูตรและโปรโมชั่น
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
