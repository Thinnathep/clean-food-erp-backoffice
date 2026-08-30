import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins, Save, CheckCircle2, AlertTriangle, Calendar,
  ChevronLeft, ChevronRight, RefreshCw, History
} from 'lucide-react';

import { useAuthStore } from '../../../store/authStore';

// ─── Types ───
interface PoolInfo {
  pool_type: string;
  display_name: string;
  current_balance: number;
}

interface ReconEntry {
  id?: string;
  pool_type: string;
  display_name: string;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  expected_balance: number;
  actual_balance: number;
  variance: number;
  variance_reason: string;
}

interface SavedRecon {
  id: string;
  reconciliation_date: string;
  pool_type: string;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  expected_balance: number;
  actual_balance: number;
  variance: number;
  variance_reason?: string;
  status: string;
  created_at: string;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export const CashReconciliation: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [entries, setEntries] = useState<ReconEntry[]>([]);
  const [history, setHistory] = useState<SavedRecon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hasSavedToday, setHasSavedToday] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Get fund pools
      const { data: pools } = await supabase
        .from('erp_fund_pools')
        .select('pool_type, display_name, current_balance')
        .order('sort_order');

      // 2. Get today's transactions
      const startOfDay = selectedDate + 'T00:00:00';
      const endOfDay = selectedDate + 'T23:59:59';

      const { data: txs } = await supabase
        .from('erp_fund_transactions')
        .select('pool_type, direction, amount')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      // 3. Check if reconciliation already exists for this date
      const { data: existing } = await supabase
        .from('erp_cash_reconciliations')
        .select('*')
        .eq('reconciliation_date', selectedDate);

      setHasSavedToday((existing || []).length > 0);

      // 4. Calculate per-pool
      const reconEntries: ReconEntry[] = (pools || []).map((pool: PoolInfo) => {
        const poolTxs = (txs || []).filter((t: any) => t.pool_type === pool.pool_type);
        const income = poolTxs.filter((t: any) => t.direction === 'IN').reduce((s: number, t: any) => s + t.amount, 0);
        const expense = poolTxs.filter((t: any) => t.direction === 'OUT').reduce((s: number, t: any) => s + t.amount, 0);

        // Opening = current - today's net
        const todayNet = income - expense;
        const openingBalance = pool.current_balance - todayNet;
        const expectedBalance = openingBalance + income - expense;

        // If saved, use saved values
        const saved = (existing || []).find((e: any) => e.pool_type === pool.pool_type);

        return {
          id: saved?.id,
          pool_type: pool.pool_type,
          display_name: pool.display_name === 'ค่าดำเนินการ' ? 'ค่าบิล' : pool.display_name,
          opening_balance: saved?.opening_balance ?? openingBalance,
          total_income: saved?.total_income ?? income,
          total_expense: saved?.total_expense ?? expense,
          expected_balance: saved?.expected_balance ?? expectedBalance,
          actual_balance: saved?.actual_balance ?? expectedBalance,
          variance: saved?.variance ?? 0,
          variance_reason: saved?.variance_reason ?? '',
        };
      });

      setEntries(reconEntries);

      // 5. Load history
      const { data: hist } = await supabase
        .from('erp_cash_reconciliations')
        .select('*')
        .order('reconciliation_date', { ascending: false })
        .limit(30);
      setHistory(hist || []);
    } catch (err) {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateActualBalance = (poolType: string, value: number) => {
    setEntries(prev => prev.map(e => {
      if (e.pool_type !== poolType) return e;
      const variance = value - e.expected_balance;
      return { ...e, actual_balance: value, variance };
    }));
  };

  const updateVarianceReason = (poolType: string, reason: string) => {
    setEntries(prev => prev.map(e =>
      e.pool_type === poolType ? { ...e, variance_reason: reason } : e
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const entry of entries) {
        const data = {
          reconciliation_date: selectedDate,
          pool_type: entry.pool_type,
          opening_balance: entry.opening_balance,
          total_income: entry.total_income,
          total_expense: entry.total_expense,
          expected_balance: entry.expected_balance,
          actual_balance: entry.actual_balance,
          variance: entry.variance,
          variance_reason: entry.variance_reason || null,
          status: 'completed',
          counted_by: useAuthStore.getState().user?.id || '00000000-0000-0000-0000-000000000001',
        };

        if (entry.id) {
          await supabase.from('erp_cash_reconciliations').update(data).eq('id', entry.id);
        } else {
          await supabase.from('erp_cash_reconciliations').insert(data);
        }
      }
      toast.success('บันทึกการตรวจนับเงินสดเรียบร้อย');
      setHasSavedToday(true);
      loadData();
    } catch (err: any) {
      toast.error('บันทึกไม่สำเร็จ: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  const navDate = (dir: -1 | 1) => {
    setSelectedDate(d => dayjs(d).add(dir, 'day').format('YYYY-MM-DD'));
  };

  const totalExpected = entries.reduce((s, e) => s + e.expected_balance, 0);
  const totalActual = entries.reduce((s, e) => s + e.actual_balance, 0);
  const totalVariance = totalActual - totalExpected;

  const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-amber-400/20 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <Coins size={22} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">ตรวจนับเงินสดประจำวัน</h2>
            <p className="text-xs text-slate-500">Cash Reconciliation — เทียบยอดเงินจริงกับระบบ</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1">
            <button title="Button" type="button" onClick={() => navDate(-1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronLeft size={16} /></button>
            <div className="flex items-center gap-1.5 px-2">
              <Calendar size={14} className="text-slate-400" />
              <input title="Input field"
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="text-sm font-medium text-slate-900 border-none outline-none bg-transparent py-1"
              />
            </div>
            <button title="Button" type="button" onClick={() => navDate(1)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronRight size={16} /></button>
          </div>

          <button title="Button" type="button"
            onClick={() => setShowHistory(!showHistory)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
              showHistory
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History size={15} />
            <span className="hidden sm:inline">ประวัติ</span>
          </button>
        </div>
      </motion.div>

      {/* 💡 Helper Guide Banner */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-amber-800 font-bold">
          <Coins size={14} className="text-amber-700 shrink-0" />
          <span>คู่มือการตรวจนับเงินสดปิดกะ (Cash Reconciliation)</span>
        </div>
        <p className="text-slate-600 text-[11px] leading-relaxed">
          • <strong>ยอดที่ควรมีในระบบ</strong> = ยอดยกมาต้นวัน + รายรับวันนี้ - รายจ่ายวันนี้<br />
          • <strong>ผลต่าง (Variance)</strong> = ยอดเงินสดจริงที่นับได้ - ยอดที่ควรมี (หากผลต่างไม่เป็น 0 ให้ระบุเหตุผล เช่น เงินทอนขาด/เกิน หรือรอเคลียร์บิล)
        </p>
      </div>

      {/* Total Summary */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <motion.div variants={fadeUp} className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1 font-medium">ยอดคาดหวังรวม</p>
          <p className="text-xl font-bold text-slate-900">฿{fmt(totalExpected)}</p>
        </motion.div>
        <motion.div variants={fadeUp} className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1 font-medium">ยอดนับจริงรวม</p>
          <p className="text-xl font-bold text-slate-900">฿{fmt(totalActual)}</p>
        </motion.div>
        <motion.div variants={fadeUp} className={`rounded-xl border p-4 ${
          totalVariance === 0
            ? 'bg-emerald-50 border-emerald-200'
            : totalVariance > 0
              ? 'bg-amber-50 border-amber-200'
              : 'bg-red-50 border-red-200'
        }`}>
          <p className="text-xs mb-1 font-medium" style={{ color: totalVariance === 0 ? '#059669' : totalVariance > 0 ? '#d97706' : '#dc2626' }}>
            ผลต่าง
          </p>
          <p className="text-xl font-bold" style={{ color: totalVariance === 0 ? '#059669' : totalVariance > 0 ? '#d97706' : '#dc2626' }}>
            {totalVariance >= 0 ? '+' : ''}฿{fmt(totalVariance)}
          </p>
        </motion.div>
      </motion.div>

      {/* Pool Cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {entries.map(entry => (
          <motion.div
            key={entry.pool_type}
            variants={fadeUp}
            className={`bg-white rounded-xl border overflow-hidden transition-all ${
              entry.variance !== 0 ? 'border-amber-200' : 'border-slate-200'
            }`}
          >
            {/* Pool Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">{entry.display_name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{entry.pool_type}</p>
              </div>
              {entry.variance !== 0 && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  entry.variance > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  <AlertTriangle size={12} />
                  ผลต่าง {entry.variance >= 0 ? '+' : ''}฿{fmt(entry.variance)}
                </span>
              )}
              {entry.variance === 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                  <CheckCircle2 size={12} /> ตรง
                </span>
              )}
            </div>

            {/* Pool Detail Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-slate-100">
              <div className="bg-white p-3 sm:p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1">ยอดเปิด</p>
                <p className="text-sm font-semibold text-slate-700">฿{fmt(entry.opening_balance)}</p>
              </div>
              <div className="bg-white p-3 sm:p-4">
                <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-medium mb-1">รับเข้า</p>
                <p className="text-sm font-semibold text-emerald-600">+฿{fmt(entry.total_income)}</p>
              </div>
              <div className="bg-white p-3 sm:p-4">
                <p className="text-[10px] text-red-400 uppercase tracking-wider font-medium mb-1">จ่ายออก</p>
                <p className="text-sm font-semibold text-red-500">-฿{fmt(entry.total_expense)}</p>
              </div>
              <div className="bg-white p-3 sm:p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1">ยอดคาดหวัง</p>
                <p className="text-sm font-bold text-slate-900">฿{fmt(entry.expected_balance)}</p>
              </div>
              <div className="bg-white p-3 sm:p-4 col-span-2 sm:col-span-1">
                <p className="text-[10px] text-amber-500 uppercase tracking-wider font-medium mb-1">ยอดนับจริง</p>
                <input title="Input field"
                  type="number"
                  step="0.01"
                  value={entry.actual_balance}
                  onChange={e => updateActualBalance(entry.pool_type, parseFloat(e.target.value) || 0)}
                  className="w-full text-sm font-bold text-amber-700 px-2 py-1.5 border border-amber-200 rounded-lg bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                />
              </div>
            </div>

            {/* Variance Reason (show only if variance !== 0) */}
            <AnimatePresence>
              {entry.variance !== 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-slate-100"
                >
                  <div className="p-4">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      สาเหตุผลต่าง
                    </label>
                    <input title="Input field"
                      type="text"
                      value={entry.variance_reason}
                      onChange={e => updateVarianceReason(entry.pool_type, e.target.value)}
                      placeholder="ระบุสาเหตุ เช่น ทอนเงินผิด, ค่าใช้จ่ายเล็กน้อยไม่ได้บันทึก"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-300"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-end"
      >
        <button title="Button" type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50"
        >
          {isSaving ? <RefreshCw size={17} className="animate-spin" /> : <Save size={17} />}
          {hasSavedToday ? 'อัปเดตการตรวจนับ' : 'บันทึกการตรวจนับ'}
        </button>
      </motion.div>

      {/* History View */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <History size={16} className="text-slate-400" />
                  ประวัติการตรวจนับ
                </h3>
              </div>
              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Coins size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">ยังไม่มีประวัติ</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="px-4 py-3 font-medium">วันที่</th>
                        <th className="px-4 py-3 font-medium">กองทุน</th>
                        <th className="px-4 py-3 font-medium text-right">คาดหวัง</th>
                        <th className="px-4 py-3 font-medium text-right">นับจริง</th>
                        <th className="px-4 py-3 font-medium text-right">ผลต่าง</th>
                        <th className="px-4 py-3 font-medium">สาเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.map(h => (
                        <tr key={h.id} className={`hover:bg-slate-50/50 ${h.variance !== 0 ? 'bg-amber-50/20' : ''}`}>
                          <td className="px-4 py-2.5 text-slate-600">{dayjs(h.reconciliation_date).format('DD/MM/YY')}</td>
                          <td className="px-4 py-2.5 text-slate-900 font-medium">{h.pool_type}</td>
                          <td className="px-4 py-2.5 text-right text-slate-500">฿{fmt(h.expected_balance)}</td>
                          <td className="px-4 py-2.5 text-right font-medium">฿{fmt(h.actual_balance)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`font-medium ${h.variance === 0 ? 'text-emerald-600' : h.variance > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                              {h.variance >= 0 ? '+' : ''}฿{fmt(h.variance)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-400 max-w-[150px] truncate">
                            {h.variance_reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
