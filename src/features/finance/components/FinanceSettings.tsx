import React, { useState } from 'react';
import { supabase } from '../../../config/supabase';
import type { SplitConfig } from '../types';
import { Settings, Trash2, CheckCircle2, Info, Plus, Edit2, Check, RefreshCw, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

interface Props {
  configs: SplitConfig[];
  onRefresh: () => void;
  isDarkMode?: boolean;
}

export const FinanceSettings: React.FC<Props> = ({ configs, onRefresh, isDarkMode = false }) => {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    config_name: '',
    promotion_type: 'PINTO',
    material_pct: 35,
    labor_pct: 15,
    ops_pct: 20,
    profit_pct: 30
  });

  const handleEdit = (c: SplitConfig) => {
    setEditingId(c.id);
    setFormData({
      config_name: c.config_name,
      promotion_type: c.promotion_type,
      material_pct: c.material_pct,
      labor_pct: c.labor_pct,
      ops_pct: c.ops_pct,
      profit_pct: c.profit_pct
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      config_name: '',
      promotion_type: 'PINTO',
      material_pct: 35,
      labor_pct: 15,
      ops_pct: 20,
      profit_pct: 30
    });
  };

  const handleSave = async () => {
    if (!formData.config_name) return toast.error('กรุณาตั้งชื่อสูตร');
    
    // Check for duplicates (locally)
    const isDuplicate = configs.find(c => 
      c.config_name.trim().toLowerCase() === formData.config_name.trim().toLowerCase() && 
      c.id !== editingId
    );
    if (isDuplicate) return toast.error('ชื่อสูตรนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น');

    const total = formData.material_pct + formData.labor_pct + formData.ops_pct + formData.profit_pct;
    if (total !== 100) return toast.error(`สัดส่วนต้องรวมกันได้ 100% (ตอนนี้ ${total}%)`);

    try {
      if (editingId) {
        const { error } = await supabase.from('erp_split_configs').update(formData).eq('id', editingId);
        if (error) throw error;
        toast.success('แก้ไขสูตรเรียบร้อย');
      } else {
        const { error } = await supabase.from('erp_split_configs').insert({ ...formData, is_active: true, is_default: false });
        if (error) throw error;
        toast.success('เพิ่มสูตรใหม่เรียบร้อย');
      }
      resetForm();
      onRefresh();
    } catch (err: any) {
      toast.error('ล้มเหลว: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    const config = configs.find(c => c.id === id);
    if (!config) return;

    const result = await Swal.fire({
      title: 'ยืนยันการลบสูตร?',
      text: `คุณต้องการลบสูตร "${config.config_name}" ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ยืนยัน ลบเลย',
      cancelButtonText: 'ยกเลิก',
      background: isDarkMode ? '#1e293b' : '#fff',
      color: isDarkMode ? '#fff' : '#1e293b'
    });

    if (!result.isConfirmed) return;

    setIsDeleting(id);
    try {
      const { error } = await supabase.from('erp_split_configs').delete().eq('id', id);
      
      if (error) {
        if (error.code === '23503') { // Foreign key constraint
          throw new Error('ไม่สามารถลบได้ เนื่องจากสูตรนี้กำลังถูกใช้งานอยู่ใน "โปรโมชั่น" กรุณาเปลี่ยนโปรโมชั่นไปใช้สูตรอื่นก่อนทำการลบ');
        }
        throw error;
      }

      Swal.fire({
        icon: 'success',
        title: 'ลบเรียบร้อย!',
        text: 'สูตรการแยกเงินถูกลบออกจากระบบแล้ว',
        timer: 1500,
        showConfirmButton: false,
        background: isDarkMode ? '#1e293b' : '#fff',
        color: isDarkMode ? '#fff' : '#1e293b'
      });
      onRefresh();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'ล้มเหลว',
        text: err.message,
        background: isDarkMode ? '#1e293b' : '#fff',
        color: isDarkMode ? '#fff' : '#1e293b'
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSetDefault = async (id: string, type: string) => {
    try {
      await supabase.from('erp_split_configs').update({ is_default: false }).eq('promotion_type', type);
      const { error } = await supabase.from('erp_split_configs').update({ is_default: true }).eq('id', id);
      if (error) throw error;
      toast.success('ตั้งเป็นค่าเริ่มต้นเรียบร้อย');
      onRefresh();
    } catch (err: any) {
      toast.error('ล้มเหลว: ' + err.message);
    }
  };

  const handleCleanupDuplicates = async () => {
    const result = await Swal.fire({
      title: 'ต้องการล้างข้อมูลซ้ำหรือไม่?',
      text: 'ระบบจะรวมสูตรที่มีชื่อซ้ำกันให้เหลือเพียงอันเดียว และลบตัวที่เกินทิ้งโดยไม่กระทบข้อมูลโปรโมชั่น',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'เริ่มล้างข้อมูล',
      cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) return;

    toast.loading('กำลังล้างข้อมูลซ้ำ...');
    try {
      // 1. Group by name
      const groups: Record<string, SplitConfig[]> = {};
      configs.forEach(c => {
        if (!groups[c.config_name]) groups[c.config_name] = [];
        groups[c.config_name].push(c);
      });

      for (const name in groups) {
        const list = groups[name];
        if (list.length > 1) {
          const primary = list[0];
          const duplicateIds = list.slice(1).map(d => d.id);

          // Update promotions
          await supabase.from('promotions').update({ split_config_id: primary.id }).in('split_config_id', duplicateIds);
          // Update revenue buckets
          await supabase.from('erp_revenue_buckets').update({ split_config_id: primary.id }).in('split_config_id', duplicateIds);
          // Delete duplicates
          await supabase.from('erp_split_configs').delete().in('id', duplicateIds);
        }
      }

      Swal.fire('สำเร็จ!', 'ล้างข้อมูลที่ซ้ำกันเรียบร้อยแล้ว', 'success');
      onRefresh();
    } catch (err: any) {
      Swal.fire('ล้มเหลว', err.message, 'error');
    }
  };

  const handleResetEverything = async () => {
    const result = await Swal.fire({
      title: '⚠️ ล้างข้อมูลทั้งหมด?',
      html: `
        <div class="text-left text-sm space-y-2">
          <p class="font-bold text-red-500">คำเตือน: การกระทำนี้ไม่สามารถย้อนกลับได้!</p>
          <ul class="list-disc pl-5 text-slate-500">
            <li>ลบประวัติรายรับทั้งหมด</li>
            <li>ลบประวัติรายจ่ายทั้งหมด</li>
            <li>Reset ยอดคงเหลือทุกกองทุนเป็น ฿0</li>
          </ul>
          <p class="mt-4">พิมพ์คำว่า <span class="font-mono font-bold text-red-500">RESET ALL</span> เพื่อยืนยัน</p>
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'RESET ALL',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ล้างข้อมูลและเริ่มใหม่',
      cancelButtonText: 'ยกเลิก',
      background: isDarkMode ? '#1e293b' : '#fff',
      color: isDarkMode ? '#fff' : '#1e293b',
      preConfirm: (value) => {
        if (value !== 'RESET ALL') {
          Swal.showValidationMessage('กรุณาพิมพ์ข้อความให้ถูกต้อง');
        }
      }
    });

    if (!result.isConfirmed) return;

    toast.loading('กำลังล้างข้อมูลระบบ...');
    try {
      // 1. Delete all records
      await supabase.from('erp_revenue_buckets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('erp_fund_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // 2. Reset pool balances
      const { error: poolErr } = await supabase.from('erp_fund_pools').update({
        current_balance: 0,
        total_in: 0,
        total_out: 0
      }).neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (poolErr) throw poolErr;

      Swal.fire({
        icon: 'success',
        title: 'ล้างข้อมูลสำเร็จ!',
        text: 'ระบบของคุณสะอาดพร้อมใช้งานใหม่แล้ว',
        background: isDarkMode ? '#1e293b' : '#fff',
        color: isDarkMode ? '#fff' : '#1e293b'
      });
      onRefresh();
    } catch (err: any) {
      Swal.fire('ล้มเหลว', err.message, 'error');
    }
  };

  const handleSyncBalances = async () => {
    const result = await Swal.fire({
      title: 'Sync ยอดเงินกองทุน?',
      text: 'ระบบจะคำนวณยอดเงินใหม่ทั้งหมดจากประวัติการทำรายการ เพื่อให้ยอดคงเหลือตรงกับความเป็นจริง',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'เริ่ม Sync ข้อมูล',
      cancelButtonText: 'ยกเลิก',
      background: isDarkMode ? '#1e293b' : '#fff',
      color: isDarkMode ? '#fff' : '#1e293b'
    });

    if (!result.isConfirmed) return;

    const toastId = toast.loading('กำลังคำนวณยอดเงินใหม่...');
    try {
      // 1. Fetch all transactions
      const { data: txs } = await supabase.from('erp_fund_transactions').select('pool_type, direction, amount');
      if (!txs) {
        toast.dismiss(toastId);
        return;
      }

      // 2. Group by pool
      const poolStats: Record<string, { in: number; out: number }> = {
        MATERIAL: { in: 0, out: 0 },
        LABOR: { in: 0, out: 0 },
        OPS: { in: 0, out: 0 },
        PROFIT: { in: 0, out: 0 }
      };

      txs.forEach(t => {
        if (t.direction === 'IN') poolStats[t.pool_type].in += t.amount;
        else poolStats[t.pool_type].out += t.amount;
      });

      // 3. Update every pool
      for (const pt in poolStats) {
        const stats = poolStats[pt];
        await supabase.from('erp_fund_pools').update({
          current_balance: stats.in - stats.out,
          total_in: stats.in,
          total_out: stats.out
        }).eq('pool_type', pt);
      }

      toast.success('Sync ยอดเงินสำเร็จ!', { id: toastId });
      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: 'ยอดเงินกองทุนถูก Sync เรียบร้อยแล้ว',
        background: isDarkMode ? '#1e293b' : '#fff',
        color: isDarkMode ? '#fff' : '#1e293b'
      });
      onRefresh();
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด', { id: toastId });
      Swal.fire('ล้มเหลว', err.message, 'error');
    }
  };

  const card = isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const heading = isDarkMode ? 'text-white' : 'text-slate-800';
  const input = isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700';

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-3xl border transition-all ${card}`}>
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}>
                 <Settings size={20} />
              </div>
              <div>
                 <h3 className={`text-lg font-bold ${heading}`}>จัดการสูตรการแยกเงิน (Split Models)</h3>
                 <p className="text-xs text-slate-500">จัดการสูตรมาตรฐานที่ใช้ในการคำนวณรายรับทั้งหมดของระบบ</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
                {/* Only show cleanup button when duplicate config names exist */}
                {(() => {
                  const names = configs.map(c => c.config_name.trim().toLowerCase());
                  const hasDuplicates = names.length !== new Set(names).size;
                  return hasDuplicates ? (
                    <button 
                      onClick={handleCleanupDuplicates}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                    >
                       <RefreshCw size={18} /> ล้างข้อมูลซ้ำ ({names.length - new Set(names).size} รายการ)
                    </button>
                  ) : null;
                })()}
               {!showAddForm && !editingId && (
                   <button 
                     onClick={() => setShowAddForm(true)}
                     className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                   >
                      <Plus size={18} /> เพิ่มสูตรใหม่
                   </button>
                )}
             </div>
        </div>

        {(showAddForm || editingId) && (
           <div className={`mb-6 p-6 rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 animate-in zoom-in-95 duration-200`}>
              <h4 className={`text-sm font-bold mb-4 flex items-center gap-2 ${heading}`}>
                 {editingId ? <Edit2 size={16} /> : <Plus size={16} />}
                 {editingId ? 'แก้ไขสูตร' : 'เพิ่มสูตรการแยกเงินใหม่'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                 <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">ชื่อสูตร</label>
                    <input type="text" value={formData.config_name} onChange={e => setFormData({...formData, config_name: e.target.value})}
                       className={`w-full p-2.5 rounded-xl border text-sm outline-none focus:border-emerald-500 ${input}`} />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">ประเภทสินค้า</label>
                 <select value={formData.promotion_type} onChange={e => setFormData({...formData, promotion_type: e.target.value as any})}
                       className={`w-full p-2.5 rounded-xl border text-sm outline-none focus:border-emerald-500 ${input}`}>
                       <option value="PINTO">PINTO (ปิ่นโต)</option>
                       <option value="MUSCLE">MUSCLE (เพิ่มกล้าม)</option>
                       <option value="RETAIL">RETAIL (ขายปลีก)</option>
                       <option value="ADDON">ADDON (เพิ่มเติม)</option>
                    </select>
                 </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 <div>
                    <label className="block text-[10px] font-bold text-emerald-500 mb-1">วัตถุดิบ (%)</label>
                    <input type="number" value={formData.material_pct} onChange={e => setFormData({...formData, material_pct: Number(e.target.value)})}
                       className={`w-full p-2.5 rounded-xl border text-sm outline-none focus:border-emerald-500 ${input}`} />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-blue-500 mb-1">ค่าแรง (%)</label>
                    <input type="number" value={formData.labor_pct} onChange={e => setFormData({...formData, labor_pct: Number(e.target.value)})}
                       className={`w-full p-2.5 rounded-xl border text-sm outline-none focus:border-emerald-500 ${input}`} />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-amber-500 mb-1">ค่าบิล (%)</label>
                    <input type="number" value={formData.ops_pct} onChange={e => setFormData({...formData, ops_pct: Number(e.target.value)})}
                       className={`w-full p-2.5 rounded-xl border text-sm outline-none focus:border-emerald-500 ${input}`} />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-red-500 mb-1">กำไร (%)</label>
                    <input type="number" value={formData.profit_pct} onChange={e => setFormData({...formData, profit_pct: Number(e.target.value)})}
                       className={`w-full p-2.5 rounded-xl border text-sm outline-none focus:border-emerald-500 ${input}`} />
                 </div>
              </div>
              
              <div className="flex items-center justify-between mb-6">
                  <button 
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      material_pct: 40,
                      labor_pct: 20,
                      ops_pct: 15,
                      profit_pct: 25
                    })}
                    className={`text-[10px] font-bold flex items-center gap-1 transition-all px-3 py-1.5 rounded-xl border border-dashed ${
                      isDarkMode ? 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                     <Package size={14} /> ใช้สัดส่วนแนะนำ (Healthy Split 40/20/15/25)
                  </button>
                  <div className={`text-xs font-bold ${
                     (formData.material_pct + formData.labor_pct + formData.ops_pct + formData.profit_pct) === 100 
                     ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                     รวม: {formData.material_pct + formData.labor_pct + formData.ops_pct + formData.profit_pct}%
                  </div>
               </div>

               <div className="flex justify-end gap-2">
                 <button onClick={resetForm} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">ยกเลิก</button>
                 <button onClick={handleSave} className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all">
                    <Check size={18} /> บันทึกสูตร
                 </button>
              </div>
           </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-700/10">
           <table className="w-full text-left">
              <thead>
                 <tr className={`text-[10px] font-bold uppercase tracking-widest transition-all ${
                   isDarkMode ? 'bg-slate-900/60 text-slate-500' : 'bg-slate-50 text-slate-400'
                 }`}>
                    <th className="px-6 py-4">ชื่อสูตร / ประเภท</th>
                    <th className="px-6 py-4">สัดส่วน (%)</th>
                    <th className="px-6 py-4">สถานะ</th>
                    <th className="px-6 py-4 text-right">แอ็คชัน</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/10">
                 {configs.map(c => (
                    <tr key={c.id} className={`hover:bg-slate-500/5 transition-colors group ${editingId === c.id ? 'bg-emerald-500/5' : ''}`}>
                       <td className="px-6 py-4">
                          <p className={`text-sm font-bold ${heading}`}>{c.config_name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase transition-all ${
                             isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                           }`}>{c.promotion_type}</span>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex gap-2">
                             <span className="text-[10px] font-bold text-emerald-500">M:{c.material_pct}</span>
                             <span className="text-[10px] font-bold text-blue-500">L:{c.labor_pct}</span>
                             <span className="text-[10px] font-bold text-amber-500">O:{c.ops_pct}</span>
                             <span className="text-[10px] font-bold text-red-500">P:{c.profit_pct}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          {c.is_default ? (
                             <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                                <CheckCircle2 size={14} /> ค่าเริ่มต้น
                             </span>
                          ) : (
                             <button 
                                onClick={() => handleSetDefault(c.id, c.promotion_type)}
                                className="text-xs text-slate-400 hover:text-emerald-500 transition-colors"
                             >
                                ตั้งเป็นค่าเริ่มต้น
                             </button>
                          )}
                       </td>
                       <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                             <button onClick={() => handleEdit(c)} className="p-2 rounded-xl text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all">
                                <Edit2 size={16} />
                             </button>
                             <button 
                               onClick={() => handleDelete(c.id)}
                               disabled={isDeleting === c.id || c.is_default}
                               className={`p-2 rounded-xl transition-all ${
                                 c.is_default ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:bg-red-500/10 hover:text-red-500'
                               }`}
                             >
                                <Trash2 size={18} />
                             </button>
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>

     <div className={`border rounded-2xl p-5 flex gap-4 transition-all ${
       isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
     }`}>
        <Info className="text-blue-500 shrink-0" size={20} />
        <div>
           <p className={`text-sm font-bold uppercase ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>คำแนะนำในการตั้งค่า</p>
           <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-blue-400/80' : 'text-blue-500'}`}>
              การแก้ไขสูตรจะมีผลกับการบันทึกรายรับใหม่หลังจากนี้เท่านั้น ข้อมูลที่เคยบันทึกไปแล้วจะยังคงใช้สัดส่วนเดิม 
              สัดส่วนรวม (M+L+O+P) **ต้องเท่ากับ 100% เสมอ** เพื่อความถูกต้องของบัญชีครับ
           </p>
        </div>
     </div>
      {/* Danger Zone */}
      <div className={`p-6 rounded-3xl border border-dashed transition-all mt-6 ${
        isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'
      }`}>
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                 isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-500'
               }`}>
                  <AlertTriangle size={20} />
               </div>
               <div>
                  <h3 className={`text-sm font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>Danger Zone (ส่วนอันตราย)</h3>
                  <p className="text-[10px] text-slate-500">ใช้สำหรับล้างข้อมูลทดสอบและเริ่มระบบใหม่ทั้งหมด</p>
               </div>
            </div>
            <button 
              onClick={handleResetEverything}
              className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
            >
               Reset ข้อมูลทั้งหมด
            </button>
         </div>
      </div>

      {/* Sync Tool */}
      <div className={`p-6 rounded-3xl border border-dashed transition-all mt-6 ${
        isDarkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'
      }`}>
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                 isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-500'
               }`}>
                  <RefreshCw size={20} />
               </div>
               <div>
                  <h3 className={`text-sm font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Sync & Repair (ซ่อมแซมยอดเงิน)</h3>
                  <p className="text-[10px] text-slate-500">กรณีตัวเลขยอดคงเหลือไม่ตรงกับประวัติการทำรายการ</p>
               </div>
            </div>
            <button 
              onClick={handleSyncBalances}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
            >
               เริ่ม Sync ยอดเงิน
            </button>
         </div>
      </div>
    </div>
  );
};
