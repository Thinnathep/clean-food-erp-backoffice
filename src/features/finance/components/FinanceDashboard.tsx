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
import dayjs from 'dayjs';
import { toast } from 'sonner';
import {
  Wallet, PiggyBank, Receipt, History, Calculator, Rocket,
  TrendingUp, TrendingDown, RefreshCw, Sun, Moon, Package, AlertTriangle, Download, Users, Settings
} from 'lucide-react';

type TabKey = 'overview' | 'income' | 'expense' | 'history' | 'simulator' | 'promotions' | 'customers' | 'settings';

export const FinanceDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const isCEO = user?.role === 'ADMIN'; // CEO/CFO sees everything

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
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
        supabase.from('erp_revenue_buckets').select('*, members(full_name, phone)').order('created_at', { ascending: false }).limit(50),
        supabase.from('erp_fund_transactions').select('*').order('created_at', { ascending: false }).limit(100),
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
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filter by visibility
  const visiblePools = pools.filter(p => {
    if (isCEO) return true;
    if (p.visibility === 'CEO_ONLY') return false;
    if (p.visibility === 'MANAGER' && user?.role !== 'MANAGER') return false;
    return true;
  });



  // Monthly stats
  const monthBuckets = buckets.filter(b => dayjs(b.created_at).format('YYYY-MM') === selectedMonth);
  const monthTx = transactions.filter(t => dayjs(t.created_at).format('YYYY-MM') === selectedMonth);
  const monthIncome = monthBuckets.reduce((s, b) => s + b.gross_amount, 0);
  const monthDeliveryFees = monthBuckets.reduce((s, b) => s + b.delivery_fee, 0);
  const monthExpense = monthTx.filter(t => t.direction === 'OUT').reduce((s, t) => s + t.amount, 0);
  const totalBalance = pools.reduce((s, p) => s + p.current_balance, 0);
  
  // New Stats
  const activePackages = monthBuckets.filter(b => b.source_type === 'PACKAGE' || b.source_type === 'MUSCLE_CUSTOM').length;
  const netProfit = monthIncome - monthExpense;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'ภาพรวม', icon: <Wallet size={18} /> },
    { key: 'income', label: 'บันทึกรายรับ', icon: <TrendingUp size={18} /> },
    { key: 'expense', label: 'บันทึกรายจ่าย', icon: <TrendingDown size={18} /> },
    { key: 'history', label: 'ประวัติ', icon: <History size={18} /> },
    { key: 'promotions', label: 'สร้างโปรฯ', icon: <Rocket size={18} /> },
    { key: 'customers', label: 'ลูกค้า (LTV)', icon: <Users size={18} /> },
    { key: 'simulator', label: 'จำลอง Split', icon: <Calculator size={18} /> },
    { key: 'settings', label: 'ตั้งค่า', icon: <Settings size={18} /> },
  ];

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
    <div className={`flex-1 flex flex-col h-full transition-colors duration-300 overflow-hidden ${
      isDarkMode ? 'bg-[#0c0f1a]' : 'bg-[#F8FAFC]'
    }`}>
      {/* Header */}
      <div className="px-6 pt-6 pb-0 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
              <PiggyBank size={26} className="text-white" />
            </div>
            <div>
              <h1 className={`text-xl md:text-2xl font-bold transition-colors ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                ระบบบัญชีและกองทุน
              </h1>
              <p className="text-emerald-500 text-xs font-bold uppercase tracking-wider">
                {dayjs(selectedMonth).format('MMMM YYYY')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2.5 rounded-xl border transition-all ${
                isDarkMode 
                  ? 'bg-slate-800/60 border-slate-700 text-amber-400 hover:text-amber-300' 
                  : 'bg-white border-slate-200 text-slate-500 hover:text-emerald-500 shadow-sm'
              }`}
              title={isDarkMode ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className={`border text-sm px-3 py-2 rounded-xl outline-none transition-all ${
                isDarkMode 
                  ? 'bg-slate-800/60 border-slate-700 text-slate-300 focus:border-emerald-500' 
                  : 'bg-white border-slate-200 text-slate-600 focus:border-emerald-500 shadow-sm'
              }`}
            />
            <button
              onClick={exportCSV}
              className={`p-2.5 border rounded-xl transition-all ${
                isDarkMode
                  ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 shadow-sm'
              }`}
              title="Export CSV"
            >
              <Download size={18} />
            </button>
            <button
              onClick={fetchAll}
              className={`p-2.5 border rounded-xl transition-all ${
                isDarkMode
                  ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 shadow-sm'
              }`}
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 rounded-xl p-1 border transition-all ${
          isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-100 border-slate-200 shadow-inner'
        }`}>
          {tabs.map(tab => (
            <motion.button
              key={tab.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'text-emerald-600'
                  : isDarkMode
                    ? 'text-slate-500 hover:text-slate-300'
                    : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="activeTab"
                  className={`absolute inset-0 rounded-lg shadow-sm ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30' 
                      : 'bg-white border border-emerald-200'
                  }`}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                <span className="hidden md:inline">{tab.label}</span>
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {activeTab === 'overview' && (
              <>
                {/* Fund Depletion Alerts */}
                {visiblePools.filter(p => p.target_amount > 0 && p.current_balance < (p.target_amount * 0.2)).length > 0 && (
                  <div className={`p-4 rounded-2xl border animate-pulse transition-all bg-red-500/10 border-red-500/30 flex items-start gap-4 mb-6`}>
                    <div className="p-2 rounded-xl bg-red-500 text-white">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-red-500">แจ้งเตือน: เงินในบางกองทุนต่ำกว่าเกณฑ์!</h4>
                      <p className="text-xs text-red-400 mt-0.5">
                        {visiblePools
                          .filter(p => p.target_amount > 0 && p.current_balance < (p.target_amount * 0.2))
                          .map(p => `${p.display_name} (เหลือ ฿${p.current_balance.toLocaleString()})`)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <SummaryCard label="รายรับเดือนนี้" value={monthIncome} color="#22c55e" icon={<TrendingUp size={18} />} isDarkMode={isDarkMode} />
                  <SummaryCard label="รายจ่ายเดือนนี้" value={monthExpense} color="#ef4444" icon={<TrendingDown size={18} />} isDarkMode={isDarkMode} />
                  <SummaryCard label="กำไรสุทธิ" value={netProfit} color={netProfit >= 0 ? "#10b981" : "#f43f5e"} icon={<PiggyBank size={18} />} isDarkMode={isDarkMode} />
                  <SummaryCard label="แพ็กเกจ Active" value={activePackages} color="#3b82f6" icon={<Package size={18} />} isDarkMode={isDarkMode} isCount />
                  <SummaryCard label="ค่าจัดส่งรวม" value={monthDeliveryFees} color="#8b5cf6" icon={<Receipt size={18} />} isDarkMode={isDarkMode} />
                  <SummaryCard label="ยอดคงเหลือรวม" value={totalBalance} color="#06b6d4" icon={<Wallet size={18} />} isDarkMode={isDarkMode} />
                </div>

                {/* Charts Section */}
                <FinanceCharts transactions={transactions} buckets={buckets} isDarkMode={isDarkMode} />

                {/* Split Bar */}
                <div className={`rounded-2xl border p-5 transition-all mt-6 ${
                  isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <h3 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>สัดส่วนการแยกเงิน (เดือนนี้)</h3>
                  <div className="flex h-8 rounded-xl overflow-hidden gap-0.5 shadow-inner bg-slate-100 dark:bg-slate-900">
                    {(['MATERIAL', 'LABOR', 'OPS', 'PROFIT'] as PoolType[]).map(pt => {
                      const total = monthBuckets.reduce((s, b) => s + b.net_amount, 0);
                      const poolAmount = monthBuckets.reduce((s, b) => {
                        if (pt === 'MATERIAL') return s + b.material_amount;
                        if (pt === 'LABOR') return s + b.labor_amount;
                        if (pt === 'OPS') return s + b.ops_amount;
                        return s + b.profit_amount;
                      }, 0);
                      const pct = total > 0 ? (poolAmount / total * 100) : (pt === 'MATERIAL' ? 35 : pt === 'LABOR' ? 15 : pt === 'OPS' ? 20 : 30);
                      const cfg = POOL_CONFIG[pt];
                      const showPool = isCEO || (pt !== 'LABOR' && pt !== 'PROFIT');
                      if (!showPool) return null;
                      return (
                        <div
                          key={pt}
                          className="flex items-center justify-center text-xs font-bold text-white transition-all"
                          style={{ width: `${pct}%`, backgroundColor: cfg.color, minWidth: 40 }}
                          title={`${cfg.label}: ฿${poolAmount.toLocaleString()} (${pct.toFixed(0)}%)`}
                        >
                          {cfg.icon} {pct.toFixed(0)}%
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-3 flex-wrap">
                    {(['MATERIAL', 'LABOR', 'OPS', 'PROFIT'] as PoolType[]).map(pt => {
                      const cfg = POOL_CONFIG[pt];
                      const showPool = isCEO || (pt !== 'LABOR' && pt !== 'PROFIT');
                      if (!showPool) return null;
                      return (
                        <span key={pt} className="text-xs flex items-center gap-1.5 transition-colors"
                          style={{ color: isDarkMode ? '#94a3b8' : '#475569' }}>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                          {isCEO ? cfg.label : cfg.labelPublic}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Fund Pool Cards */}
                <div className="mt-6">
                  <FundPoolCards pools={visiblePools} isCEO={isCEO} transactions={monthTx} isDarkMode={isDarkMode} />
                </div>

                {/* Recent Revenue Buckets */}
                <div className={`rounded-2xl border p-5 transition-all mt-6 ${
                  isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <h3 className={`text-sm font-medium mb-4 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Receipt size={16} /> รายรับล่าสุด
                  </h3>
                  {monthBuckets.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">ยังไม่มีรายรับในเดือนนี้</p>
                  ) : (
                    <div className="space-y-2">
                      {monthBuckets.slice(0, 10).map(b => (
                        <div key={b.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isDarkMode 
                            ? 'bg-slate-900/40 border-slate-700/30 hover:border-emerald-500/30' 
                            : 'bg-slate-50 border-slate-100 hover:border-emerald-300 hover:bg-white'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                              isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                            }`}>
                              <TrendingUp size={18} />
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{b.description || b.source_type}</p>
                              <p className="text-xs text-slate-500">{b.members?.full_name || '—'} · {dayjs(b.created_at).format('DD/MM/YY HH:mm')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>+฿{b.gross_amount.toLocaleString()}</p>
                            {b.delivery_fee > 0 && (
                              <p className="text-xs text-slate-500">ค่าส่ง ฿{b.delivery_fee.toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'income' && (
              <RevenueRecorder
                configs={configs}
                onSaved={fetchAll}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'expense' && (
              <ExpenseRecorder
                onSaved={fetchAll}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'history' && (
              <TransactionHistory
                transactions={transactions}
                isCEO={isCEO}
                selectedMonth={selectedMonth}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'simulator' && (
              <SplitSimulator configs={configs} isDarkMode={isDarkMode} />
            )}

            {activeTab === 'promotions' && (
              <PromotionBuilder isDarkMode={isDarkMode} />
            )}

            {activeTab === 'customers' && (
              <LTVAnalysis isDarkMode={isDarkMode} />
            )}

            {activeTab === 'settings' && (
              <FinanceSettings configs={configs} onRefresh={fetchAll} isDarkMode={isDarkMode} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Summary Card ---
const SummaryCard: React.FC<{
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  isDarkMode: boolean;
  isCount?: boolean;
}> = ({ label, value, color, icon, isDarkMode, isCount }) => (
  <div className={`rounded-2xl border p-5 transition-all group ${
    isDarkMode ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
  }`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity`}
        style={{ backgroundColor: `${color}20`, color }}>
        {icon}
      </div>
    </div>
    <p className={`text-xl font-bold`} style={{ color }}>
      {!isCount && '฿'}{value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
    </p>
  </div>
);
