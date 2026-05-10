import React, { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabase';
import { POOL_CONFIG } from '../types';
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

const PINTO_PRESETS = [
  { label: '7 วัน (15 มื้อ)', price: 899, meals: 15, days: 7 },
  { label: '14 วัน (30 มื้อ)', price: 1799, meals: 30, days: 14 },
  { label: '30 วัน (62 มื้อ)', price: 3799, meals: 62, days: 30 },
];

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
    const { data } = await supabase.from('erp_members').select('id, full_name, phone, total_spent').order('full_name');
    setMembers(data || []);
  };

  const gross = Number(grossAmount) || 0;
  const delivery = Number(deliveryFee) || 0;
  const net = gross - delivery;

  const vatAmount = hasVat 
    ? (isVatIncluded ? (gross * Number(vatPct) / (100 + Number(vatPct))) : (gross * Number(vatPct) / 100))
    : 0;
  
  const activeConfig = configs.find(c => c.id === selectedConfigId) || configs.find(c => {
    if (sourceType === 'PACKAGE') return c.promotion_type === 'PINTO' && c.is_default;
    if (sourceType === 'MUSCLE_CUSTOM') return c.promotion_type === 'MUSCLE' && c.is_default;
    return c.promotion_type === 'RETAIL' && c.is_default;
  });

  const materialPct = activeConfig?.material_pct ?? 35;
  const laborPct = activeConfig?.labor_pct ?? 15;
  const opsPct = activeConfig?.ops_pct ?? 20;
  const profitPct = activeConfig?.profit_pct ?? 30;

  const materialAmt = +(net * materialPct / 100).toFixed(2);
  const laborAmt = +(net * laborPct / 100).toFixed(2);
  const opsAmt = +(net * opsPct / 100).toFixed(2);
  const profitAmt = +(net - materialAmt - laborAmt - opsAmt).toFixed(2);

  const handleApplyPreset = (p: { price: number; label: string; days: number }) => {
    setGrossAmount(p.price.toString());
    setDescription(p.label);
    setSelectedDays(p.days);
    if (periodStart) {
      setPeriodEnd(dayjs(periodStart).add(p.days - 1, 'day').format('YYYY-MM-DD'));
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
        material_pct: materialPct, labor_pct: laborPct, ops_pct: opsPct, profit_pct: profitPct,
        material_amount: materialAmt, labor_amount: laborAmt, ops_amount: opsAmt, profit_amount: profitAmt,
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

      const splits: { pool_type: PoolType; amount: number }[] = [
        { pool_type: 'MATERIAL', amount: materialAmt },
        { pool_type: 'LABOR', amount: laborAmt },
        { pool_type: 'OPS', amount: opsAmt },
        { pool_type: 'PROFIT', amount: profitAmt },
      ];
      const { error: txErr } = await supabase.from('erp_fund_transactions').insert(
        splits.map(s => ({ pool_type: s.pool_type, direction: 'IN', amount: s.amount, category: 'Auto Split', description: `จาก: ${description || sourceType}`, source_type: 'SPLIT', source_id: bucket.id }))
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
    ? 'bg-slate-900/60 border-slate-700 text-slate-200 placeholder-slate-600 focus:border-emerald-500'
    : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-emerald-500';
  const heading = isDarkMode ? 'text-white' : 'text-slate-800';
  const subtext = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const mutedBg = isDarkMode ? 'bg-slate-900/40 border-slate-700/50 text-slate-500 hover:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400';
  const selectStyle = isDarkMode
    ? 'bg-slate-900/60 border-slate-700 text-slate-300 focus:border-emerald-500'
    : 'bg-white border-slate-200 text-slate-700 focus:border-emerald-500';

  const sourceTypes = [
    { key: 'PACKAGE' as const, label: 'แพ็กเกจผูกปิ่นโต', icon: <Package size={16} /> },
    { key: 'MUSCLE_CUSTOM' as const, label: 'เพิ่มกล้าม Custom', icon: <Dumbbell size={16} /> },
    { key: 'ORDER' as const, label: 'ขายปลีกรายกล่อง', icon: <ShoppingBag size={16} /> },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Form */}
      <div className={`lg:col-span-3 rounded-2xl border p-6 transition-all ${card}`}>
        <h3 className={`text-lg font-bold mb-5 flex items-center gap-2 ${heading}`}>
          <TrendingUp size={20} className="text-emerald-500" /> บันทึกรายรับใหม่
        </h3>
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
                <label className={`block text-xs font-medium mb-2 ${subtext}`}>เลือกสูตรแยกเงิน (Split Formula)</label>
                <select 
                  value={selectedConfigId}
                  onChange={e => setSelectedConfigId(e.target.value)}
                  className={`w-full p-3 border rounded-xl text-sm outline-none transition-all ${selectStyle}`}
                >
                  <option value="">-- ใช้ค่าเริ่มต้นตามประเภท --</option>
                  {configs.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.config_name} ({c.material_pct}/{c.labor_pct}/{c.ops_pct}/{c.profit_pct})
                    </option>
                  ))}
                </select>
                <div className={`mt-2 p-3 rounded-lg border text-[10px] transition-all ${
                   isDarkMode ? 'bg-slate-900/40 border-slate-700/50 text-slate-500' : 'bg-slate-100/50 border-slate-200 text-slate-500'
                }`}>
                   ใช้สูตร: <span className="font-bold text-emerald-500">{activeConfig?.config_name || 'System Default'}</span>
                </div>
             </div>
          </div>

          {/* Quick Presets */}
          {(sourceType === 'PACKAGE' || sourceType === 'MUSCLE_CUSTOM') && (
            <div>
              <label className={`block text-xs font-medium mb-2 ${subtext}`}>เลือกแพ็กเกจด่วน (Presets)</label>
              <div className="flex flex-wrap gap-2">
                {(sourceType === 'PACKAGE' ? PINTO_PRESETS : MUSCLE_PRESETS).map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`px-3 py-2 rounded-xl text-xs border transition-all ${
                      isDarkMode 
                        ? 'bg-slate-900/40 border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:bg-emerald-500/5' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
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
              className={`flex-1 py-3.5 border rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                continuousEntry 
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' 
                  : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${continuousEntry ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                 {continuousEntry && <span className="text-white text-[10px]">✓</span>}
              </div>
              บันทึกต่อเนื่อง (คงค่าวันที่)
            </button>
            <button type="submit" disabled={isSubmitting || gross <= 0}
              className="flex-[2] py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : '✅ ยืนยันบันทึก'}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Section */}
      <div className="lg:col-span-2 space-y-4">
        {selectedMemberId && (
           <div className={`p-4 rounded-2xl border transition-all ${card}`}>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <User size={12} /> ข้อมูลลูกค้า
              </p>
              {members.filter(m => m.id === selectedMemberId).map(m => (
                 <div key={m.id}>
                    <p className={`font-bold ${heading}`}>{m.full_name}</p>
                    <p className="text-xs text-slate-500 mb-2">{m.phone}</p>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 mt-1">
                       <span className="text-[10px] text-slate-500">ยอดสะสม (LTV)</span>
                       <span className="text-xs font-bold text-emerald-600">฿{(m as any).total_spent?.toLocaleString() || '0'}</span>
                    </div>
                 </div>
              ))}
           </div>
        )}

        <div className={`p-6 rounded-2xl border transition-all ${card}`}>
           <h3 className={`text-sm font-bold mb-4 ${subtext}`}>🔄 Preview การแยกเงิน</h3>
           {gross > 0 ? (
              <div className="space-y-4">
                 <div className="flex justify-between text-sm">
                    <span className={subtext}>ยอดสุทธิ (Split)</span>
                    <span className="text-cyan-600 font-bold">฿{net.toLocaleString()}</span>
                 </div>
                 <div className="space-y-2">
                    {([
                       { pt: 'MATERIAL' as PoolType, amt: materialAmt, pct: materialPct },
                       { pt: 'LABOR' as PoolType, amt: laborAmt, pct: laborPct },
                       { pt: 'OPS' as PoolType, amt: opsAmt, pct: opsPct },
                       { pt: 'PROFIT' as PoolType, amt: profitAmt, pct: profitPct },
                    ]).map(item => {
                       const cfg = POOL_CONFIG[item.pt];
                       return (
                          <div key={item.pt} className="flex justify-between items-center text-xs">
                             <span className="flex items-center gap-2 text-slate-500">
                                {cfg.icon} {cfg.label}
                             </span>
                             <span className="font-bold" style={{ color: cfg.color }}>฿{item.amt.toLocaleString()}</span>
                          </div>
                       );
                    })}
                 </div>
              </div>
           ) : (
              <p className="text-xs text-slate-400 text-center py-4">ใส่จำนวนเงินเพื่อดูพรีวิว</p>
           )}
        </div>

        {/* Session History (Quick Check) */}
        {sessionEntries.length > 0 && (
          <div className={`p-4 rounded-2xl border border-dashed transition-all ${card}`}>
             <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <HistoryIcon size={12} /> เพิ่งบันทึกไป (เซสชั่นนี้)
             </h4>
             <div className="space-y-2">
                {sessionEntries.map(entry => (
                   <div key={entry.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-500/5 border border-slate-500/10">
                      <div>
                         <p className={`font-bold ${heading}`}>{entry.memberName || 'ทั่วไป'}</p>
                         <p className="text-[10px] text-slate-500">{dayjs(entry.date).format('DD/MM/YYYY')} · {entry.type}</p>
                      </div>
                      <p className="font-bold text-emerald-500">฿{entry.amount.toLocaleString()}</p>
                   </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
