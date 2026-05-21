import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Thermometer, ShieldCheck, Plus, Trash2, Edit3,
  CheckCircle2, XCircle, ClipboardCheck, Droplets, X
} from 'lucide-react';

// ─── Animation Tokens ───
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ─── Types ───
interface SafetyLog {
  id: string;
  log_date: string;
  log_time: string;
  category: string;
  location?: string;
  check_item: string;
  reading_value?: number;
  reading_unit: string;
  min_acceptable?: number;
  max_acceptable?: number;
  is_pass: boolean;
  corrective_action?: string;
  notes?: string;
  created_at: string;
}

// ─── Category Config ───
const CATEGORIES = [
  { id: 'temperature_fridge', label: 'อุณหภูมิตู้เย็น', icon: Thermometer, unit: '°C', min: 0, max: 4 },
  { id: 'temperature_freezer', label: 'อุณหภูมิตู้แช่แข็ง', icon: Thermometer, unit: '°C', min: -25, max: -18 },
  { id: 'cleanliness', label: 'ความสะอาดพื้นที่', icon: Droplets, unit: 'คะแนน (1-5)', min: 3, max: 5 },
  { id: 'equipment', label: 'อุปกรณ์', icon: ClipboardCheck, unit: 'คะแนน (1-5)', min: 3, max: 5 },
  { id: 'personal_hygiene', label: 'สุขอนามัยบุคคล', icon: ShieldCheck, unit: 'ผ่าน/ไม่ผ่าน', min: 1, max: 1 },
  { id: 'expiry_check', label: 'ตรวจวันหมดอายุ', icon: ClipboardCheck, unit: 'รายการ', min: 0, max: 0 },
];

