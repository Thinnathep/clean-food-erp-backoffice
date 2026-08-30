import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../config/supabase';
import { useAuthStore } from '../../../store/authStore';
import { POOL_CONFIG } from '../types';
import type { FundPool, RevenueBucket, FundTransaction, SplitConfig, PoolType } from '../types';
import { FundPoolCards } from './FundPoolCards.tsx';
import { RevenueRecorder } from './RevenueRecorder.tsx';
import { ExpenseRecorder } from './ExpenseRecorder.tsx';
import { TransactionHistory } from './TransactionHistory.tsx';
import { SplitSimulator } from './SplitSimulator.tsx';
import { FinanceCharts } from './FinanceCharts.tsx';
import { LTVAnalysis } from './LTVAnalysis.tsx';
import { FinanceSettings } from './FinanceSettings.tsx';
import { PromotionBuilder } from './PromotionBuilder.tsx';
import { PLStatement } from './PLStatement.tsx';
import { InvoiceManager } from './InvoiceManager.tsx';
import { CashReconciliation } from './CashReconciliation.tsx';
import { FinanceGuideCard } from './FinanceGuideCard.tsx';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  TrendingUp, TrendingDown, RefreshCw, Sun, Moon, Package, AlertTriangle, Download,
  ChevronLeft, ChevronRight, PiggyBank, Wallet, Receipt
} from 'lucide-react';

type TabKey = 'overview' | 'income' | 'expense' | 'history' | 'simulator' | 'promotions' | 'customers' | 'settings' | 'pl' | 'invoices' | 'cash_recon';

