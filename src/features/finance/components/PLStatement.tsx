import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import {
  FileBarChart, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  DollarSign
} from 'lucide-react';

// ─── Animation Tokens ───
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

interface PLLine {
  label: string;
  amount: number;
  indent?: boolean;
  bold?: boolean;
  color?: string;
}

export const PLStatement: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [isLoading, setIsLoading] = useState(true);
  const [revenue, setRevenue] = useState({ pinto: 0, retail: 0, addon: 0, delivery: 0, total: 0 });
  const [cogs, setCogs] = useState({ material: 0, labor: 0, total: 0 });
  const [opex, setOpex] = useState({ ops: 0, marketing: 0, overhead: 0, total: 0 });

  const loadPL = useCallback(async () => {
    setIsLoading(true);
    try {
      const startOfMonth = dayjs(selectedMonth).startOf('month').toISOString();
      const endOfMonth = dayjs(selectedMonth).endOf('month').toISOString();

      // Revenue: from erp_revenue_buckets
      const { data: buckets } = await supabase
        .from('erp_revenue_buckets')
        .select('source_type, gross_amount, delivery_fee, net_amount')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      let pinto = 0, retail = 0, addon = 0, deliveryFees = 0;
      (buckets || []).forEach((b: any) => {
        if (['PACKAGE', 'PINTO', 'MUSCLE_CUSTOM'].includes(b.source_type)) pinto += b.gross_amount;
        else if (b.source_type === 'RETAIL') retail += b.gross_amount;
        else addon += b.gross_amount;
        deliveryFees += b.delivery_fee || 0;
      });
      const totalRevenue = pinto + retail + addon + deliveryFees;
      setRevenue({ pinto, retail, addon, delivery: deliveryFees, total: totalRevenue });

      // COGS: from erp_fund_transactions MATERIAL + LABOR pool OUT
      const { data: txs } = await supabase
        .from('erp_fund_transactions')
        .select('pool_type, direction, amount')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)
        .eq('direction', 'OUT');

      let materialCost = 0, laborCost = 0, opsCost = 0;
      (txs || []).forEach((t: any) => {
        if (t.pool_type === 'MATERIAL') materialCost += t.amount;
        else if (t.pool_type === 'LABOR') laborCost += t.amount;
        else if (t.pool_type === 'OPS') opsCost += t.amount;
      });
      setCogs({ material: materialCost, labor: laborCost, total: materialCost + laborCost });
      setOpex({ ops: opsCost, marketing: 0, overhead: 0, total: opsCost });
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { loadPL(); }, [loadPL]);

  const grossProfit = revenue.total - cogs.total;
  const grossMargin = revenue.total > 0 ? (grossProfit / revenue.total * 100) : 0;
  const netProfit = grossProfit - opex.total;
  const netMargin = revenue.total > 0 ? (netProfit / revenue.total * 100) : 0;

  const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const revenueLines: PLLine[] = [
    { label: 'รายได้ปิ่นโต/แพ็กเกจ', amount: revenue.pinto, indent: true },
    { label: 'รายได้ค้าปลีก', amount: revenue.retail, indent: true },
    { label: 'รายได้เพิ่มเติม', amount: revenue.addon, indent: true },
    { label: 'ค่าจัดส่ง', amount: revenue.delivery, indent: true },
    { label: 'รายได้รวม', amount: revenue.total, bold: true },
  ];
  const cogsLines: PLLine[] = [
    { label: 'ต้นทุนวัตถุดิบ', amount: cogs.material, indent: true },
    { label: 'ต้นทุนแรงงาน', amount: cogs.labor, indent: true },
    { label: 'ต้นทุนขายรวม', amount: cogs.total, bold: true, color: 'text-red-600' },
  ];
  const opexLines: PLLine[] = [
    { label: 'ค่าดำเนินการ (Ops)', amount: opex.ops, indent: true },
    { label: 'การตลาด', amount: opex.marketing, indent: true },
    { label: 'ค่าใช้จ่ายดำเนินงานรวม', amount: opex.total, bold: true, color: 'text-red-600' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-400/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-indigo-100 rounded-xl shrink-0">
            <FileBarChart size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">งบกำไรขาดทุน</h2>
            <p className="text-[11px] text-slate-500">P&L Statement — Auto-calculated</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1">
          <button title="Button" type="button" onClick={() => setSelectedMonth(m => dayjs(m).subtract(1, 'month').format('YYYY-MM'))}
            className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 min-w-[40px] min-h-[40px] flex items-center justify-center"><ChevronLeft size={16} /></button>
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="text-sm font-medium text-slate-900 border-none outline-none bg-transparent px-2 py-1 min-h-[40px] min-w-[130px]" title="Input field" />
          <button title="Button" type="button" onClick={() => setSelectedMonth(m => dayjs(m).add(1, 'month').format('YYYY-MM'))}
            className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 min-w-[40px] min-h-[40px] flex items-center justify-center"><ChevronRight size={16} /></button>
        </div>
      </motion.div>

      {/* 💡 Helper Guide Banner */}
      <motion.div variants={fadeUp} className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-indigo-800 font-bold">
          <FileBarChart size={14} className="text-indigo-700 shrink-0" />
          <span>โครงสร้างงบกำไรขาดทุน Clean Food CR (P&L Structure)</span>
        </div>
        <p className="text-slate-600 text-[11px] leading-relaxed">
          • <strong>กำไรขั้นต้น (Gross Profit)</strong> = รายได้รวม - ต้นทุนขาย COGS (วัตถุดิบ + ค่าแรงครัว)<br />
          • <strong>กำไรสุทธิ (Net Profit)</strong> = กำไรขั้นต้น - ค่าใช้จ่ายดำเนินงาน OPEX (ค่าน้ำ ค่าไฟ ค่าเช่า การตลาด)
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={14} className="text-emerald-500" />
            <p className="text-[10px] sm:text-xs text-slate-500">รายได้รวม</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-emerald-600">฿{fmt(revenue.total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={14} className="text-red-400" />
            <p className="text-[10px] sm:text-xs text-slate-500">ต้นทุน</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-red-500">฿{fmt(cogs.total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign size={14} className="text-blue-500" />
            <p className="text-[10px] sm:text-xs text-slate-500">กำไรขั้นต้น</p>
          </div>
          <p className={`text-lg sm:text-xl font-bold ${grossProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
            ฿{fmt(grossProfit)} <span className="text-xs font-normal text-slate-400">({grossMargin.toFixed(1)}%)</span>
          </p>
        </div>
        <div className={`rounded-xl border p-3 sm:p-4 ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign size={14} className={netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'} />
            <p className="text-[10px] sm:text-xs text-slate-500">กำไรสุทธิ</p>
          </div>
          <p className={`text-lg sm:text-xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ฿{fmt(netProfit)} <span className="text-xs font-normal text-slate-400">({netMargin.toFixed(1)}%)</span>
          </p>
        </div>
      </motion.div>

      {/* P&L Table */}
      <motion.div variants={fadeUp} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Revenue Section */}
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-500 rounded-full" /> รายได้
          </h3>
          <div className="space-y-1.5">
            {revenueLines.map(line => (
              <PLRow key={line.label} {...line} />
            ))}
          </div>
        </div>

        {/* COGS Section */}
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-red-400 rounded-full" /> ต้นทุนขาย (COGS)
          </h3>
          <div className="space-y-1.5">
            {cogsLines.map(line => (
              <PLRow key={line.label} {...line} />
            ))}
          </div>
        </div>

        {/* Gross Profit */}
        <div className="px-4 sm:px-5 py-3 bg-blue-50/50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-blue-800">กำไรขั้นต้น (Gross Profit)</span>
            <span className={`text-sm font-bold ${grossProfit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
              ฿{fmt(grossProfit)} <span className="text-xs font-normal">({grossMargin.toFixed(1)}%)</span>
            </span>
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-amber-400 rounded-full" /> ค่าใช้จ่ายดำเนินงาน (OPEX)
          </h3>
          <div className="space-y-1.5">
            {opexLines.map(line => (
              <PLRow key={line.label} {...line} />
            ))}
          </div>
        </div>

        {/* Net Profit */}
        <div className={`px-4 sm:px-5 py-4 ${netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-slate-900">กำไรสุทธิ (Net Profit)</span>
            <span className={`text-base font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              ฿{fmt(netProfit)}
              <span className="text-xs font-normal ml-1">({netMargin.toFixed(1)}%)</span>
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── P&L Row ───
const PLRow: React.FC<PLLine> = ({ label, amount, indent, bold, color }) => (
  <div className={`flex items-center justify-between py-1 ${indent ? 'pl-4 sm:pl-6' : ''}`}>
    <span className={`text-sm ${bold ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{label}</span>
    <span className={`text-sm font-mono ${bold ? 'font-bold' : ''} ${color || 'text-slate-800'}`}>
      ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
    </span>
  </div>
);