export const FoodSafetyLog: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [logs, setLogs] = useState<SafetyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLog, setEditingLog] = useState<SafetyLog | null>(null);

  // Form state
  const [formCategory, setFormCategory] = useState(CATEGORIES[0].id);
  const [formCheckItem, setFormCheckItem] = useState('');
  const [formReading, setFormReading] = useState('');
  const [formCorrectiveAction, setFormCorrectiveAction] = useState('');

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_food_safety_logs')
        .select('*')
        .eq('log_date', selectedDate)
        .order('log_time', { ascending: true });
      if (error) throw error;
      setLogs(data || []);
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const addLog = async () => {
    if (!formCheckItem.trim()) { toast.error('กรุณาระบุรายการตรวจ'); return; }

    const cat = CATEGORIES.find(c => c.id === formCategory);
    const readingVal = formReading ? parseFloat(formReading) : undefined;
    let isPass = true;
    if (readingVal !== undefined && cat && cat.max > 0) {
      isPass = readingVal >= cat.min && readingVal <= cat.max;
    }

    try {
      const { error } = await supabase.from('erp_food_safety_logs').insert({
        log_date: selectedDate,
        log_time: dayjs().format('HH:mm:ss'),
        category: formCategory,
        location: cat?.id || '',
        check_item: formCheckItem,
        reading_value: readingVal,
        reading_unit: cat?.unit || '',
        min_acceptable: cat?.min,
        max_acceptable: cat?.max,
        is_pass: isPass,
        corrective_action: !isPass ? formCorrectiveAction : null,
        checked_by: '00000000-0000-0000-0000-000000000001',
      });
      if (error) throw error;

      toast.success(isPass ? '✅ ผ่าน — บันทึกแล้ว' : '⚠️ ไม่ผ่าน — บันทึกแล้ว');
      setFormCheckItem('');
      setFormReading('');
      setFormCorrectiveAction('');
      setShowAddForm(false);
      loadLogs();
    } catch (err: any) {
      toast.error('บันทึกไม่สำเร็จ: ' + (err.message || ''));
    }
  };

  // ── Edit Log ──
  const startEdit = (log: SafetyLog) => {
    setEditingLog(log);
    setFormCategory(log.category);
    setFormCheckItem(log.check_item);
    setFormReading(log.reading_value != null ? String(log.reading_value) : '');
    setFormCorrectiveAction(log.corrective_action || '');
    setShowAddForm(true);
  };

  const saveEdit = async () => {
    if (!editingLog) return;
    if (!formCheckItem.trim()) { toast.error('กรุณาระบุรายการตรวจ'); return; }

    const cat = CATEGORIES.find(c => c.id === formCategory);
    const readingVal = formReading ? parseFloat(formReading) : undefined;
    let isPass = true;
    if (readingVal !== undefined && cat && cat.max > 0) {
      isPass = readingVal >= cat.min && readingVal <= cat.max;
    }

    try {
      const { error } = await supabase.from('erp_food_safety_logs').update({
        category: formCategory,
        check_item: formCheckItem,
        reading_value: readingVal,
        reading_unit: cat?.unit || '',
        min_acceptable: cat?.min,
        max_acceptable: cat?.max,
        is_pass: isPass,
        corrective_action: !isPass ? formCorrectiveAction : null,
      }).eq('id', editingLog.id);
      if (error) throw error;

      toast.success('แก้ไขเรียบร้อย');
      resetForm();
      loadLogs();
    } catch (err: any) {
      toast.error('แก้ไขไม่สำเร็จ: ' + (err.message || ''));
    }
  };

  const resetForm = () => {
    setFormCheckItem('');
    setFormReading('');
    setFormCorrectiveAction('');
    setShowAddForm(false);
    setEditingLog(null);
  };

  const deleteLog = async (id: string) => {
    // Optimistic delete
    setLogs(prev => prev.filter(l => l.id !== id));
    const { error } = await supabase.from('erp_food_safety_logs').delete().eq('id', id);
    if (error) {
      toast.error('ลบไม่สำเร็จ');
      loadLogs();
    } else {
      toast.success('ลบเรียบร้อย');
    }
  };

  const totalChecks = logs.length;
  const passedChecks = logs.filter(l => l.is_pass).length;
  const failedChecks = logs.filter(l => !l.is_pass).length;
  const passRate = totalChecks > 0 ? ((passedChecks / totalChecks) * 100).toFixed(0) : '0';

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-teal-100 rounded-xl shrink-0">
              <ShieldCheck size={20} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">บันทึก HACCP</h2>
              <p className="text-[11px] text-slate-500">ตรวจสอบความปลอดภัยอาหารประจำวัน</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/20 min-h-[44px]" />
            <button onClick={() => { if (showAddForm) resetForm(); else setShowAddForm(true); }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 active:scale-[0.97] transition-all min-h-[44px] shrink-0">
              {showAddForm ? <X size={16} /> : <Plus size={16} />}
              <span className="hidden sm:inline">{showAddForm ? 'ปิด' : 'เพิ่มรายการ'}</span>
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: 'ตรวจทั้งหมด', value: totalChecks, color: 'text-slate-900' },
            { label: 'ผ่าน', value: passedChecks, color: 'text-emerald-600' },
            { label: 'ไม่ผ่าน', value: failedChecks, color: 'text-red-500' },
            { label: 'อัตราผ่าน', value: `${passRate}%`, color: Number(passRate) >= 90 ? 'text-emerald-600' : Number(passRate) >= 70 ? 'text-amber-600' : 'text-red-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">{stat.label}</p>
              <p className={`text-lg sm:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Add Form — Slide Down */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-xl border border-teal-200 p-4 sm:p-5 space-y-4">
                <h3 className="font-semibold text-slate-900 text-sm">{editingLog ? 'แก้ไขรายการตรวจ' : 'เพิ่มรายการตรวจใหม่'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1.5">หมวดหมู่</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/20 min-h-[44px]">
                      {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1.5">รายการตรวจ *</label>
                    <input type="text" value={formCheckItem} onChange={e => setFormCheckItem(e.target.value)}
                      placeholder="เช่น ตู้เย็น #1, โต๊ะเตรียม A"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/20 min-h-[44px]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                      ค่าวัด ({CATEGORIES.find(c => c.id === formCategory)?.unit || ''})
                    </label>
                    <input type="number" step="0.1" value={formReading} onChange={e => setFormReading(e.target.value)}
                      placeholder="กรอกค่าที่วัดได้"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/20 min-h-[44px]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1.5">การแก้ไข (ถ้าไม่ผ่าน)</label>
                    <input type="text" value={formCorrectiveAction} onChange={e => setFormCorrectiveAction(e.target.value)}
                      placeholder="สิ่งที่ทำเพื่อแก้ไข"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/20 min-h-[44px]" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={resetForm}
                    className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px]">ยกเลิก</button>
                  <button onClick={editingLog ? saveEdit : addLog}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 active:scale-[0.97] transition-all min-h-[44px]">
                    <CheckCircle2 size={15} /> {editingLog ? 'บันทึกการแก้ไข' : 'บันทึก'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logs */}
        <motion.div variants={fadeUp}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-[3px] border-teal-400/20 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <ClipboardCheck size={44} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-500">ยังไม่มีรายการตรวจ</p>
              <p className="text-sm text-slate-400 mt-1">กดปุ่ม "เพิ่มรายการ" เพื่อเริ่มบันทึก</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="px-4 py-3 font-medium">เวลา</th>
                        <th className="px-4 py-3 font-medium">หมวด</th>
                        <th className="px-4 py-3 font-medium">รายการ</th>
                        <th className="px-4 py-3 font-medium text-center">ค่าวัด</th>
                        <th className="px-4 py-3 font-medium text-center">เกณฑ์</th>
                        <th className="px-4 py-3 font-medium text-center">ผลลัพธ์</th>
                        <th className="px-4 py-3 font-medium">การแก้ไข</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {logs.map(log => {
                        const cat = CATEGORIES.find(c => c.id === log.category);
                        return (
                          <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className={`hover:bg-slate-50/50 ${!log.is_pass ? 'bg-red-50/30' : ''}`}>
                            <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{log.log_time?.substring(0, 5)}</td>
                            <td className="px-4 py-2.5 text-xs text-slate-600">{cat?.label || log.category}</td>
                            <td className="px-4 py-2.5 text-slate-900 font-medium">{log.check_item}</td>
                            <td className="px-4 py-2.5 text-center font-mono text-xs">
                              {log.reading_value != null ? `${log.reading_value} ${log.reading_unit || ''}` : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-center text-xs text-slate-500">
                              {log.min_acceptable != null && log.max_acceptable != null && log.max_acceptable > 0
                                ? `${log.min_acceptable}–${log.max_acceptable}` : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {log.is_pass ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-medium">
                                  <CheckCircle2 size={11} /> ผ่าน
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-[11px] font-medium">
                                  <XCircle size={11} /> ไม่ผ่าน
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[120px] truncate">{log.corrective_action || '-'}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1">
                                <button onClick={() => startEdit(log)}
                                  className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={() => deleteLog(log.id)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {logs.map(log => {
                  const cat = CATEGORIES.find(c => c.id === log.category);
                  return (
                    <motion.div key={log.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className={`bg-white rounded-xl border p-3 ${!log.is_pass ? 'border-red-200 bg-red-50/20' : 'border-slate-200'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-slate-400 font-mono">{log.log_time?.substring(0, 5)}</span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{cat?.label || log.category}</span>
                          </div>
                          <p className="font-semibold text-slate-900 text-sm">{log.check_item}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {log.is_pass ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-medium">
                              <CheckCircle2 size={11} /> ผ่าน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-[11px] font-medium">
                              <XCircle size={11} /> ไม่ผ่าน
                            </span>
                          )}
                          <button onClick={() => startEdit(log)}
                            className="p-1.5 text-blue-400 hover:text-blue-600 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => deleteLog(log.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {log.reading_value != null && (
                        <p className="text-xs text-slate-600">ค่าวัด: <span className="font-semibold">{log.reading_value} {log.reading_unit}</span></p>
                      )}
                      {log.corrective_action && (
                        <p className="text-xs text-red-600 mt-1">แก้ไข: {log.corrective_action}</p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};
