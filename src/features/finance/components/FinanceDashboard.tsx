import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../config/supabase';
import { useAuthStore } from '../../../store/authStore';
import { getPoolConfig } from '../types';
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
  TrendingUp, TrendingDown, RefreshCw, Package, AlertTriangle, Download,
  ChevronLeft, ChevronRight, PiggyBank, Wallet, Receipt
} from 'lucide-react';

type TabKey = 'overview' | 'income' | 'expense' | 'history' | 'simulator' | 'promotions' | 'customers' | 'settings' | 'pl' | 'invoices' | 'cash_recon';

export const FinanceDashboard: React.FC<{ initialTab?: TabKey }> = ({ initialTab = 'overview' }) => {
  const { user } = useAuthStore();
  const isCEO = user?.role === 'ADMIN'; // CEO/CFO sees everything

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Pure Light Mode: Purge any residual dark mode class or storage
  useEffect(() => {
    try {
      localStorage.removeItem('cf_finance_dark_mode');
      document.documentElement.classList.remove('dark');
    } catch {
      // ignore
    }
  }, []);
  const [pools, setPools] = useState<FundPool[]>([]);
  const [buckets, setBuckets] = useState<RevenueBucket[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [configs, setConfigs] = useState<SplitConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

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
      background: '#fff',
      color: '#1e293b'
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
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC] font-sans">
      
      {/* ─── Top Header Bar ─── */}
      <div className="border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-5 sticky top-0 z-30 backdrop-blur-md bg-white/95 shadow-xs">
        <div className="max-w-[1600px] mx-auto space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                <PiggyBank size={22} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-display text-slate-900">
                    ระบบบัญชี & 7 กองทุน
                  </h1>
                  <span className="hidden sm:inline-block text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium tracking-wide">
                    มาตรฐาน 04/08/2569
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-semibold">จัดการแยกเงิน 7 กองทุน (40/10/14/9/4/4/19), บันทึกรายรับ-รายจ่าย, กระทบยอดเงินสด และงบ P&L</p>
              </div>
            </div>

            {/* Controls: Month Selector, Sync, Export */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Period Switcher (Day for cash_recon, Month for monthly views) */}
              {activeTab === 'cash_recon' ? (
                <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(d => dayjs(d).subtract(1, 'day').format('YYYY-MM-DD'))}
                    className="p-2 transition-colors hover:bg-slate-100 text-slate-700"
                    title="วันก่อนหน้า"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="text-xs font-bold px-2 py-1.5 outline-none text-center border-x font-mono bg-transparent border-slate-300 text-slate-900"
                    style={{ minWidth: '135px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDate(d => dayjs(d).add(1, 'day').format('YYYY-MM-DD'))}
                    className="p-2 transition-colors hover:bg-slate-100 text-slate-700"
                    title="วันถัดไป"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(m => dayjs(m).subtract(1, 'month').format('YYYY-MM'))}
                    className="p-2 transition-colors hover:bg-slate-100 text-slate-700"
                    title="เดือนก่อนหน้า"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="text-xs font-bold px-2 py-1.5 outline-none text-center border-x font-mono bg-transparent border-slate-300 text-slate-900"
                    style={{ minWidth: '120px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(m => dayjs(m).add(1, 'month').format('YYYY-MM'))}
                    className="p-2 transition-colors hover:bg-slate-100 text-slate-700"
                    title="เดือนถัดไป"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Sync Balances */}
              <button 
                type="button"
                onClick={handleSyncBalances}
                className="px-3 py-1.5 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                title="คำนวณยอดเงินใหม่จากประวัติทั้งหมด"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Sync ยอดเงิน</span>
              </button>

              {/* Export CSV */}
              <button 
                type="button"
                onClick={exportCSV}
                className="p-2 border border-slate-200 rounded-xl transition-all shadow-xs bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                title="ส่งออกรายงาน CSV"
              >
                <Download size={15} />
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
                  <div className="p-4.5 rounded-2xl border border-rose-200 bg-rose-50/70 transition-all flex items-start gap-4 shadow-xs">
                    <div className="p-2.5 rounded-xl shrink-0 shadow-xs bg-rose-600 text-white">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-rose-800">
                        แจ้งเตือน: เงินในบางกองทุนต่ำกว่าเกณฑ์!
                      </h4>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {visiblePools
                          .filter(p => p.target_amount > 0 && p.current_balance < (p.target_amount * 0.2))
                          .map(p => {
                            const displayName = p.display_name || getPoolConfig(p.pool_type).label;
                            const isRemainingFloat = p.current_balance % 1 !== 0;
                            const formattedBalance = p.current_balance.toLocaleString(undefined, { 
                              minimumFractionDigits: isRemainingFloat ? 2 : 0, 
                              maximumFractionDigits: 2 
                            });
                            return (
                              <span 
                                key={p.id} 
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-rose-200 bg-white text-xs shadow-xs transition-all"
                              >
                                <span className="font-semibold text-rose-600">{displayName}</span>
                                <span className="text-rose-200">|</span>
                                <span className="font-semibold font-mono text-slate-700">
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
                  <SummaryCard label="รายรับเดือนนี้" value={monthIncome} color="#059669" icon={<TrendingUp size={16} />} />
                  <SummaryCard label="รายจ่ายเดือนนี้" value={monthExpense} color="#e11d48" icon={<TrendingDown size={16} />} />
                  <SummaryCard label="กำไรสุทธิ" value={netProfit} color={netProfit >= 0 ? "#059669" : "#e11d48"} icon={<PiggyBank size={16} />} />
                  <SummaryCard label="แพ็กเกจ Active" value={activePackages} color="#2563eb" icon={<Package size={16} />} isCount />
                  <SummaryCard label="ค่าจัดส่งรวม" value={monthDeliveryFees} color="#7c3aed" icon={<Receipt size={16} />} />
                  <SummaryCard label="ยอดคงเหลือรวม" value={totalBalance} color="#0891b2" icon={<Wallet size={16} />} />
                </div>

                {/* 7 Fund Pools Cards */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-slate-700">
                    สถานะยอดเงิน 7 กองทุน & การจัดส่ง
                  </h3>
                  <FundPoolCards pools={visiblePools} isCEO={isCEO} transactions={transactions} isDarkMode={false} onRefresh={fetchAll} />
                </div>

                {/* Charts Section */}
                <div className="mt-8">
                   <FinanceCharts transactions={transactions} buckets={buckets} isDarkMode={false} selectedMonth={selectedMonth} />
                </div>

                {/* Split Bar */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 transition-all mt-6 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-slate-700">
                    สัดส่วนรายรับแยกกองทุนประจำเดือน ({dayjs(selectedMonth).format('MMMM YYYY')})
                  </h3>
                  <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 shadow-inner">
                    {(['MATERIAL', 'PACKAGING_BILLS', 'LABOR', 'DELIVERY', 'MARKETING', 'MAINTENANCE', 'PROFIT'] as PoolType[]).map(pt => {
                      const pool = pools.find(p => p.pool_type === pt);
                      const cfg = getPoolConfig(pt);
                      const totalIn = buckets.reduce((sum, b) => {
                        if (pt === 'MATERIAL') return sum + (b.material_amount || 0);
                        if (pt === 'PACKAGING_BILLS') return sum + (b.packaging_amount || 0);
                        if (pt === 'LABOR') return sum + (b.labor_amount || 0);
                        if (pt === 'DELIVERY') return sum + (b.delivery_sub_amount || 0);
                        if (pt === 'MARKETING') return sum + (b.marketing_amount || 0);
                        if (pt === 'MAINTENANCE') return sum + (b.maintenance_amount || 0);
                        if (pt === 'PROFIT') return sum + (b.profit_amount || 0);
                        if (pt === 'OPS') return sum + (b.ops_amount || 0);
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
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs">
                    {(['MATERIAL', 'PACKAGING_BILLS', 'LABOR', 'DELIVERY', 'MARKETING', 'MAINTENANCE', 'PROFIT'] as PoolType[]).map(pt => {
                      const cfg = getPoolConfig(pt);
                      return (
                        <div key={pt} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                          <span className="text-[11px] font-medium text-slate-600">{cfg.icon} {cfg.label} ({cfg.defaultPct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'income' && <RevenueRecorder configs={configs} onSaved={fetchAll} isDarkMode={false} />}
            {activeTab === 'expense' && <ExpenseRecorder onSaved={fetchAll} isDarkMode={false} />}
            {activeTab === 'cash_recon' && (
              <CashReconciliation 
                isDarkMode={false} 
                selectedDate={selectedDate} 
                onDateChange={setSelectedDate} 
              />
            )}
            {activeTab === 'invoices' && <InvoiceManager isDarkMode={false} />}
            {activeTab === 'pl' && (
              <PLStatement 
                isDarkMode={false} 
                selectedMonth={selectedMonth} 
                onMonthChange={setSelectedMonth} 
              />
            )}
            {activeTab === 'history' && (
              <TransactionHistory 
                transactions={transactions} 
                buckets={buckets} 
                isCEO={isCEO} 
                selectedMonth={selectedMonth} 
                isDarkMode={false} 
                onRefresh={fetchAll} 
              />
            )}
            {activeTab === 'simulator' && <SplitSimulator configs={configs} isDarkMode={false} />}
            {activeTab === 'customers' && <LTVAnalysis isDarkMode={false} />}
            {activeTab === 'promotions' && <PromotionBuilder isDarkMode={false} />}
            {activeTab === 'settings' && <FinanceSettings configs={configs} onRefresh={fetchAll} isDarkMode={false} />}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
};

// Summary Card Sub-component
function SummaryCard({ label, value, color, icon, isCount = false }: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  isCount?: boolean;
}) {
  const isFloatingValue = !isCount && value % 1 !== 0;
  return (
    <div className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md transition-all shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-700">{label}</span>
        <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-100" style={{ color }}>
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
