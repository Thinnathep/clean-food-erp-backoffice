import React, { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabase';
import { getPoolConfig, STANDARD_7FUND_PACKAGES } from '../types';
import type { SplitConfig, PoolType } from '../types';
import type { Member } from '../../../types';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { TrendingUp, Package, Dumbbell, ShoppingBag, Percent, Users, User, Loader2, History as HistoryIcon } from 'lucide-react';

interface Props {
  configs: SplitConfig[];
  onSaved: () => void;
  isDarkMode?: boolean;
}

const PINTO_PRESETS = STANDARD_7FUND_PACKAGES.filter(p => p.type === 'PINTO').map(p => ({
  label: p.name,
  price: p.price,
  meals: p.meals,
  days: p.days,
  rounds: p.rounds,
  code: p.code
}));

const MEAL_PACK_PRESETS = STANDARD_7FUND_PACKAGES.filter(p => p.type === 'RETAIL').map(p => ({
  label: p.name,
  price: p.price,
  meals: p.meals,
  days: p.days,
  rounds: p.rounds,
  code: p.code
}));

const MUSCLE_PRESETS = [
  { label: '14 วัน (62 มื้อ) - Promo', price: 7399, meals: 62, days: 14 },
  { label: '30 วัน (124 มื้อ) - Std', price: 12499, meals: 124, days: 30 },
  { label: '30 วัน (124 มื้อ) - Prem', price: 14499, meals: 124, days: 30 },
];

export const RevenueRecorder: React.FC<Props> = ({ configs, onSaved, isDarkMode = false }) => {
  const [sourceType, setSourceType] = useState<'PACKAGE' | 'ORDER' | 'MUSCLE_CUSTOM'>('PACKAGE');
  const [grossAmount, setGrossAmount] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const [periodStart, setPeriodStart] = useState(dayjs().format('YYYY-MM-DD'));
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedDays, setSelectedDays] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [continuousEntry, setContinuousEntry] = useState(false);
  const [tempMemberName, setTempMemberName] = useState('');
  const [selectedConfigId, setSelectedConfigId] = useState('');
  
  // Track recently saved items for this session
  const [sessionEntries, setSessionEntries] = useState<any[]>([]);
  
  // Member Selection State
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  
  // VAT State
  const [hasVat, setHasVat] = useState(false);
  const [vatPct, setVatPct] = useState('7');
  const [isVatIncluded, setIsVatIncluded] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('id, full_name, phone, lifetime_value').order('full_name');
    setMembers(data || []);
  };

  const gross = Number(grossAmount) || 0;
  const delivery = Number(deliveryFee) || 0;
  const net = gross - delivery;

  const vatAmount = hasVat 
    ? (isVatIncluded ? (gross * Number(vatPct) / (100 + Number(vatPct))) : (gross * Number(vatPct) / 100))
    : 0;
  
  // Filter configs to only standard 7-fund configs (hide legacy 35/15/20/30)
  const standardConfigs = configs.filter(c => {
    const isLegacy = (c.ops_pct && c.ops_pct > 0) || c.config_name.includes('35/15') || c.config_name.includes('1799') || c.config_name.includes('40/10/20/30');
    return !isLegacy;
  });

  const activeConfig = standardConfigs.find(c => c.id === selectedConfigId) 
    || standardConfigs.find(c => c.config_name.includes('04/08/2569') || c.config_name.includes('7 กองทุน') || (c.packaging_pct && c.packaging_pct > 0))
    || standardConfigs[0]
    || configs.find(c => c.id === selectedConfigId);

  const materialPct = activeConfig?.material_pct ?? 40;
  const packagingPct = activeConfig?.packaging_pct ?? 10;
  const laborPct = activeConfig?.labor_pct ?? 14;
  const deliverySubPct = activeConfig?.delivery_sub_pct ?? 9;
  const marketingPct = activeConfig?.marketing_pct ?? 4;
  const maintenancePct = activeConfig?.maintenance_pct ?? 4;
  const opsPct = activeConfig?.ops_pct ?? 0;
  const profitPct = activeConfig?.profit_pct ?? 19;

  // Exact integer Baht matching when selecting standard packages
  const matchedStd = STANDARD_7FUND_PACKAGES.find(p => 
    p.price === gross &&
    delivery === 0 &&
    !hasVat
  );

  const materialAmt = matchedStd ? matchedStd.splitAmount.material : +(net * materialPct / 100).toFixed(2);
  const packagingAmt = matchedStd ? matchedStd.splitAmount.packaging : +(net * packagingPct / 100).toFixed(2);
  const laborAmt = matchedStd ? matchedStd.splitAmount.labor : +(net * laborPct / 100).toFixed(2);
  const deliverySubAmt = matchedStd ? matchedStd.splitAmount.deliverySub : +(net * deliverySubPct / 100).toFixed(2);
  const marketingAmt = matchedStd ? matchedStd.splitAmount.marketing : +(net * marketingPct / 100).toFixed(2);
  const maintenanceAmt = matchedStd ? matchedStd.splitAmount.maintenance : +(net * maintenancePct / 100).toFixed(2);
  const opsAmt = +(net * opsPct / 100).toFixed(2);
  const profitAmt = matchedStd ? matchedStd.splitAmount.profit : +(net - materialAmt - packagingAmt - laborAmt - deliverySubAmt - marketingAmt - maintenanceAmt - opsAmt).toFixed(2);

  const handleApplyPreset = (p: { price: number; label: string; days: number; code?: string }) => {
    setGrossAmount(p.price.toString());
    setDescription(p.label);
    setSelectedDays(p.days);
    if (periodStart) {
      setPeriodEnd(dayjs(periodStart).add(p.days - 1, 'day').format('YYYY-MM-DD'));
    }
    // Auto-select corresponding split config if exists
    const matchingCfg = standardConfigs.find(c => 
      c.config_name.includes(p.price.toString()) || 
      (p.label && c.config_name.includes(p.label.split(' ')[0]))
    );
    if (matchingCfg) {
      setSelectedConfigId(matchingCfg.id);
    }
  };

  // Auto-update end date when start date changes if a preset was selected
  useEffect(() => {
    if (selectedDays > 0 && periodStart) {
      setPeriodEnd(dayjs(periodStart).add(selectedDays - 1, 'day').format('YYYY-MM-DD'));
    }
  }, [periodStart, selectedDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gross <= 0) return toast.error('กรุณาใส่จำนวนเงิน');
    if (net <= 0) return toast.error('ยอดสุทธิต้องมากกว่า 0');
    setIsSubmitting(true);
    try {
      const { data: bucket, error: bucketErr } = await supabase.from('erp_revenue_buckets').insert({
        source_type: sourceType,
        member_id: selectedMemberId || null,
        gross_amount: gross,
        delivery_fee: delivery,
        net_amount: net,
        split_config_id: activeConfig?.id,
        material_pct: materialPct,
        packaging_pct: packagingPct,
        labor_pct: laborPct,
        delivery_sub_pct: deliverySubPct,
        marketing_pct: marketingPct,
        maintenance_pct: maintenancePct,
        ops_pct: opsPct,
        profit_pct: profitPct,
        material_amount: materialAmt,
        packaging_amount: packagingAmt,
        labor_amount: laborAmt,
        delivery_sub_amount: deliverySubAmt,
        marketing_amount: marketingAmt,
        maintenance_amount: maintenanceAmt,
        ops_amount: opsAmt,
        profit_amount: profitAmt,
        description, private_note: privateNote,
        period_start: periodStart || null, period_end: periodEnd || null,
        notes: (tempMemberName ? `ลูกค้า: ${tempMemberName}\n` : '') + notes + (hasVat ? `\nVAT ${vatPct}%: ${vatAmount.toFixed(2)} (${isVatIncluded ? 'รวมในยอด' : 'แยกต่างหาก'})` : ''),
        created_at: periodStart ? dayjs(periodStart).toISOString() : undefined
      }).select().single();
      if (bucketErr) throw bucketErr;

      // Update Member LTV if linked
      if (selectedMemberId) {
        const member = members.find(m => m.id === selectedMemberId);
        if (member) {
          const { error: memberErr } = await supabase.rpc('increment_member_ltv', { 
            p_member_id: selectedMemberId, 
            p_amount: gross 
          });
          if (memberErr) console.error('LTV Update Error:', memberErr);
        }
      }

      const splits: { pool_type: PoolType; amount: number }[] = [];
      if (materialAmt > 0) splits.push({ pool_type: 'MATERIAL', amount: materialAmt });
      if (packagingAmt > 0) splits.push({ pool_type: 'PACKAGING_BILLS', amount: packagingAmt });
      if (laborAmt > 0) splits.push({ pool_type: 'LABOR', amount: laborAmt });
      if (marketingAmt > 0) splits.push({ pool_type: 'MARKETING', amount: marketingAmt });
      if (maintenanceAmt > 0) splits.push({ pool_type: 'MAINTENANCE', amount: maintenanceAmt });
      if (opsAmt > 0) splits.push({ pool_type: 'OPS', amount: opsAmt });
      if (profitAmt > 0) splits.push({ pool_type: 'PROFIT', amount: profitAmt });
      
      const totalDeliveryForPool = +(deliverySubAmt + Number(deliveryFee)).toFixed(2);
      if (totalDeliveryForPool > 0) {
        splits.push({ pool_type: 'DELIVERY', amount: totalDeliveryForPool });
      }

      const { error: txErr } = await supabase.from('erp_fund_transactions').insert(
        splits.map(s => ({ 
          pool_type: s.pool_type, 
          direction: 'IN', 
          amount: s.amount, 
          category: 'Auto Split', 
          description: `จาก: ${description || sourceType}`, 
          source_type: 'SPLIT', 
          source_id: bucket.id,
          created_at: bucket.created_at // Use the same date as the bucket
        }))
      );
      if (txErr) throw txErr;

      for (const s of splits) {
        // Direct update fallback (instead of RPC)
        const { data: pool } = await supabase.from('erp_fund_pools').select('current_balance, total_in').eq('pool_type', s.pool_type).single();
        if (pool) {
          await supabase.from('erp_fund_pools').update({ 
            current_balance: (pool.current_balance || 0) + s.amount,
            total_in: (pool.total_in || 0) + s.amount
          }).eq('pool_type', s.pool_type);
        }
      }

      // Add to session tracking
      setSessionEntries(prev => [{
        id: Date.now(),
        memberName: selectedMemberId ? members.find(m => m.id === selectedMemberId)?.full_name : tempMemberName,
        amount: gross,
        date: periodStart,
        type: sourceType
      }, ...prev].slice(0, 5));

      toast.success('บันทึกรายรับและแยกเงินเรียบร้อย!');
      
      // Clear specific fields but keep date if continuous entry is ON
      setGrossAmount('');
      setDeliveryFee('');
      setDescription('');
      if (!continuousEntry) {
        setNotes('');
        setPrivateNote('');
        setSelectedMemberId('');
        setTempMemberName('');
        setPeriodStart(dayjs().format('YYYY-MM-DD'));
      }
      
      onSaved();
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Theme helpers ──
  const card = isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const inputBase = isDarkMode
    ? 'bg-slate-900/60 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-emerald-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 font-medium';
  const heading = isDarkMode ? 'text-white' : 'text-slate-900 font-bold';
  const subtext = isDarkMode ? 'text-slate-200 font-medium' : 'text-slate-700 font-semibold';
  const mutedBg = isDarkMode ? 'bg-slate-900/40 border-slate-700/50 text-slate-200 hover:border-slate-600' : 'bg-slate-100 border-slate-300 text-slate-800 font-semibold hover:border-slate-400';
  const selectStyle = isDarkMode
    ? 'bg-slate-900/60 border-slate-700 text-slate-100 focus:border-emerald-500'
    : 'bg-white border-slate-300 text-slate-900 font-medium focus:border-emerald-500';

  const sourceTypes = [
    { key: 'PACKAGE' as const, label: 'แพ็กเกจผูกปิ่นโต', icon: <Package size={16} /> },
    { key: 'MUSCLE_CUSTOM' as const, label: 'เพิ่มกล้าม Custom', icon: <Dumbbell size={16} /> },
    { key: 'ORDER' as const, label: 'ขายปลีกรายกล่อง', icon: <ShoppingBag size={16} /> },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Form */}
      <div className={`lg:col-span-3 rounded-2xl border p-6 transition-all ${card}`}>
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${heading}`}>
          <TrendingUp size={20} className="text-emerald-600" /> บันทึกรายรับใหม่
        </h3>

        {/* 💡 Helper Guide Banner */}
        <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200 font-bold text-sm">
            <TrendingUp size={16} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span>คำแนะนำ: ระบบจะคำนวณแยกเงินเข้า 7 กองทุนให้อัตโนมัติ (มาตรฐาน 04/08/2569)</span>
          </div>
          <p className="text-slate-800 dark:text-slate-100 text-xs font-medium leading-relaxed">
            • <strong className="font-bold text-slate-900 dark:text-white">สูตรมาตรฐาน 7 กองทุน:</strong> วัตถุดิบ 40%, บิล/ถุงซีล 10%, ค่าแรง 14%, ช่วยส่ง Grab 9%, การตลาด 4%, ซ่อมบำรุง 4%, กำไรสุทธิ 19%<br />
            • <strong className="font-bold text-slate-900 dark:text-white">กองทุนจัดส่ง:</strong> งบช่วยส่ง 9% จะรวมกับค่าส่งลูกค้า เพื่อเบิกจ่ายไรเดอร์ตามรอบจัดส่งจริง
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className={`block text-xs font-medium mb-1 ${subtext}`}>ระบุลูกค้า (ถ้าเป็นสมาชิก)</label>
                <div className="relative">
                    <select 
                      value={selectedMemberId}
                      onChange={e => {
                        setSelectedMemberId(e.target.value);
                        if (e.target.value) setTempMemberName('');
                      }}
                      className={`w-full p-3 pl-10 border rounded-xl text-sm outline-none transition-all ${selectStyle}`}
                    >
                      <option value="">-- ไม่พบในระบบ / จำไม่ได้ --</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.full_name} ({m.phone})
                        </option>
                      ))}
                    </select>
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
             </div>
             <div>
                <label className={`block text-xs font-medium mb-1 ${subtext}`}>ชื่อลูกค้าชั่วคราว (ถ้าจำชื่อสมาชิกไม่ได้)</label>
                <div className="relative">
                   <input 
                      type="text"
                      value={tempMemberName}
                      onChange={e => {
                        setTempMemberName(e.target.value);
                        if (e.target.value) setSelectedMemberId('');
                      }}
                      placeholder="พิมพ์ชื่อลูกค้า หรือจุดสังเกต..."
                      className={`w-full p-3 pl-10 border rounded-xl text-sm outline-none transition-all ${inputBase}`}
                   />
                   <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
             </div>
          </div>

          {/* Source Type */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className={`block text-xs font-medium mb-2 ${subtext}`}>ประเภทรายรับ</label>
                <div className="grid grid-cols-1 gap-2">
                  {sourceTypes.map(st => (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setSourceType(st.key)}
                      className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium border transition-all ${
                        sourceType === st.key
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600'
                          : mutedBg
                      }`}
                    >
                      {st.icon} {st.label}
                    </button>
                  ))}
                </div>
             </div>
             <div>
                <label className="block text-xs font-semibold mb-2 text-slate-800 dark:text-slate-200">สูตรแยกเงิน (Split Formula)</label>
                <select 
                  value={selectedConfigId || activeConfig?.id || ''}
                  onChange={e => setSelectedConfigId(e.target.value)}
                  className={`w-full p-3 border rounded-xl text-sm outline-none transition-all ${selectStyle}`}
                >
                  {(standardConfigs.length > 0 ? standardConfigs : configs.slice(0, 1)).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.config_name}
                    </option>
                  ))}
                </select>
                <div className={`mt-2 p-2.5 rounded-xl border text-xs transition-all ${
                   isDarkMode ? 'bg-slate-900/40 border-slate-700/50 text-slate-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                   สูตรมาตรฐาน: <span className="font-bold text-emerald-700">{activeConfig?.config_name || 'สูตรมาตรฐาน 04/08/2569 (7 กองทุน)'}</span>
                </div>
             </div>
          </div>

          {/* Quick Presets */}
          {(sourceType === 'PACKAGE' || sourceType === 'ORDER' || sourceType === 'MUSCLE_CUSTOM') && (
            <div className="space-y-3">
              <label className={`block text-xs font-semibold ${subtext}`}>เลือกแพ็กเกจด่วน (Presets 7 กองทุน)</label>
              
              {/* Pinto Presets */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">📦 ผูกปิ่นโต (ส่ง 35฿/รอบ):</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {PINTO_PRESETS.map(p => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        grossAmount === p.price.toString()
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 font-bold ring-1 ring-emerald-500/20'
                          : isDarkMode 
                            ? 'bg-slate-900/40 border-slate-700 text-slate-200 hover:border-emerald-500/50' 
                            : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-emerald-50 hover:border-emerald-400'
                      }`}
                    >
                      {p.label} (฿{p.price.toLocaleString()})
                    </button>
                  ))}
                </div>
              </div>

              {/* Meal Pack Presets */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">🍱 โปรโมชั่นแบบแพ็ค (ช่วยส่ง Grab 35฿):</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {MEAL_PACK_PRESETS.map(p => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        grossAmount === p.price.toString()
                          ? 'bg-amber-500/10 border-amber-500 text-amber-600 font-bold ring-1 ring-amber-500/20'
                          : isDarkMode 
                            ? 'bg-slate-900/40 border-slate-700 text-slate-200 hover:border-amber-500/50' 
                            : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-amber-50 hover:border-amber-400'
                      }`}
                    >
                      {p.label} (฿{p.price.toLocaleString()})
                    </button>
                  ))}
                </div>
              </div>

              {sourceType === 'MUSCLE_CUSTOM' && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">🏋️ เพิ่มกล้ามเนื้อ (Muscle):</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {MUSCLE_PRESETS.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          grossAmount === p.price.toString()
                            ? 'bg-purple-500/10 border-purple-500 text-purple-600 font-bold ring-1 ring-purple-500/20'
                            : isDarkMode 
                              ? 'bg-slate-900/40 border-slate-700 text-slate-200 hover:border-purple-500/50' 
                              : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-purple-50 hover:border-purple-400'
                        }`}
                      >
                        {p.label} (฿{p.price.toLocaleString()})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-medium mb-1 ${subtext}`}>ยอดรวมที่ลูกค้าจ่าย (฿)</label>
              <input
                type="number" min="0" step="0.01"
                value={grossAmount}
                onChange={e => setGrossAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full p-3 border rounded-xl text-lg font-bold text-emerald-600 outline-none transition-all ${inputBase}`}
                required
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${subtext}`}>ค่าจัดส่ง (฿)</label>
              <input
                type="number" min="0" step="0.01"
                value={deliveryFee}
                onChange={e => setDeliveryFee(e.target.value)}
                placeholder="0.00"
                className={`w-full p-3 border rounded-xl text-lg font-bold text-purple-600 outline-none transition-all ${inputBase}`}
              />
            </div>
          </div>

          {/* VAT Toggle */}
          <div className={`p-4 rounded-xl border ${card} flex items-center justify-between`}>
             <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${hasVat ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 text-slate-400'}`}>
                  <Percent size={18} />
                </div>
                <div>
                   <p className={`text-sm font-bold ${heading}`}>การคำนวณ VAT</p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                {hasVat && (
                  <div className="flex items-center gap-2 mr-4">
                    <input 
                      type="number" 
                      value={vatPct} 
                      onChange={e => setVatPct(e.target.value)}
                      className={`w-12 p-1 text-center text-xs border rounded-lg outline-none ${
                        isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                    <select 
                      value={isVatIncluded ? 'IN' : 'EX'}
                      onChange={e => setIsVatIncluded(e.target.value === 'IN')}
                      className={`text-[10px] p-1 border rounded-lg outline-none ${
                        isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <option value="IN">รวมแล้ว</option>
                      <option value="EX">บวกเพิ่ม</option>
                    </select>
                  </div>
                )}
                <button 
                  type="button"
                  onClick={() => setHasVat(!hasVat)}
                  className={`w-12 h-6 rounded-full transition-all relative ${hasVat ? 'bg-blue-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${hasVat ? 'left-7' : 'left-1'}`} />
                </button>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-medium mb-1 ${subtext}`}>วันเริ่มต้น</label>
              <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
                className={`w-full p-3 border rounded-xl text-sm outline-none transition-all ${inputBase}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${subtext}`}>วันสิ้นสุด</label>
              <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
                className={`w-full p-3 border rounded-xl text-sm outline-none transition-all ${inputBase}`} />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${subtext}`}>รายละเอียด</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="เช่น แพ็กเกจ 14 วัน — คุณแพร"
              className={`w-full p-3 border rounded-xl text-sm outline-none transition-all ${inputBase}`} />
          </div>

          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setContinuousEntry(!continuousEntry)}
              className={`flex-1 py-3.5 border rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                continuousEntry 
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 font-semibold' 
                  : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800 font-semibold'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${continuousEntry ? 'bg-emerald-600 border-emerald-600' : 'border-slate-400'}`}>
                 {continuousEntry && <span className="text-white text-[10px]">✓</span>}
              </div>
              บันทึกต่อเนื่อง (คงค่าวันที่)
            </button>
            <button type="submit" disabled={isSubmitting || gross <= 0}
              className="flex-[2] py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : '✅ ยืนยันบันทึก'}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Section */}
      <div className="lg:col-span-2 space-y-4">
        {selectedMemberId && (
           <div className={`p-4 rounded-2xl border transition-all ${card}`}>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                 <User size={14} /> ข้อมูลลูกค้า
              </p>
              {members.filter(m => m.id === selectedMemberId).map(m => (
                 <div key={m.id}>
                    <p className={`font-bold text-sm ${heading}`}>{m.full_name}</p>
                    <p className="text-xs text-slate-700 mb-2 font-medium">{m.phone}</p>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 mt-1">
                       <span className="text-xs text-slate-800 font-medium">ยอดสะสม (LTV)</span>
                       <span className="text-xs font-bold font-mono text-emerald-800">฿{((m as any).lifetime_value ?? (m as any).total_spent ?? 0).toLocaleString()}</span>
                    </div>
                 </div>
              ))}
           </div>
        )}

        <div className={`p-6 rounded-2xl border transition-all ${card}`}>
           <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
             <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
               <span>🔄 พรีวิวการแยกเงิน (7 กองทุน)</span>
             </h3>
             <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
               มาตรฐาน 04/08/2569
             </span>
           </div>

           {gross > 0 ? (
              <div className="space-y-3">
                 <div className="flex justify-between items-center text-sm p-3 rounded-xl bg-slate-100 border border-slate-300">
                    <span className="text-slate-900 font-bold">ยอดสุทธิที่นำมาแยก (Net Split)</span>
                    <span className="text-teal-800 font-black font-mono text-base tabular-nums">
                      ฿{net.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                 </div>

                 <div className="space-y-1.5 pt-1">
                    {([
                       { pt: 'MATERIAL' as PoolType, amt: materialAmt, pct: materialPct },
                       { pt: 'PACKAGING_BILLS' as PoolType, amt: packagingAmt, pct: packagingPct },
                       { pt: 'LABOR' as PoolType, amt: laborAmt, pct: laborPct },
                       { pt: 'DELIVERY' as PoolType, amt: +(deliverySubAmt + Number(deliveryFee)).toFixed(2), pct: deliverySubPct },
                       { pt: 'MARKETING' as PoolType, amt: marketingAmt, pct: marketingPct },
                       { pt: 'MAINTENANCE' as PoolType, amt: maintenanceAmt, pct: maintenancePct },
                       { pt: 'PROFIT' as PoolType, amt: profitAmt, pct: profitPct },
                       ...(opsAmt > 0 ? [{ pt: 'OPS' as PoolType, amt: opsAmt, pct: opsPct }] : []),
                    ].filter(item => item.amt > 0 || item.pct > 0)).map(item => {
                       const cfg = getPoolConfig(item.pt);
                       return (
                          <div key={item.pt} className="flex justify-between items-center text-xs p-2.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100">
                             <span className="flex items-center gap-2 text-slate-900 font-semibold">
                                <span className="text-sm shrink-0">{cfg.icon}</span>
                                <span>{cfg.label}</span>
                                <span className="text-[11px] text-slate-700 font-bold">({item.pct}%)</span>
                             </span>
                             <span className="font-bold font-mono text-sm tabular-nums tracking-tight" style={{ color: cfg.color }}>
                               ฿{item.amt.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             </span>
                          </div>
                       );
                    })}
                 </div>

                 <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-800 font-bold">
                   <span>รวมการแยก 7 กองทุน:</span>
                   <span className="font-mono font-bold text-emerald-800">
                     ฿{(materialAmt + packagingAmt + laborAmt + deliverySubAmt + Number(deliveryFee) + marketingAmt + maintenanceAmt + opsAmt + profitAmt).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (100.00% ครบถ้วน)
                   </span>
                 </div>
              </div>
           ) : (
              <p className="text-xs text-slate-700 font-medium text-center py-6">ใส่จำนวนเงินเพื่อดูพรีวิวแยกเงิน</p>
           )}
        </div>

        {/* Session History (Quick Check) */}
        {sessionEntries.length > 0 && (
          <div className={`p-4 rounded-2xl border border-dashed transition-all ${card}`}>
             <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                <HistoryIcon size={14} /> เพิ่งบันทึกไป (เซสชั่นนี้)
             </h4>
             <div className="space-y-2">
                {sessionEntries.map(entry => (
                   <div key={entry.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-100 border border-slate-200">
                      <div>
                         <p className={`font-bold ${heading}`}>{entry.memberName || 'ทั่วไป'}</p>
                         <p className="text-[10px] text-slate-700 font-medium">{dayjs(entry.date).format('DD/MM/YYYY')} · {entry.type}</p>
                      </div>
                      <p className="font-bold text-emerald-700 font-mono">฿{entry.amount.toLocaleString()}</p>
                   </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
