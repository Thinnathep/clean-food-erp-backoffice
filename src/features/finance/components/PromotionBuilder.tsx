import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../config/supabase';
import { POOL_CONFIG } from '../types';
import type { PoolType } from '../types';
import { toast } from 'sonner';
import { InfoTooltip } from './InfoTooltip';
import {
  Rocket, Receipt, ShieldCheck,
  Truck, Zap, ChefHat,
  Save, AlertTriangle, TrendingUp,
  PieChart as PieIcon, Coins, RotateCcw,
  Package, Fuel, Home, Star,
  Percent, Shield, Sparkles, ThumbsUp, ThumbsDown, Minus, Loader2, Tag
} from 'lucide-react';

interface Props {
  isDarkMode?: boolean;
}

const DEFAULTS = {
  promoName: '', promoCode: '', price: 1799, meals: 30, deliveryCount: 14,
  includeVat: false, gpPercentage: 0,
  materialPerMeal: 35, laborPerMeal: 10, packagingPerMeal: 5,
  deliveryCostPerTrip: 20, gasCostPerTrip: 15,
  billMonthly: 5000, rentMonthly: 0, adBudget: 1000,
  depreciationMonthly: 500, insuranceMonthly: 0, contingencyPct: 5,
  promoCustomers: 10, promoDays: 14,
};

