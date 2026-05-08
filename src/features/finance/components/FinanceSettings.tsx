import React, { useState } from 'react';
import { supabase } from '../../../config/supabase';
import type { SplitConfig } from '../types';
import { Settings, Trash2, CheckCircle2, Info, Plus, Edit2, Check } from 'lucide-react';
import { toast } from 'sonner';

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
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสูตรนี้?')) return;
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('erp_split_configs').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบสูตรเรียบร้อยแล้ว');
      onRefresh();
    } catch (err: any) {
      toast.error('ไม่สามารถลบได้: ' + err.message);
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

  const card = isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const heading = isDarkMode ? 'text-white' : 'text-slate-800';
  const input = isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700';

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-3xl border transition-all ${card}`}>
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                 <Settings size={20} />
              </div>
              <div>
                 <h3 className={`text-lg font-bold ${heading}`}>จัดการสูตรการแยกเงิน (Split Models)</h3>
                 <p className="text-xs text-slate-500">จัดการสูตรมาตรฐานที่ใช้ในการคำนวณรายรับทั้งหมดของระบบ</p>
              </div>
           </div>
           {!showAddForm && !editingId && (
              <button 
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
              >
                 <Plus size={18} /> เพิ่มสูตรใหม่
              </button>
           )}
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
                 <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase">{c.promotion_type}</span>
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

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex gap-4">
         <Info className="text-blue-500 shrink-0" size={20} />
         <div>
            <p className="text-sm font-bold text-blue-600 uppercase">คำแนะนำในการตั้งค่า</p>
            <p className="text-xs text-blue-500 mt-1 leading-relaxed">
               การแก้ไขสูตรจะมีผลกับการบันทึกรายรับใหม่หลังจากนี้เท่านั้น ข้อมูลที่เคยบันทึกไปแล้วจะยังคงใช้สัดส่วนเดิม 
               สัดส่วนรวม (M+L+O+P) **ต้องเท่ากับ 100% เสมอ** เพื่อความถูกต้องของบัญชีครับ
            </p>
         </div>
      </div>
    </div>
  );
};
