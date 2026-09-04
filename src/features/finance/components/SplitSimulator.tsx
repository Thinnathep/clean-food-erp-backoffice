import React, { useState } from 'react';
import { supabase } from '../../../config/supabase';
import { getPoolConfig } from '../types';
import type { SplitConfig, PoolType } from '../types';
import { toast } from 'sonner';
import { 
  Calculator, Target, ShieldCheck, AlertCircle, Sparkles, PlusCircle
} from 'lucide-react';

interface Props {
  configs: SplitConfig[];
  isDarkMode?: boolean;
}

// Pinto package presets (อัปเดต 04/08/2569)
const PINTO_PRESETS = [
  { label: '📦 7 วัน (15 มื้อ)', price: 999, meals: 15, rounds: 3 },
  { label: '📦 14 วัน (30 มื้อ)', price: 1899, meals: 30, rounds: 5 },
  { label: '📦 1 เดือน (63 มื้อ)', price: 3999, meals: 63, rounds: 11 },
];

// Muscle package presets
const MUSCLE_PRESETS = [
  { label: '🏋️ Muscle 14 วัน (62 มื้อ)', price: 7399, meals: 62 },
  { label: '🏋️ Muscle 30 วัน (124 มื้อ) - Std', price: 12499, meals: 124 },
  { label: '🏋️ Muscle 30 วัน (124 มื้อ) - Prem', price: 14499, meals: 124 },
];