export const PromotionBuilder: React.FC<Props> = ({ isDarkMode = false }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoName, setPromoName] = useState(DEFAULTS.promoName);
  const [promoCode, setPromoCode] = useState(DEFAULTS.promoCode);
  const [price, setPrice] = useState(DEFAULTS.price);
  const [meals, setMeals] = useState(DEFAULTS.meals);
  const [deliveryCount, setDeliveryCount] = useState(DEFAULTS.deliveryCount);
  const [includeVat, setIncludeVat] = useState(DEFAULTS.includeVat);
  const [gpPercentage, setGpPercentage] = useState(DEFAULTS.gpPercentage);
  const [materialPerMeal, setMaterialPerMeal] = useState(DEFAULTS.materialPerMeal);
  const [laborPerMeal, setLaborPerMeal] = useState(DEFAULTS.laborPerMeal);
  const [packagingPerMeal, setPackagingPerMeal] = useState(DEFAULTS.packagingPerMeal);
  const [deliveryCostPerTrip, setDeliveryCostPerTrip] = useState(DEFAULTS.deliveryCostPerTrip);
  const [gasCostPerTrip, setGasCostPerTrip] = useState(DEFAULTS.gasCostPerTrip);
  const [billMonthly, setBillMonthly] = useState(DEFAULTS.billMonthly);
  const [rentMonthly, setRentMonthly] = useState(DEFAULTS.rentMonthly);
  const [adBudget, setAdBudget] = useState(DEFAULTS.adBudget);
  const [depreciationMonthly, setDepreciationMonthly] = useState(DEFAULTS.depreciationMonthly);
  const [insuranceMonthly, setInsuranceMonthly] = useState(DEFAULTS.insuranceMonthly);
  const [contingencyPct, setContingencyPct] = useState(DEFAULTS.contingencyPct);
  const [promoCustomers, setPromoCustomers] = useState(DEFAULTS.promoCustomers);
  const [promoDays, setPromoDays] = useState(DEFAULTS.promoDays);

  // --- AUTO-SAVE DRAFT SYSTEM ---
  useEffect(() => {
    const savedDraft = localStorage.getItem('promotion_builder_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.promoName) setPromoName(draft.promoName);
        if (draft.promoCode) setPromoCode(draft.promoCode);
        if (draft.price) setPrice(draft.price);
        if (draft.meals) setMeals(draft.meals);
        if (draft.deliveryCount) setDeliveryCount(draft.deliveryCount);
        if (draft.includeVat !== undefined) setIncludeVat(draft.includeVat);
        if (draft.gpPercentage !== undefined) setGpPercentage(draft.gpPercentage);
        if (draft.materialPerMeal) setMaterialPerMeal(draft.materialPerMeal);
        if (draft.laborPerMeal) setLaborPerMeal(draft.laborPerMeal);
        if (draft.packagingPerMeal) setPackagingPerMeal(draft.packagingPerMeal);
        if (draft.deliveryCostPerTrip) setDeliveryCostPerTrip(draft.deliveryCostPerTrip);
        if (draft.gasCostPerTrip) setGasCostPerTrip(draft.gasCostPerTrip);
        if (draft.billMonthly) setBillMonthly(draft.billMonthly);
        if (draft.rentMonthly) setRentMonthly(draft.rentMonthly);
        if (draft.adBudget) setAdBudget(draft.adBudget);
        if (draft.depreciationMonthly) setDepreciationMonthly(draft.depreciationMonthly);
        if (draft.insuranceMonthly) setInsuranceMonthly(draft.insuranceMonthly);
        if (draft.contingencyPct) setContingencyPct(draft.contingencyPct);
        if (draft.promoCustomers) setPromoCustomers(draft.promoCustomers);
        if (draft.promoDays) setPromoDays(draft.promoDays);
      } catch (e) { console.error('Error loading draft', e); }
    }
  }, []);

  useEffect(() => {
    const draft = { promoName, promoCode, price, meals, deliveryCount, includeVat, gpPercentage, materialPerMeal, laborPerMeal, packagingPerMeal, billMonthly, rentMonthly, adBudget, deliveryCostPerTrip, gasCostPerTrip, depreciationMonthly, insuranceMonthly, contingencyPct, promoCustomers, promoDays };
    localStorage.setItem('promotion_builder_draft', JSON.stringify(draft));
  }, [promoName, promoCode, price, meals, deliveryCount, includeVat, gpPercentage, materialPerMeal, laborPerMeal, packagingPerMeal, billMonthly, rentMonthly, adBudget, deliveryCostPerTrip, gasCostPerTrip, depreciationMonthly, insuranceMonthly, contingencyPct, promoCustomers, promoDays]);

  const handleSaveDraft = () => {
    const draft = { promoName, promoCode, price, meals, deliveryCount, includeVat, gpPercentage, materialPerMeal, laborPerMeal, packagingPerMeal, billMonthly, rentMonthly, adBudget, deliveryCostPerTrip, gasCostPerTrip, depreciationMonthly, insuranceMonthly, contingencyPct, promoCustomers, promoDays };
    localStorage.setItem('promotion_builder_draft', JSON.stringify(draft));
    toast.success('บันทึกแบบร่างเรียบร้อยแล้ว ข้อมูลจะคงอยู่แม้รีเฟรชหน้าจอ');
  };

  const handleReset = () => {
    setPromoName(DEFAULTS.promoName); setPromoCode(DEFAULTS.promoCode); setPrice(DEFAULTS.price); setMeals(DEFAULTS.meals);
    setDeliveryCount(DEFAULTS.deliveryCount); setIncludeVat(DEFAULTS.includeVat);
    setGpPercentage(DEFAULTS.gpPercentage); setMaterialPerMeal(DEFAULTS.materialPerMeal);
    setLaborPerMeal(DEFAULTS.laborPerMeal); setPackagingPerMeal(DEFAULTS.packagingPerMeal);
    setDeliveryCostPerTrip(DEFAULTS.deliveryCostPerTrip); setGasCostPerTrip(DEFAULTS.gasCostPerTrip);
    setBillMonthly(DEFAULTS.billMonthly); setRentMonthly(DEFAULTS.rentMonthly);
    setAdBudget(DEFAULTS.adBudget); setDepreciationMonthly(DEFAULTS.depreciationMonthly);
    setInsuranceMonthly(DEFAULTS.insuranceMonthly); setContingencyPct(DEFAULTS.contingencyPct);
    setPromoCustomers(DEFAULTS.promoCustomers); setPromoDays(DEFAULTS.promoDays);
    localStorage.removeItem('promotion_builder_draft');
    toast.success('รีเซ็ตค่าทั้งหมดเรียบร้อย');
  };

  const calculations = useMemo(() => {
    const gpAmount = +(price * gpPercentage / 100).toFixed(2);
    const afterGp = price - gpAmount;
    const vatAmount = includeVat ? +(afterGp * 7 / 107).toFixed(2) : 0;
    const netRevenue = +(afterGp - vatAmount).toFixed(2);

    const totalMaterial = materialPerMeal * meals;
    const totalLabor = laborPerMeal * meals;
    const totalPackaging = packagingPerMeal * meals;
    const totalDelivery = deliveryCostPerTrip * deliveryCount;
    const totalGas = gasCostPerTrip * deliveryCount;
    const allocRatio = promoDays / 30;
    const totalBills = +(billMonthly * allocRatio).toFixed(2);
    const totalRent = +(rentMonthly * allocRatio).toFixed(2);
    const totalDepreciation = +(depreciationMonthly * allocRatio).toFixed(2);
    const totalInsurance = +(insuranceMonthly * allocRatio).toFixed(2);
    const totalAds = adBudget;

    const variableCost = totalMaterial + totalLabor + totalPackaging;
    const deliveryCost = totalDelivery + totalGas;
    const fixedCost = totalBills + totalRent + totalAds + totalDepreciation + totalInsurance;
    const subtotalCost = variableCost + deliveryCost + fixedCost;
    const contingencyAmount = +(subtotalCost * contingencyPct / 100).toFixed(2);
    const totalCost = +(subtotalCost + contingencyAmount).toFixed(2);
    const netProfit = +(netRevenue - totalCost).toFixed(2);
    const marginPct = netRevenue > 0 ? +((netProfit / netRevenue) * 100).toFixed(2) : 0;
    const costPerMeal = meals > 0 ? +(totalCost / meals).toFixed(2) : 0;
    const revenuePerMeal = meals > 0 ? +(netRevenue / meals).toFixed(2) : 0;
    const profitPerMeal = meals > 0 ? +(netProfit / meals).toFixed(2) : 0;
    const breakEvenMeals = revenuePerMeal > 0 ? Math.ceil(totalCost / revenuePerMeal) : 999;
    const profitPerCustomer = promoCustomers > 0 ? +(netProfit / promoCustomers).toFixed(2) : 0;
    const totalRevenueAll = netRevenue * promoCustomers;
    const totalProfitAll = netProfit * promoCustomers;

    const opsAmount = deliveryCost + fixedCost + contingencyAmount;
    const matPct = netRevenue > 0 ? +((totalMaterial / netRevenue) * 100).toFixed(2) : 0;
    const labPct = netRevenue > 0 ? +((totalLabor / netRevenue) * 100).toFixed(2) : 0;
    const opsPct = netRevenue > 0 ? +((opsAmount / netRevenue) * 100).toFixed(2) : 0;
    const profPct = netRevenue > 0 ? +((netProfit / netRevenue) * 100).toFixed(2) : 0;

    // Promo Score (0-100)
    let score = 50;
    if (marginPct >= 30) score += 20; else if (marginPct >= 15) score += 10; else if (marginPct < 0) score -= 30;
    if (costPerMeal < revenuePerMeal * 0.6) score += 10;
    if (breakEvenMeals <= meals) score += 10; else score -= 10;
    if (contingencyPct >= 3) score += 5;
    if (totalPackaging > 0) score += 5;
    score = Math.max(0, Math.min(100, score));

    return {
      gpAmount, vatAmount, netRevenue,
      totalMaterial, totalLabor, totalPackaging, totalDelivery, totalGas,
      totalBills, totalRent, totalAds, totalDepreciation, totalInsurance,
      variableCost, deliveryCost, fixedCost, contingencyAmount,
      opsAmount, totalCost, netProfit, marginPct,
      costPerMeal, revenuePerMeal, profitPerMeal, breakEvenMeals,
      profitPerCustomer, totalRevenueAll, totalProfitAll,
      score,
      split: { MATERIAL: matPct, LABOR: labPct, OPS: opsPct, PROFIT: profPct }
    };
  }, [price, meals, deliveryCount, includeVat, gpPercentage, materialPerMeal, laborPerMeal, packagingPerMeal, billMonthly, rentMonthly, adBudget, deliveryCostPerTrip, gasCostPerTrip, depreciationMonthly, insuranceMonthly, contingencyPct, promoCustomers, promoDays]);

  const handleSaveStrategy = async () => {
    if (!promoName) return toast.error('กรุณาตั้งชื่อโปรโมชั่น');
    setIsSubmitting(true);
    try {
      // 1. Check if a Split Config with this name already exists
      const { data: existingConfigs } = await supabase
        .from('erp_split_configs')
        .select('id')
        .eq('config_name', promoName)
        .eq('is_active', true)
        .limit(1);

      let splitDataId: string;

      const configData = {
        config_name: promoName,
        promotion_type: meals > 1 ? 'PINTO' : 'RETAIL',
        material_pct: calculations.split.MATERIAL,
        labor_pct: calculations.split.LABOR,
        ops_pct: calculations.split.OPS,
        profit_pct: calculations.split.PROFIT,
        is_active: true,
        notes: JSON.stringify({
          strategy: 'PROMOTION_BUILDER_V2',
          input: { price, meals, deliveryCount, includeVat, gpPercentage, materialPerMeal, laborPerMeal, packagingPerMeal, billMonthly, rentMonthly, adBudget, deliveryCostPerTrip, gasCostPerTrip, depreciationMonthly, insuranceMonthly, contingencyPct, promoCustomers, promoDays },
          results: calculations
        })
      };

      if (existingConfigs && existingConfigs.length > 0) {
        // Update existing
        splitDataId = existingConfigs[0].id;
        const { error: updateError } = await supabase
          .from('erp_split_configs')
          .update(configData)
          .eq('id', splitDataId);
        
        if (updateError) throw updateError;
      } else {
        // Insert new
        const { data: newData, error: insertError } = await supabase
          .from('erp_split_configs')
          .insert({ ...configData, is_default: false })
          .select()
          .single();
        
        if (insertError) throw insertError;
        splitDataId = newData.id;
      }

      // 2. Save to Promotions (Sales/Marketing)
      // Check if promotion with same code already exists
      const resolvedCode = promoCode || promoName.replace(/\s+/g, '_').toUpperCase();
      const promoPayload = {
        name: promoName,
        code: resolvedCode,
        price: price,
        meals_count: meals,
        days_count: promoDays,
        promotion_type: meals > 1 ? 'PINTO' : 'RETAIL',
        is_active: true,
        sales_script: `แพ็กเกจ ${promoName} (${promoCode}) ราคาเพียง ฿${price.toLocaleString()} ได้ทั้งหมด ${meals} มื้อ (เฉลี่ยมื้อละ ฿${calculations.revenuePerMeal}) คุ้มค่าที่สุดสำหรับดูแลสุขภาพต่อเนื่อง ${promoDays} วันค่ะ`,
        split_config_id: splitDataId,
        discount_type: 'FIXED',
        discount_value: 0
      };

      const { data: existingPromo } = await supabase
        .from('promotions')
        .select('id')
        .eq('code', resolvedCode)
        .limit(1);

      if (existingPromo && existingPromo.length > 0) {
        const { error: promoError } = await supabase
          .from('promotions')
          .update(promoPayload)
          .eq('id', existingPromo[0].id);
        if (promoError) throw promoError;
      } else {
        const { error: promoError } = await supabase
          .from('promotions')
          .insert(promoPayload);
        if (promoError) throw promoError;
      }

      toast.success('บันทึกแผนกลยุทธ์และโปรโมชั่นเรียบร้อยแล้ว');
    } catch (err: any) { toast.error('ล้มเหลว: ' + err.message); }
    finally { setIsSubmitting(false); }
  };

  const card = isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const input = isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700';
  const numInput = (val: number, set: (n: number) => void) => ({
    value: val === 0 ? '' : val,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v === '') set(0); else { const num = Number(v); if (!isNaN(num)) set(num); }
    }
  });

  const scoreColor = calculations.score >= 70 ? 'text-emerald-500' : calculations.score >= 40 ? 'text-amber-500' : 'text-red-500';
  const scoreBg = calculations.score >= 70 ? 'bg-emerald-500/10 border-emerald-500/30' : calculations.score >= 40 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30';
  const scoreLabel = calculations.score >= 70 ? 'โปรนี้ดีมาก!' : calculations.score >= 40 ? 'พอใช้ได้ ลองปรับเพิ่ม' : 'เสี่ยงขาดทุน ต้องปรับ';
  const scoreIcon = calculations.score >= 70 ? <ThumbsUp size={16} /> : calculations.score >= 40 ? <Minus size={16} /> : <ThumbsDown size={16} />;

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <motion.div variants={item} className="lg:col-span-5 space-y-4">
        <div className={`p-5 rounded-3xl border transition-all ${card}`}>
           <div className="flex items-center gap-3 mb-5">
              <motion.div whileHover={{ rotate: 15, scale: 1.1 }} className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20"><Rocket size={20} /></motion.div>
              <div>
                 <h3 className="text-lg font-bold">Promotion Builder</h3>
                 <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">สร้างกลยุทธ์ราคาและกำไร</p>
              </div>
           </div>

           <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Receipt size={10} className="text-indigo-500" /> ชื่อโปรโมชั่น</label>
                     </div>
                     <input type="text" value={promoName} onChange={(e) => setPromoName(e.target.value)} placeholder="เช่น โปร 5.5 ลดกระหน่ำ..." className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${isDarkMode ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white'}`} />
                  </div>
                  <div className="space-y-1.5">
                     <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Tag size={10} className="text-emerald-500" /> รหัสโปรโมชั่น (Code)</label>
                     </div>
                     <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase().replace(/\s+/g, ''))} placeholder="เช่น PINTO1799" className={`w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none transition-all border ${isDarkMode ? 'bg-slate-800/50 border-slate-700 focus:border-emerald-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-emerald-500 focus:bg-white'}`} />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase flex items-center">ราคาขาย (฿)<InfoTooltip text="ราคาที่ลูกค้าจ่ายจริง รวมทุกอย่างแล้ว ก่อนหักค่า GP" isDarkMode={isDarkMode} /></label>
                    <input type="number" {...numInput(price, setPrice)} className={`w-full p-2.5 rounded-xl border outline-none focus:border-indigo-500 transition-all font-bold text-sm ${input}`} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase flex items-center">จำนวนมื้อ<InfoTooltip text="จำนวนมื้ออาหารทั้งหมดในแพ็กเกจนี้ เช่น 30 มื้อ" isDarkMode={isDarkMode} /></label>
                    <input type="number" {...numInput(meals, setMeals)} className={`w-full p-2.5 rounded-xl border outline-none focus:border-indigo-500 transition-all font-bold text-sm ${input}`} />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase flex items-center">ระยะเวลาโปร (วัน)<InfoTooltip text="จำนวนวันที่โปรนี้ใช้ได้ ใช้คำนวณส่วนแบ่งค่าใช้จ่ายรายเดือน" isDarkMode={isDarkMode} /></label>
                    <input type="number" {...numInput(promoDays, setPromoDays)} className={`w-full p-2.5 rounded-xl border outline-none focus:border-indigo-500 transition-all font-bold text-sm ${input}`} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase flex items-center">จำนวนลูกค้า<InfoTooltip text="จำนวนลูกค้าที่คาดว่าจะซื้อโปรนี้ ใช้คำนวณกำไรรวมทั้งหมด" isDarkMode={isDarkMode} /></label>
                    <input type="number" {...numInput(promoCustomers, setPromoCustomers)} className={`w-full p-2.5 rounded-xl border outline-none focus:border-indigo-500 transition-all font-bold text-sm ${input}`} />
                 </div>
              </div>

              <div className="p-3 bg-amber-500/5 rounded-xl border border-dashed border-amber-300/50 space-y-2">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Receipt size={16} className="text-amber-500" />
                       <span className="text-xs font-medium">รวม VAT 7% ในราคาแล้ว</span>
                       <InfoTooltip text="เปิดหากราคาที่ตั้งรวม VAT แล้ว ระบบจะถอด VAT ออกจากรายรับให้อัตโนมัติ" isDarkMode={isDarkMode} />
                    </div>
                    <button onClick={() => setIncludeVat(!includeVat)} className={`w-11 h-5 rounded-full transition-all relative ${includeVat ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                       <motion.div animate={{ x: includeVat ? 22 : 0 }} className="absolute top-0.5 w-4 h-4 bg-white rounded-full left-0.5" />
                    </button>
                 </div>
                 <p className="text-[9px] text-amber-600/80 flex items-center gap-1"><Shield size={10} /> ร้านยังไม่จดทะเบียน VAT — ไม่มีหน้าที่เก็บ VAT จากลูกค้า แต่ใช้จำลองเพื่อวางแผนอนาคต</p>
              </div>

              <div className="space-y-2 pt-1">
                 <p className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-1"><ChefHat size={13} /> ต้นทุนผันแปร (Variable)<InfoTooltip text="ต้นทุนที่เพิ่มขึ้นตามจำนวนมื้อ ยิ่งขายมาก ยิ่งจ่ายมาก" isDarkMode={isDarkMode} /></p>
                 <div className="grid grid-cols-3 gap-2">
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                       <label className="text-[9px] font-bold text-slate-400 block mb-0.5 flex items-center">วัตถุดิบ/มื้อ</label>
                       <input type="number" {...numInput(materialPerMeal, setMaterialPerMeal)} className="w-full bg-transparent border-none outline-none font-bold text-sm" />
                    </div>
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                       <label className="text-[9px] font-bold text-slate-400 block mb-0.5 flex items-center">ค่าแรง/มื้อ</label>
                       <input type="number" {...numInput(laborPerMeal, setLaborPerMeal)} className="w-full bg-transparent border-none outline-none font-bold text-sm" />
                    </div>
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                       <label className="text-[9px] font-bold text-slate-400 block mb-0.5 flex items-center"><Package size={10} className="mr-0.5" /> แพ็กเกจ/มื้อ</label>
                       <input type="number" {...numInput(packagingPerMeal, setPackagingPerMeal)} className="w-full bg-transparent border-none outline-none font-bold text-sm" />
                    </div>
                 </div>
              </div>

              <div className="space-y-2 pt-1">
                 <p className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1"><Truck size={13} /> จัดส่งและแพลตฟอร์ม</p>
                 <div className="grid grid-cols-2 gap-2">
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                       <label className="text-[9px] font-bold text-slate-400 block mb-0.5 flex items-center">รอบส่ง</label>
                       <input type="number" {...numInput(deliveryCount, setDeliveryCount)} className="w-full bg-transparent border-none outline-none font-bold text-sm" />
                    </div>
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                       <label className="text-[9px] font-bold text-slate-400 block mb-0.5 flex items-center">ค่าส่ง/รอบ</label>
                       <input type="number" {...numInput(deliveryCostPerTrip, setDeliveryCostPerTrip)} className="w-full bg-transparent border-none outline-none font-bold text-sm" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                       <label className="text-[9px] font-bold text-slate-400 block mb-0.5 flex items-center"><Fuel size={10} className="mr-0.5" /> น้ำมัน/รอบ</label>
                       <input type="number" {...numInput(gasCostPerTrip, setGasCostPerTrip)} className="w-full bg-transparent border-none outline-none font-bold text-sm" />
                    </div>
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                       <label className="text-[9px] font-bold text-slate-400 block mb-0.5 flex items-center">GP แพลตฟอร์ม (%)</label>
                       <input type="number" {...numInput(gpPercentage, setGpPercentage)} className="w-full bg-transparent border-none outline-none font-bold text-sm" />
                    </div>
                 </div>
              </div>

              <div className="space-y-2 pt-1">
                 <p className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1"><Zap size={13} /> ค่าใช้จ่ายคงที่ (Fixed)</p>
                 <div className="grid grid-cols-2 gap-2">
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                       <label className="text-[9px] font-bold text-slate-400 block mb-0.5 flex items-center">ค่าน้ำ/ไฟ/เน็ต</label>
                       <input type="number" {...numInput(billMonthly, setBillMonthly)} className="w-full bg-transparent border-none outline-none font-bold text-sm" />
                    </div>
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                       <label className="text-[9px] font-bold text-slate-400 block mb-0.5 flex items-center"><Home size={10} className="mr-0.5" /> ค่าเช่า/เดือน</label>
                       <input type="number" {...numInput(rentMonthly, setRentMonthly)} className="w-full bg-transparent border-none outline-none font-bold text-sm" />
                    </div>
                 </div>
                 <div className="grid grid-cols-3 gap-2">
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                       <label className="text-[9px] font-bold text-slate-400 block mb-0.5 flex items-center">โฆษณา</label>
                       <input type="number" {...numInput(adBudget, setAdBudget)} className="w-full bg-transparent border-none outline-none font-bold text-sm" />
                    </div>
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                       <label className="text-[9px] font-bold text-slate-400 block mb-0.5 flex items-center">ค่าเสื่อม</label>
                       <input type="number" {...numInput(depreciationMonthly, setDepreciationMonthly)} className="w-full bg-transparent border-none outline-none font-bold text-sm" />
                    </div>
                    <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                       <label className="text-[9px] font-bold text-slate-400 block mb-0.5 flex items-center">ประกัน</label>
                       <input type="number" {...numInput(insuranceMonthly, setInsuranceMonthly)} className="w-full bg-transparent border-none outline-none font-bold text-sm" />
                    </div>
                 </div>
              </div>

              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                 <label className="text-[9px] font-bold text-slate-400 block mb-0.5 flex items-center"><Percent size={10} className="mr-0.5" /> สำรองฉุกเฉิน (%)</label>
                 <input type="number" {...numInput(contingencyPct, setContingencyPct)} className="w-full bg-transparent border-none outline-none font-bold text-sm" />
              </div>
           </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="lg:col-span-7 space-y-4">
         <div className={`p-6 rounded-3xl border transition-all relative overflow-hidden ${card}`}>
            <div className="relative z-10 space-y-5">
               <div className="flex justify-between items-start">
                  <div>
                     <h3 className="text-xl font-bold">วิเคราะห์กำไรสุทธิ</h3>
                     <p className="text-xs text-slate-500">Net Profitability Analysis</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border ${scoreBg} ${scoreColor}`}>
                        <Sparkles size={14} /> คะแนน: {calculations.score}/100
                     </div>
                     <div className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ${calculations.marginPct >= 15 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                        {calculations.marginPct >= 15 ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                        {calculations.marginPct}%
                     </div>
                  </div>
               </div>

               <div className={`p-3 rounded-xl border flex items-center gap-3 ${scoreBg}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${scoreColor} ${calculations.score >= 70 ? 'bg-emerald-500/20' : calculations.score >= 40 ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>{scoreIcon}</div>
                  <div>
                     <p className={`text-sm font-bold ${scoreColor}`}>{scoreLabel}</p>
                     <p className="text-[10px] text-slate-500">{calculations.score >= 70 ? 'Margin ดี ต้นทุนคุม Break-even ได้' : calculations.score >= 40 ? 'ลองปรับราคาหรือลดต้นทุนเพิ่ม' : 'ต้นทุนเกินรายรับ ต้องปรับโครงสร้างราคาใหม่'}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                     <p className="text-[10px] opacity-80 uppercase font-bold mb-0.5">รายรับสุทธิ (1 คน)</p>
                     <p className="text-2xl font-black">฿{calculations.netRevenue.toLocaleString()}</p>
                     <div className="mt-2 pt-2 border-t border-white/20 flex justify-between text-[9px]">
                        <span>GP: -฿{calculations.gpAmount}</span>
                        <span>VAT: -฿{calculations.vatAmount}</span>
                     </div>
                  </div>
                  <div className={`p-4 rounded-2xl text-white shadow-lg ${calculations.netProfit > 0 ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'}`}>
                     <p className="text-[10px] opacity-80 uppercase font-bold mb-0.5">กำไรสุทธิ (1 คน)</p>
                     <p className="text-2xl font-black">฿{calculations.netProfit.toLocaleString()}</p>
                     <p className="mt-2 text-[9px] flex items-center gap-1">
                        <TrendingUp size={10} /> {calculations.netProfit > 0 ? 'แผนนี้สร้างกำไรได้จริง' : 'ขาดทุน ต้องปรับราคาหรือต้นทุน'}
                     </p>
                  </div>
               </div>

               {/* Per-Meal & Break-Even Metrics */}
               <div className="grid grid-cols-4 gap-2">
                  <div className={`p-3 rounded-xl border text-center ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                     <p className="text-[9px] text-slate-400 font-bold uppercase">รายรับ/มื้อ</p>
                     <p className="text-sm font-black text-indigo-500">฿{calculations.revenuePerMeal}</p>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                     <p className="text-[9px] text-slate-400 font-bold uppercase">ต้นทุน/มื้อ</p>
                     <p className="text-sm font-black text-red-500">฿{calculations.costPerMeal}</p>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                     <p className="text-[9px] text-slate-400 font-bold uppercase">กำไร/มื้อ</p>
                     <p className={`text-sm font-black ${calculations.profitPerMeal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>฿{calculations.profitPerMeal}</p>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                     <p className="text-[9px] text-slate-400 font-bold uppercase">จุดคุ้มทุน</p>
                     <p className={`text-sm font-black ${calculations.breakEvenMeals <= meals ? 'text-emerald-500' : 'text-amber-500'}`}>{calculations.breakEvenMeals} มื้อ</p>
                  </div>
               </div>

               {/* Multi-Customer Projection */}
               <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase mb-2 flex items-center gap-1"><Star size={12} /> ประมาณการรวม ({promoCustomers} ลูกค้า)</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                     <div><p className="text-[9px] text-slate-400">รายรับรวม</p><p className="text-sm font-black text-indigo-600">฿{calculations.totalRevenueAll.toLocaleString()}</p></div>
                     <div><p className="text-[9px] text-slate-400">ต้นทุนรวม</p><p className="text-sm font-black text-red-500">฿{(calculations.totalCost * promoCustomers).toLocaleString()}</p></div>
                     <div><p className="text-[9px] text-slate-400">กำไรรวม</p><p className={`text-sm font-black ${calculations.totalProfitAll >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>฿{calculations.totalProfitAll.toLocaleString()}</p></div>
                  </div>
               </div>

               {/* Split Structure */}
               <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><PieIcon size={12} /> โครงสร้าง Split</h4>
                  <div className="flex h-8 rounded-xl overflow-hidden shadow-inner">
                     {Object.entries(calculations.split).map(([key, pct]) => {
                        const cfg = POOL_CONFIG[key as PoolType];
                        const absPct = Math.abs(pct as number);
                        return <div key={key} style={{ width: `${Math.max(absPct, 2)}%`, backgroundColor: cfg.color }} className="h-full flex items-center justify-center text-[9px] font-bold text-white">{absPct > 8 && `${pct}%`}</div>;
                     })}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                     {Object.entries(calculations.split).map(([key, pct]) => {
                        const cfg = POOL_CONFIG[key as PoolType];
                        return (
                           <div key={key} className={`flex items-center gap-1.5 p-2 rounded-lg border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                              <span className="text-sm">{cfg.icon}</span>
                              <div className="min-w-0">
                                 <p className="text-[8px] font-bold text-slate-400 uppercase">{cfg.label}</p>
                                 <p className="text-xs font-bold" style={{ color: cfg.color }}>{pct}%</p>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>

               {/* Cost Breakdown */}
               <div className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-slate-900/30 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-1.5 mb-1"><Coins size={14} className="text-slate-400" /><h4 className="text-xs font-bold">เจาะลึกต้นทุน</h4></div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                     <div className="flex justify-between"><span className="text-slate-500">วัตถุดิบ</span><span className="font-bold">฿{calculations.totalMaterial.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span className="text-slate-500">ค่าแรง</span><span className="font-bold">฿{calculations.totalLabor.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span className="text-slate-500">บรรจุภัณฑ์</span><span className="font-bold">฿{calculations.totalPackaging.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span className="text-slate-500">จัดส่ง+น้ำมัน</span><span className="font-bold">฿{(calculations.totalDelivery + calculations.totalGas).toLocaleString()}</span></div>
                     <div className="flex justify-between"><span className="text-slate-500">สาธารณูปโภค</span><span className="font-bold">฿{calculations.totalBills.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span className="text-slate-500">ค่าเช่า</span><span className="font-bold">฿{calculations.totalRent.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span className="text-slate-500">โฆษณา</span><span className="font-bold">฿{calculations.totalAds.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span className="text-slate-500">ค่าเสื่อม+ประกัน</span><span className="font-bold">฿{(calculations.totalDepreciation + calculations.totalInsurance).toLocaleString()}</span></div>
                     <div className="flex justify-between col-span-2 text-amber-600"><span>สำรองฉุกเฉิน ({contingencyPct}%)</span><span className="font-bold">฿{calculations.contingencyAmount.toLocaleString()}</span></div>
                  </div>
                  <div className="h-px bg-slate-200 dark:bg-slate-700" />
                  <div className="flex justify-between items-center">
                     <span className="text-xs font-bold uppercase">ต้นทุนรวม:</span>
                     <span className="text-lg font-black">฿{calculations.totalCost.toLocaleString()}</span>
                  </div>
               </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-1">
                   <motion.button 
                     whileTap={{ scale: 0.97 }} 
                     onClick={handleReset} 
                     className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                   >
                     <RotateCcw size={16} /> ล้างข้อมูล
                   </motion.button>
                   
                   <motion.button 
                     whileTap={{ scale: 0.97 }} 
                     onClick={handleSaveDraft} 
                     className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}
                   >
                     <Save size={16} /> บันทึกร่าง
                   </motion.button>

                   <motion.button 
                     whileTap={{ scale: 0.97 }} 
                     onClick={handleSaveStrategy} 
                     disabled={isSubmitting}
                     className="flex-[2] py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                   >
                     {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />} 
                     บันทึกโปรโมชั่นจริง
                   </motion.button>
                </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
         </div>
      </motion.div>
    </motion.div>
  );
};
