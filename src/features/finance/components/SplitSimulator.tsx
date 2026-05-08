import React, { useState } from 'react';
import { supabase } from '../../../config/supabase';
import { POOL_CONFIG } from '../types';
import type { SplitConfig, PoolType } from '../types';
import { toast } from 'sonner';
import { 
  Calculator, Target, ShieldCheck, AlertCircle, Sparkles, PlusCircle
} from 'lucide-react';

interface Props {
  configs: SplitConfig[];
  isDarkMode?: boolean;
}

// Pinto package presets
const PINTO_PRESETS = [
  { label: '📦 7 วัน (15 มื้อ)', price: 899, meals: 15 },
  { label: '📦 14 วัน (30 มื้อ)', price: 1799, meals: 30 },
  { label: '📦 1 เดือน (62 มื้อ)', price: 3799, meals: 62 },
];

// Muscle package presets
const MUSCLE_PRESETS = [
  { label: '🏋️ Muscle 14 วัน (62 มื้อ)', price: 7399, meals: 62 },
  { label: '🏋️ Muscle 30 วัน (124 มื้อ) - Std', price: 12499, meals: 124 },
  { label: '🏋️ Muscle 30 วัน (124 มื้อ) - Prem', price: 14499, meals: 124 },
];

export const SplitSimulator: React.FC<Props> = ({ isDarkMode = false }) => {
  const [amount, setAmount] = useState(899);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [materialPct, setMaterialPct] = useState(35);
  const [laborPct, setLaborPct] = useState(15);
  const [opsPct, setOpsPct] = useState(20);
  const [profitPct, setProfitPct] = useState(30);
  const [meals, setMeals] = useState(15);
  
  // Advanced Simulation State
  const [targetProfitPerMeal, setTargetProfitPerMeal] = useState(30);

  const net = amount - deliveryFee;
  const materialAmt = +(net * materialPct / 100).toFixed(2);
  const laborAmt = +(net * laborPct / 100).toFixed(2);
  const opsAmt = +(net * opsPct / 100).toFixed(2);
  const profitAmt = +(net - materialAmt - laborAmt - opsAmt).toFixed(2);
  const perMeal = meals > 0 ? +(net / meals).toFixed(2) : 0;
  const profitPerMeal = meals > 0 ? +(profitAmt / meals).toFixed(2) : 0;
  const totalPct = materialPct + laborPct + opsPct + profitPct;

  // Business Health Logic
  const healthScore = profitPct >= 30 ? 'GOOD' : profitPct >= 20 ? 'OK' : 'LOW';
  const marketingBudgetPerMeal = +(opsAmt * 0.5 / (meals || 1)).toFixed(2); // Assume 50% of Ops is Ads

  // Price Suggestion based on target profit
  const suggestedPrice = meals > 0 ? Math.ceil(((targetProfitPerMeal * meals) / (profitPct / 100)) + deliveryFee) : 0;

  const applyPreset = (price: number, m?: number) => {
    setAmount(price);
    if (m) setMeals(m);
    setDeliveryFee(0);
  };

  const handleSaveConfig = async () => {
    const name = prompt('กรุณาตั้งชื่อสูตรการแยกเงินนี้:');
    if (!name) return;
    
    try {
      const { error } = await supabase.from('erp_split_configs').insert({
        config_name: name,
        material_pct: materialPct,
        labor_pct: laborPct,
        ops_pct: opsPct,
        profit_pct: profitPct,
        promotion_type: 'PINTO', // Default
        is_active: true,
        is_default: false
      });
      if (error) throw error;
      toast.success('บันทึกสูตรเรียบร้อยแล้ว!');
      window.location.reload(); // Refresh to get new configs
    } catch (err: any) {
      toast.error('บันทึกไม่สำเร็จ: ' + err.message);
    }
  };

  // Theme helpers
  const card = isDarkMode ? 'bg-slate-800/50 border-slate-700/50 shadow-xl shadow-black/20' : 'bg-white border-slate-200 shadow-sm';
  const heading = isDarkMode ? 'text-white' : 'text-slate-800';
  const subtext = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
      {/* Left Column: Inputs & Presets (Span 5) */}
      <div className="lg:col-span-5 space-y-6">
        <div className={`rounded-3xl border p-6 transition-all ${card}`}>
          <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${heading}`}>
            <Calculator size={22} className="text-cyan-400" /> ห้องปฏิบัติการ Split V2
          </h3>

          {/* Quick presets */}
          <div className="space-y-6">
             <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">📦 เลือกแพ็กเกจมาตรฐาน</p>
                <div className="grid grid-cols-2 gap-2">
                   {PINTO_PRESETS.map(p => (
                      <button key={p.price} onClick={() => applyPreset(p.price, p.meals)}
                         className={`px-3 py-2.5 rounded-2xl text-xs border transition-all text-left ${
                           amount === p.price 
                             ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                             : isDarkMode 
                               ? 'bg-slate-900/40 border-slate-700 text-slate-400 hover:border-emerald-500/50' 
                               : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-300'
                         }`}>
                         <div className="font-bold">{p.label}</div>
                         <div>฿{p.price.toLocaleString()}</div>
                      </button>
                   ))}
                </div>
             </div>

             <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">🏋️ สายเพิ่มกล้าม (Muscle)</p>
                <div className="grid grid-cols-1 gap-2">
                   {MUSCLE_PRESETS.map(p => (
                      <button key={p.label} onClick={() => applyPreset(p.price, p.meals)}
                         className={`px-4 py-3 rounded-2xl text-xs border transition-all flex justify-between items-center ${
                           amount === p.price 
                             ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' 
                             : isDarkMode 
                               ? 'bg-slate-900/40 border-slate-700 text-slate-400 hover:border-orange-500/50' 
                               : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-orange-300'
                         }`}>
                         <span className="font-bold">{p.label}</span>
                         <span className="font-bold">฿{p.price.toLocaleString()}</span>
                      </button>
                   ))}
                </div>
             </div>
          </div>

          <div className={`h-px my-6 ${isDarkMode ? 'bg-slate-700/30' : 'bg-slate-100'}`} />

          {/* Sliders */}
          <div className="space-y-4">
             <div className="flex justify-between items-end mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">📐 ปรับแต่งสัดส่วน</p>
                <span className={`text-xs font-bold ${totalPct === 100 ? 'text-emerald-500' : 'text-red-500'}`}>รวม {totalPct}%</span>
             </div>
             {([
              { key: 'MATERIAL' as PoolType, val: materialPct, set: setMaterialPct },
              { key: 'LABOR' as PoolType, val: laborPct, set: setLaborPct },
              { key: 'OPS' as PoolType, val: opsPct, set: setOpsPct },
              { key: 'PROFIT' as PoolType, val: profitPct, set: setProfitPct },
            ]).map(item => {
              const cfg = POOL_CONFIG[item.key];
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                     <span className="flex items-center gap-1.5" style={{ color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                     <span style={{ color: cfg.color }}>{item.val}%</span>
                  </div>
                  <input type="range" min={0} max={60} value={item.val}
                    onChange={e => item.set(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-100"
                    style={{ accentColor: cfg.color }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Advice Card */}
        <div className={`rounded-3xl border p-6 transition-all shadow-lg ${
          isDarkMode 
            ? 'bg-gradient-to-br from-indigo-950 to-purple-950 border-indigo-500/20' 
            : 'bg-gradient-to-br from-indigo-500 to-purple-600 border-transparent'
        } text-white`}>
           <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-yellow-300 animate-pulse" />
              <h3 className="font-bold">ที่ปรึกษา AI (Thinking Outside)</h3>
           </div>
           
           <div className="space-y-4 text-sm">
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                 <p className="text-indigo-100 text-xs mb-1">💡 งบโฆษณาที่แนะนำ</p>
                 <p className="font-bold text-lg">฿{marketingBudgetPerMeal} <span className="text-xs font-normal">/ มื้อ</span></p>
                 <p className="text-[10px] opacity-70 mt-1">* คิดจาก 50% ของงบค่าบิล (Ops)</p>
              </div>

              <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                 <p className="text-indigo-100 text-xs mb-1">🎯 ตั้งเป้ากำไรใหม่</p>
                 <div className="flex items-center gap-2">
                    <input 
                       type="number" 
                       value={targetProfitPerMeal}
                       onChange={e => setTargetProfitPerMeal(Number(e.target.value))}
                       className="w-16 bg-white/20 border-none rounded-lg p-1 text-center font-bold outline-none"
                    />
                    <span>฿ / มื้อ</span>
                 </div>
                 <p className="text-[10px] mt-2 text-indigo-100">
                    ควรตั้งราคาขายที่: <span className="text-yellow-300 font-bold">฿{suggestedPrice.toLocaleString()}</span>
                 </p>
              </div>

              <button 
                onClick={handleSaveConfig}
                className="w-full py-3 bg-white/20 hover:bg-white/30 border border-white/30 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                 <PlusCircle size={14} /> บันทึกสัดส่วนนี้เป็น "สูตรใหม่"
              </button>
           </div>
        </div>
      </div>

      {/* Right Column: Visualizer & Breakdown (Span 7) */}
      <div className="lg:col-span-7 space-y-6">
        <div className={`rounded-3xl border p-6 transition-all h-full ${card}`}>
          {/* Top Bar Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             <div className={`text-center p-4 rounded-2xl border transition-all ${
               isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-slate-50 border-slate-100'
             }`}>
                <p className="text-[10px] font-bold text-slate-400 mb-1">ยอดสุทธิ</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>฿{net.toLocaleString()}</p>
             </div>
             <div className={`text-center p-4 rounded-2xl border transition-all ${
               isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-50 border-slate-100'
             }`}>
                <p className="text-[10px] font-bold text-slate-400 mb-1">ราคาเฉลี่ย</p>
                <p className="text-lg font-bold text-emerald-500">฿{perMeal.toLocaleString()}</p>
             </div>
             <div className={`text-center p-4 rounded-2xl border transition-all ${
               isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-slate-50 border-slate-100'
             }`}>
                <p className="text-[10px] font-bold text-slate-400 mb-1">กำไร / มื้อ</p>
                <p className="text-lg font-bold text-blue-500">฿{profitPerMeal.toLocaleString()}</p>
             </div>
             <div className={`text-center p-4 rounded-2xl border transition-all ${
               isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-slate-50 border-slate-100'
             }`}>
                <p className="text-[10px] font-bold text-slate-400 mb-1">Business Health</p>
                <div className={`text-xs font-bold mt-1 px-2 py-1 rounded-full inline-block ${
                   healthScore === 'GOOD' ? 'bg-emerald-500/20 text-emerald-500' :
                   healthScore === 'OK' ? 'bg-blue-500/20 text-blue-500' : 'bg-red-500/20 text-red-500'
                }`}>
                   {healthScore}
                </div>
             </div>
          </div>

          {/* Visual split bar (Big) */}
          <div className="mb-8">
             <div className="flex justify-between items-center mb-3">
                <h3 className={`text-sm font-bold ${subtext}`}>🎨 แผนภาพการจัดสรรเงิน</h3>
                <span className="text-[10px] text-slate-400">Total Pool: ฿{net.toLocaleString()}</span>
             </div>
             <div className="flex h-16 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10">
               {([
                 { pt: 'MATERIAL' as PoolType, pct: materialPct, amt: materialAmt },
                 { pt: 'LABOR' as PoolType, pct: laborPct, amt: laborAmt },
                 { pt: 'OPS' as PoolType, pct: opsPct, amt: opsAmt },
                 { pt: 'PROFIT' as PoolType, pct: profitPct, amt: profitAmt },
               ]).map(item => {
                 const cfg = POOL_CONFIG[item.pt];
                 return (
                   <div key={item.pt} className="flex flex-col items-center justify-center text-[10px] font-bold text-white transition-all overflow-hidden relative group"
                     style={{ width: `${item.pct}%`, backgroundColor: cfg.color, minWidth: item.pct > 0 ? 40 : 0 }}>
                     {item.pct >= 10 && (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                           <span className="opacity-80 mb-0.5">{cfg.icon}</span>
                           <span>{item.pct}%</span>
                        </div>
                     )}
                     <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                   </div>
                 );
               })}
             </div>
          </div>

          {/* Deep Breakdown */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 mb-4">
                <Target size={16} className="text-slate-400" />
                <h4 className="text-sm font-bold text-slate-500">เจาะลึกรายกองทุน</h4>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  { pt: 'MATERIAL' as PoolType, amt: materialAmt, pct: materialPct, tip: 'ต้นทุนอาหารและแพ็กเกจ' },
                  { pt: 'LABOR' as PoolType, amt: laborAmt, pct: laborPct, tip: 'ค่าแรงแม่บ้านและทีมงาน' },
                  { pt: 'OPS' as PoolType, amt: opsAmt, pct: opsPct, tip: 'ค่าบิล ค่าน้ำไฟ ค่าโฆษณา และจิปาถะ' },
                  { pt: 'PROFIT' as PoolType, amt: profitAmt, pct: profitPct, tip: 'กำไรสุทธิหลังหักค่าใช้จ่าย' },
                ]).map(item => {
                  const cfg = POOL_CONFIG[item.pt];
                  return (
                    <div key={item.pt} className={`p-4 rounded-2xl border transition-all ${
                      isDarkMode 
                        ? 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-500/50' 
                        : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:shadow-lg hover:border-transparent'
                    }`}>
                       <div className="flex items-center justify-between mb-2">
                          <span className="flex items-center gap-2 text-xs font-bold" style={{ color: cfg.color }}>
                             {cfg.icon} {cfg.label}
                          </span>
                          <span className="text-xs font-bold text-slate-500">{item.pct}%</span>
                       </div>
                       <div className="flex items-end justify-between">
                          <div>
                             <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>฿{item.amt.toLocaleString()}</p>
                             <p className="text-[10px] text-slate-500 mt-1 italic">{item.tip}</p>
                          </div>
                          {meals > 1 && (
                             <div className="text-right">
                                <p className={`text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm ${
                                  isDarkMode ? 'bg-slate-950 text-slate-400 border border-slate-800' : 'bg-white text-slate-500'
                                }`}>฿{(item.amt / meals).toFixed(2)}/มื้อ</p>
                             </div>
                          )}
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>

          {/* Safety Check */}
          <div className={`mt-8 p-4 rounded-2xl flex items-center gap-4 border transition-all ${
             totalPct === 100 
              ? isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
              : isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
             {totalPct === 100 ? <ShieldCheck size={24} /> : <AlertCircle size={24} />}
             <div>
                <p className="text-sm font-bold">{totalPct === 100 ? 'สัดส่วนถูกต้อง' : 'สัดส่วนยังไม่ครบ 100%'}</p>
                <p className="text-[10px] opacity-70">ระบบกำลังคำนวณตามสัดส่วนปัจจุบัน {totalPct}%</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