export const FinanceDashboard: React.FC<{ initialTab?: TabKey }> = ({ initialTab = 'overview' }) => {
  const { user } = useAuthStore();
  const isCEO = user?.role === 'ADMIN'; // CEO/CFO sees everything

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [pools, setPools] = useState<FundPool[]>([]);
  const [buckets, setBuckets] = useState<RevenueBucket[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [configs, setConfigs] = useState<SplitConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [poolsRes, bucketsRes, txRes, configRes] = await Promise.all([
        supabase.from('erp_fund_pools').select('*').order('sort_order'),
        supabase.from('erp_revenue_buckets')
          .select('*, members(full_name, phone)')
          .gte('created_at', dayjs(selectedMonth).startOf('month').toISOString())
          .lte('created_at', dayjs(selectedMonth).endOf('month').toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('erp_fund_transactions')
          .select('*')
          .gte('created_at', dayjs(selectedMonth).startOf('month').toISOString())
          .lte('created_at', dayjs(selectedMonth).endOf('month').toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('erp_split_configs').select('*').eq('is_active', true).order('promotion_type'),
      ]);
      if (poolsRes.error) throw poolsRes.error;
      if (bucketsRes.error) throw bucketsRes.error;
      if (txRes.error) throw txRes.error;
      if (configRes.error) throw configRes.error;

      setPools(poolsRes.data || []);
      setBuckets(bucketsRes.data || []);
      setTransactions(txRes.data || []);
      setConfigs(configRes.data || []);
    } catch (err: any) {
      toast.error('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Filter by visibility
  const visiblePools = pools.filter(p => {
    if (isCEO) return true;
    if (p.visibility === 'CEO_ONLY') return false;
    if (p.visibility === 'MANAGER' && user?.role !== 'MANAGER') return false;
    return true;
  });

  // Monthly stats
  const monthBuckets = buckets;
  const monthTx = transactions;
  const monthIncome = monthBuckets.reduce((s, b) => s + b.gross_amount, 0);
  const monthDeliveryFees = monthBuckets.reduce((s, b) => s + b.delivery_fee, 0);
  const monthExpense = monthTx.filter(t => t.direction === 'OUT').reduce((s, t) => s + t.amount, 0);
  const totalBalance = pools.reduce((s, p) => s + p.current_balance, 0);
  
  // New Stats
  const activePackages = monthBuckets.filter(b => b.source_type === 'PACKAGE' || b.source_type === 'MUSCLE_CUSTOM').length;
  const netProfit = monthIncome - monthExpense;

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
      const { data: txs } = await supabase.from('erp_fund_transactions').select('pool_type, direction, amount');
      if (!txs) throw new Error('No transactions found');

      const poolStats: Record<string, { in: number; out: number }> = {
        MATERIAL: { in: 0, out: 0 },
        LABOR: { in: 0, out: 0 },
        OPS: { in: 0, out: 0 },
        PROFIT: { in: 0, out: 0 },
        DELIVERY: { in: 0, out: 0 }
      };

      txs.forEach(t => {
        if (t.direction === 'IN') poolStats[t.pool_type].in += t.amount;
        else poolStats[t.pool_type].out += t.amount;
      });

      for (const pt in poolStats) {
        const stats = poolStats[pt];
        await supabase.from('erp_fund_pools').update({
          current_balance: stats.in - stats.out,
          total_in: stats.in,
          total_out: stats.out
        }).eq('pool_type', pt);
      }

      toast.success('Sync ยอดเงินสำเร็จ!', { id: toastId });
      fetchAll();
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message, { id: toastId });
    }
  };

  const exportCSV = () => {
    const headers = ['วันที่', 'ประเภท', 'รายการ', 'รับ (Gross)', 'ส่ง', 'สุทธิ', 'Material', 'Labor', 'Ops', 'Profit', 'Note'];
    const rows = monthBuckets.map(b => [
      dayjs(b.created_at).format('YYYY-MM-DD HH:mm'),
      b.source_type,
      b.description || '-',
      b.gross_amount,
      b.delivery_fee,
      b.net_amount,
      b.material_amount,
      b.labor_amount,
      b.ops_amount,
      b.profit_amount,
      b.notes?.replace(/\n/g, ' ') || ''
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `finance_report_${selectedMonth}.csv`;
    link.click();
    toast.success('ดาวน์โหลด CSV เรียบร้อย!');
  };

  return (
    <div className={`flex-1 flex flex-col min-h-screen transition-colors duration-300 font-sans ${
      isDarkMode ? 'bg-[#0c0f1a]' : 'bg-[#F8FAFC]'
    }`}>
      
      {/* ─── Top Header Bar ─── */}
      <div className={`border-b px-4 sm:px-6 lg:px-8 py-5 sticky top-0 z-30 backdrop-blur-md ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200/80'
      }`}>
        <div className="max-w-[1600px] mx-auto space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                <PiggyBank size={22} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-xl sm:text-2xl font-black tracking-tight font-display ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    ระบบบัญชี & 4 กองทุน
                  </h1>
                  <span className="hidden sm:inline-block text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    4-Fund System
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">จัดการแยกกองทุน 35/15/20/30, บันทึกรายรับ-รายจ่าย, กระทบยอดเงินสด และงบ P&L</p>
              </div>
            </div>

            {/* Controls: Month Selector, Sync, Export, Dark Mode */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Month Switcher */}
              <div className={`flex items-center rounded-xl border overflow-hidden shadow-xs ${
                isDarkMode ? 'border-slate-700 bg-slate-800/80' : 'border-slate-200 bg-white'
              }`}>
                <button
                  type="button"
                  onClick={() => setSelectedMonth(m => dayjs(m).subtract(1, 'month').format('YYYY-MM'))}
                  className={`p-2 transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-50 text-slate-500'}`}
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className={`text-xs font-bold px-2 py-1.5 outline-none text-center border-x font-mono ${
                    isDarkMode 
                      ? 'bg-transparent border-slate-700 text-slate-200' 
                      : 'bg-transparent border-slate-200 text-slate-800'
                  }`}
                  style={{ minWidth: '120px' }}
                />
                <button
                  type="button"
                  onClick={() => setSelectedMonth(m => dayjs(m).add(1, 'month').format('YYYY-MM'))}
                  className={`p-2 transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-50 text-slate-500'}`}
                  title="เดือนถัดไป"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Sync Balances */}
              <button 
                type="button"
                onClick={handleSyncBalances}
                className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                  isDarkMode 
                    ? 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-500/40 text-emerald-400' 
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                }`}
                title="คำนวณยอดเงินใหม่จากประวัติทั้งหมด"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Sync ยอดเงิน</span>
              </button>

              {/* Export CSV */}
              <button 
                type="button"
                onClick={exportCSV}
                className={`p-2 border rounded-xl transition-all shadow-xs ${
                  isDarkMode 
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="ส่งออกรายงาน CSV"
              >
                <Download size={15} />
              </button>

              {/* Dark Mode Toggle */}
              <button 
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-xl border transition-all shadow-xs ${
                  isDarkMode 
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400' 
                    : 'bg-white border-slate-200 text-slate-500 hover:text-emerald-600'
                }`}
                title={isDarkMode ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ─── Main Content Area ─── */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {activeTab === 'overview' && (
              <>
                {/* 💡 Financial Constitution & 4-Fund Guide */}
                <FinanceGuideCard />

                {/* Fund Depletion Alerts */}
                {visiblePools.filter(p => p.target_amount > 0 && p.current_balance < (p.target_amount * 0.2)).length > 0 && (
                  <div className={`p-4.5 rounded-2xl border transition-all flex items-start gap-4 shadow-xs ${
                    isDarkMode ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50/60 border-rose-100'
                  }`}>
                    <div className={`p-2.5 rounded-xl shrink-0 shadow-xs ${
                      isDarkMode ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-600 text-white'
                    }`}>
                      <AlertTriangle size={20} />
                    </div>
                    <div className="space-y-2">
                      <h4 className={`text-sm font-black uppercase tracking-wide ${
                        isDarkMode ? 'text-rose-300' : 'text-rose-800'
                      }`}>
                        แจ้งเตือน: เงินในบางกองทุนต่ำกว่าเกณฑ์!
                      </h4>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {visiblePools
                          .filter(p => p.target_amount > 0 && p.current_balance < (p.target_amount * 0.2))
                          .map(p => {
                            const displayName = p.display_name === 'ค่าดำเนินการ' ? 'ค่าบิล' : p.display_name;
                            const isRemainingFloat = p.current_balance % 1 !== 0;
                            const formattedBalance = p.current_balance.toLocaleString(undefined, { 
                              minimumFractionDigits: isRemainingFloat ? 2 : 0, 
                              maximumFractionDigits: 2 
                            });
                            return (
                              <span 
                                key={p.id} 
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs shadow-xs transition-all ${
                                  isDarkMode ? 'bg-slate-900/80 border-rose-950/50' : 'bg-white border-rose-100'
                                }`}
                              >
                                <span className={`font-black ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>{displayName}</span>
                                <span className={isDarkMode ? 'text-slate-800' : 'text-rose-100'}>|</span>
                                <span className={`font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                  เหลือ ฿{formattedBalance}
                                </span>
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                  <SummaryCard label="รายรับเดือนนี้" value={monthIncome} color="#22c55e" icon={<TrendingUp size={16} />} isDarkMode={isDarkMode} />
                  <SummaryCard label="รายจ่ายเดือนนี้" value={monthExpense} color="#ef4444" icon={<TrendingDown size={16} />} isDarkMode={isDarkMode} />
                  <SummaryCard label="กำไรสุทธิ" value={netProfit} color={netProfit >= 0 ? "#10b981" : "#f43f5e"} icon={<PiggyBank size={16} />} isDarkMode={isDarkMode} />
                  <SummaryCard label="แพ็กเกจ Active" value={activePackages} color="#3b82f6" icon={<Package size={16} />} isDarkMode={isDarkMode} isCount />
                  <SummaryCard label="ค่าจัดส่งรวม" value={monthDeliveryFees} color="#8b5cf6" icon={<Receipt size={16} />} isDarkMode={isDarkMode} />
                  <SummaryCard label="ยอดคงเหลือรวม" value={totalBalance} color="#06b6d4" icon={<Wallet size={16} />} isDarkMode={isDarkMode} />
                </div>

                {/* 5 Fund Pools Cards */}
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                    สถานะยอดเงิน 4 กองทุน & กองทุนจัดส่ง
                  </h3>
                  <FundPoolCards pools={visiblePools} isCEO={isCEO} transactions={transactions} isDarkMode={isDarkMode} onRefresh={fetchAll} />
                </div>

                {/* Charts Section */}
                <div className="mt-8">
                   <FinanceCharts transactions={transactions} buckets={buckets} isDarkMode={isDarkMode} selectedMonth={selectedMonth} />
                </div>

                {/* Split Bar */}
                <div className={`rounded-3xl border p-5 transition-all mt-6 shadow-xs ${
                  isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80'
                }`}>
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    สัดส่วนรายรับแยกกองทุนประจำเดือน ({dayjs(selectedMonth).format('MMMM YYYY')})
                  </h3>
                  <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-200/50 shadow-inner">
                    {(['MATERIAL', 'LABOR', 'OPS', 'PROFIT'] as PoolType[]).map(pt => {
                      const pool = pools.find(p => p.pool_type === pt);
                      const cfg = POOL_CONFIG[pt];
                      const totalIn = buckets.reduce((sum, b) => {
                        if (pt === 'MATERIAL') return sum + b.material_amount;
                        if (pt === 'LABOR') return sum + b.labor_amount;
                        if (pt === 'OPS') return sum + b.ops_amount;
                        if (pt === 'PROFIT') return sum + b.profit_amount;
                        return sum;
                      }, 0);
                      const netRev = monthIncome - monthDeliveryFees;
                      const pct = netRev > 0 ? (totalIn / netRev) * 100 : cfg.defaultPct;
                      return (
                        <div
                          key={pt}
                          className="h-full transition-all duration-500 relative group"
                          style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                          title={`${pool?.display_name || cfg.label}: ฿${totalIn.toLocaleString()} (${pct.toFixed(1)}%)`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs">
                    {(['MATERIAL', 'LABOR', 'OPS', 'PROFIT'] as PoolType[]).map(pt => {
                      const cfg = POOL_CONFIG[pt];
                      return (
                        <div key={pt} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                          <span className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{cfg.label} ({cfg.defaultPct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'income' && <RevenueRecorder configs={configs} onSaved={fetchAll} isDarkMode={isDarkMode} />}
            {activeTab === 'expense' && <ExpenseRecorder onSaved={fetchAll} isDarkMode={isDarkMode} />}
            {activeTab === 'cash_recon' && <CashReconciliation />}
            {activeTab === 'invoices' && <InvoiceManager />}
            {activeTab === 'pl' && <PLStatement />}
            {activeTab === 'history' && (
              <TransactionHistory 
                transactions={transactions} 
                buckets={buckets} 
                isCEO={isCEO} 
                selectedMonth={selectedMonth} 
                isDarkMode={isDarkMode} 
                onRefresh={fetchAll} 
              />
            )}
            {activeTab === 'simulator' && <SplitSimulator configs={configs} isDarkMode={isDarkMode} />}
            {activeTab === 'customers' && <LTVAnalysis isDarkMode={isDarkMode} />}
            {activeTab === 'promotions' && <PromotionBuilder isDarkMode={isDarkMode} />}
            {activeTab === 'settings' && <FinanceSettings configs={configs} onRefresh={fetchAll} isDarkMode={isDarkMode} />}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
};

// Summary Card Sub-component
function SummaryCard({ label, value, color, icon, isDarkMode, isCount = false }: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  isDarkMode: boolean;
  isCount?: boolean;
}) {
  const isFloatingValue = !isCount && value % 1 !== 0;
  return (
    <div className={`p-4 rounded-3xl border transition-all shadow-xs flex flex-col justify-between ${
      isDarkMode 
        ? 'bg-slate-900/60 border-slate-800' 
        : 'bg-white border-slate-200/80 hover:border-slate-300'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>{label}</span>
        <div className="p-1.5 rounded-xl bg-slate-500/10" style={{ color }}>
          {icon}
        </div>
      </div>
      <div className="font-mono text-base sm:text-lg font-bold" style={{ color }}>
        {isCount ? value : `฿${value.toLocaleString(undefined, { 
          minimumFractionDigits: isFloatingValue ? 2 : 0, 
          maximumFractionDigits: 2 
        })}`}
      </div>
    </div>
  );
}