export const SplitSimulator: React.FC<Props> = ({ isDarkMode = false }) => {
  const [amount, setAmount] = useState(1899);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [meals, setMeals] = useState(30);
  const [rounds, setRounds] = useState(5);

  // 7 Funds Percentages (Standard 04/08/2569)
  const [materialPct, setMaterialPct] = useState(40);
  const [packagingPct, setPackagingPct] = useState(10);
  const [laborPct, setLaborPct] = useState(14);
  const [deliverySubPct, setDeliverySubPct] = useState(9);
  const [marketingPct, setMarketingPct] = useState(4);
  const [maintenancePct, setMaintenancePct] = useState(4);
  const [profitPct, setProfitPct] = useState(19);
  const [opsPct, setOpsPct] = useState(0);

  const net = amount - deliveryFee;

  const materialAmt = +(net * materialPct / 100).toFixed(2);
  const packagingAmt = +(net * packagingPct / 100).toFixed(2);
  const laborAmt = +(net * laborPct / 100).toFixed(2);
  const deliverySubAmt = +(net * deliverySubPct / 100).toFixed(2);
  const marketingAmt = +(net * marketingPct / 100).toFixed(2);
  const maintenanceAmt = +(net * maintenancePct / 100).toFixed(2);
  const opsAmt = +(net * opsPct / 100).toFixed(2);
  const profitAmt = +(net - materialAmt - packagingAmt - laborAmt - deliverySubAmt - marketingAmt - maintenanceAmt - opsAmt).toFixed(2);

  const totalPct = materialPct + packagingPct + laborPct + deliverySubPct + marketingPct + maintenancePct + profitPct + opsPct;

  const perMeal = meals > 0 ? +(net / meals).toFixed(2) : 0;
  const profitPerMeal = meals > 0 ? +(profitAmt / meals).toFixed(2) : 0;
  const subsidyPerRound = rounds > 0 ? +(deliverySubAmt / rounds).toFixed(2) : 0;

  // Business Health Logic
  const healthScore = profitPct >= 18 ? 'EXCELLENT' : profitPct >= 12 ? 'GOOD' : profitPct >= 5 ? 'OK' : 'LOW';

  const applyPreset = (price: number, m?: number, r?: number) => {
    setAmount(price);
    if (m) setMeals(m);
    if (r) setRounds(r);
    setDeliveryFee(0);
  };

  const applyStandard7Funds = () => {
    setMaterialPct(40);
    setPackagingPct(10);
    setLaborPct(14);
    setDeliverySubPct(9);
    setMarketingPct(4);
    setMaintenancePct(4);
    setProfitPct(19);
    setOpsPct(0);
    toast.success('ใช้สูตรมาตรฐาน 04/08/2569 (7 กองทุน) เรียบร้อย');
  };

  const handleSaveConfig = async () => {
    const name = prompt('กรุณาตั้งชื่อสูตรการแยกเงินนี้:');
    if (!name) return;
    
    try {
      const { error } = await supabase.from('erp_split_configs').insert({
        config_name: name,
        material_pct: materialPct,
        packaging_pct: packagingPct,
        labor_pct: laborPct,
        delivery_sub_pct: deliverySubPct,
        marketing_pct: marketingPct,
        maintenance_pct: maintenancePct,
        profit_pct: profitPct,
        ops_pct: opsPct,
        promotion_type: meals > 1 ? 'PINTO' : 'RETAIL',
        is_active: true,
        is_default: false,
        notes: 'บันทึกจาก Split Simulator'
      });
      if (error) throw error;
      toast.success('บันทึกสูตรเรียบร้อยแล้ว!');
    } catch (err: any) {
      toast.error('บันทึกไม่สำเร็จ: ' + err.message);
    }
  };

  // Theme helpers
  const card = isDarkMode ? 'bg-slate-800/50 border-slate-700/50 shadow-xl shadow-black/20' : 'bg-white border-slate-200 shadow-sm';
  const heading = isDarkMode ? 'text-white' : 'text-slate-800';
  const subtext = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  const fundItems = [
    { pt: 'MATERIAL' as PoolType, val: materialPct, set: setMaterialPct, amt: materialAmt, tip: 'ต้นทุนอาหาร (25-26฿/มื้อ)' },
    { pt: 'PACKAGING_BILLS' as PoolType, val: packagingPct, set: setPackagingPct, amt: packagingAmt, tip: 'ถุงซีล 2 ชั้น + ค่าไฟ + ค่าแก๊ส' },
    { pt: 'LABOR' as PoolType, val: laborPct, set: setLaborPct, amt: laborAmt, tip: 'ค่าตอบแทนทีมครัว (~8.8-9.3฿/มื้อ)' },
    { pt: 'DELIVERY' as PoolType, val: deliverySubPct, set: setDeliverySubPct, amt: deliverySubAmt, tip: 'ช่วยค่าส่ง Grab (~30-34฿/รอบ)' },
    { pt: 'MARKETING' as PoolType, val: marketingPct, set: setMarketingPct, amt: marketingAmt, tip: 'งบยิงแอด/คอนเทนต์ TikTok' },
    { pt: 'MAINTENANCE' as PoolType, val: maintenancePct, set: setMaintenancePct, amt: maintenanceAmt, tip: 'ทุนสำรองซ่อมเครื่องซีล/ตู้เย็น' },
    { pt: 'PROFIT' as PoolType, val: profitPct, set: setProfitPct, amt: profitAmt, tip: 'กำไรสุทธิ 19% 🔒' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
      {/* Left Column: Inputs & Presets (Span 5) */}
      <div className="lg:col-span-5 space-y-6">
        <div className={`rounded-3xl border p-6 transition-all ${card}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-base font-semibold flex items-center gap-2 ${heading}`}>
              <Calculator size={20} className="text-emerald-500" /> จำลองการแยกเงิน 7 กองทุน
            </h3>
            <button
              type="button"
              onClick={applyStandard7Funds}
              className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 flex items-center gap-1 transition-all"
            >
              <Sparkles size={12} /> รีเซ็ตสูตร 04/08/2569
            </button>
          </div>

          {/* Quick presets */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">📦 แพ็กเกจมาตรฐาน 04/08/2569</p>
              <div className="grid grid-cols-3 gap-2">
                {PINTO_PRESETS.map(p => (
                  <button
                    key={p.price}
                    onClick={() => applyPreset(p.price, p.meals, p.rounds)}
                    className={`p-2.5 rounded-2xl text-xs border transition-all text-left ${
                      amount === p.price 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 font-bold shadow-sm ring-1 ring-emerald-500/20' 
                        : isDarkMode 
                          ? 'bg-slate-900/40 border-slate-700 text-slate-200 hover:border-emerald-500/50' 
                          : 'bg-slate-100 border-slate-300 text-slate-800 font-semibold hover:border-emerald-400'
                    }`}
                  >
                    <div className="font-bold text-xs truncate">{p.label}</div>
                    <div className="text-xs font-mono font-bold mt-0.5">฿{p.price.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">🏋️ แพ็กเกจเพิ่มกล้ามเนื้อ (Muscle)</p>
              <div className="grid grid-cols-3 gap-2">
                {MUSCLE_PRESETS.map(p => (
                  <button
                    key={p.price}
                    onClick={() => applyPreset(p.price, p.meals, 5)}
                    className={`p-2.5 rounded-2xl text-xs border transition-all text-left ${
                      amount === p.price 
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 font-bold shadow-sm ring-1 ring-purple-500/20' 
                        : isDarkMode 
                          ? 'bg-slate-900/40 border-slate-700 text-slate-200 hover:border-purple-500/50' 
                          : 'bg-slate-100 border-slate-300 text-slate-800 font-semibold hover:border-purple-400'
                    }`}
                  >
                    <div className="font-bold text-xs truncate">{p.label}</div>
                    <div className="text-xs font-mono font-bold mt-0.5">฿{p.price.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs: Amount, Meals, Delivery Rounds */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">ยอดเงินรวม (฿)</label>
                <input
                  type="number"
                  value={amount || ''}
                  onChange={e => setAmount(Number(e.target.value) || 0)}
                  className={`w-full p-2 rounded-xl border text-xs font-bold font-mono outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">จำนวนมื้อ</label>
                <input
                  type="number"
                  value={meals || ''}
                  onChange={e => setMeals(Number(e.target.value) || 0)}
                  className={`w-full p-2 rounded-xl border text-xs font-bold font-mono outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">รอบส่งจริง</label>
                <input
                  type="number"
                  value={rounds || ''}
                  onChange={e => setRounds(Number(e.target.value) || 0)}
                  className={`w-full p-2 rounded-xl border text-xs font-bold font-mono outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>
            </div>
          </div>

          <div className={`h-px my-5 ${isDarkMode ? 'bg-slate-700/30' : 'bg-slate-200'}`} />

          {/* Sliders for 7 funds */}
          <div className="space-y-3">
            <div className="flex justify-between items-end mb-1">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">📐 ปรับสัดส่วน 7 กองทุน</p>
              <span className={`text-xs font-black ${totalPct === 100 ? 'text-emerald-500' : 'text-red-500'}`}>
                รวม {totalPct}%
              </span>
            </div>

            {fundItems.map(item => {
              const cfg = getPoolConfig(item.pt);
              return (
                <div key={item.pt} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="font-mono font-bold" style={{ color: cfg.color }}>{item.val}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={item.val}
                    onChange={e => item.set(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-100 dark:bg-slate-700"
                    style={{ accentColor: cfg.color }}
                  />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSaveConfig}
            className="w-full py-2.5 mt-5 rounded-2xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5"
          >
            <PlusCircle size={14} /> บันทึกเป็นสูตรโปรโมชั่นใหม่
          </button>
        </div>
      </div>

      {/* Right Column: Calculations & Visual Bars (Span 7) */}
      <div className="lg:col-span-7 space-y-6">
        <div className={`rounded-3xl border p-6 transition-all ${card}`}>
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className={`text-center p-3.5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-[10px] font-semibold text-slate-600 mb-0.5 uppercase">ราคาเฉลี่ย/มื้อ</p>
              <p className="text-xl font-bold text-indigo-600 font-mono">฿{perMeal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className={`text-center p-3.5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-[10px] font-semibold text-slate-600 mb-0.5 uppercase">กำไรสุทธิ/มื้อ</p>
              <p className="text-xl font-bold text-pink-600 font-mono">฿{profitPerMeal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className={`text-center p-3.5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-[10px] font-semibold text-slate-600 mb-0.5 uppercase">งบส่ง Grab/รอบ</p>
              <p className="text-xl font-bold text-orange-600 font-mono">฿{subsidyPerRound.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Visual Split Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${subtext}`}>🎨 สัดส่วนแยกเงิน 7 กองทุน</h3>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  healthScore === 'EXCELLENT' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                  healthScore === 'GOOD' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                  healthScore === 'OK' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                  'bg-red-500/10 text-red-600 border border-red-500/20'
                }`}>
                  สุขภาพกำไร: {healthScore}
                </span>
                <span className="text-xs font-mono font-medium text-slate-600">Total: ฿{net.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="flex h-12 rounded-2xl overflow-hidden shadow-inner">
              {fundItems.map(item => {
                const cfg = getPoolConfig(item.pt);
                return (
                  <div
                    key={item.pt}
                    style={{ width: `${item.val}%`, backgroundColor: cfg.color }}
                    className="h-full flex items-center justify-center text-[10px] font-semibold text-white transition-all overflow-hidden relative group"
                    title={`${cfg.label}: ฿${item.amt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${item.val}%)`}
                  >
                    {item.val >= 7 && (
                      <span className="truncate px-1">{item.val}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7-Fund Deep Breakdown Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Target size={14} /> เจาะลึกจำนวนเงินแต่ละกองทุน
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fundItems.map(item => {
                const cfg = getPoolConfig(item.pt);
                return (
                  <div
                    key={item.pt}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: cfg.color }}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700">{item.val}%</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-base font-bold font-mono" style={{ color: cfg.color }}>
                          ฿{item.amt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">{item.tip}</p>
                      </div>
                      {meals > 0 && item.pt !== 'DELIVERY' && (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-700 border border-slate-200 dark:border-slate-700">
                          ฿{(item.amt / meals).toFixed(2)}/มื้อ
                        </span>
                      )}
                      {item.pt === 'DELIVERY' && rounds > 0 && (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-orange-700 border border-orange-200 dark:border-orange-900/40">
                          ฿{(item.amt / rounds).toFixed(2)}/รอบ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Balance Check */}
          <div className={`mt-6 p-3.5 rounded-2xl flex items-center gap-3 border ${
            totalPct === 100 
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
              : 'bg-red-500/10 text-red-600 border-red-500/20'
          }`}>
            {totalPct === 100 ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
            <div>
              <p className="text-xs font-semibold">{totalPct === 100 ? 'สัดส่วนครบ 100.00% สมบูรณ์' : `สัดส่วนยังไม่ครบ 100% (ปัจจุบัน ${totalPct}%)`}</p>
              <p className="text-[11px] opacity-80 font-normal">สูตรมาตรฐาน 04/08/2569 รับประกันความถูกต้องทางคณิตศาสตร์และการเงิน</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
