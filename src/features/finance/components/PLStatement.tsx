import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import {
  FileBarChart, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  DollarSign, Calendar
} from 'lucide-react';

// ─── Animation Tokens ───
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

interface PLProps {
  isDarkMode?: boolean;
  selectedMonth?: string;
  onMonthChange?: (m: string) => void;
}

interface PLLine {
  label: string;
  amount: number;
  indent?: boolean;
  bold?: boolean;
  color?: string;
}

export const PLStatement: React.FC<PLProps> = ({
  isDarkMode: _isDarkMode = false,
  selectedMonth: propMonth,
  onMonthChange: propOnMonthChange
}) => {
  const [internalMonth, setInternalMonth] = useState(dayjs().format('YYYY-MM'));
  const selectedMonth = propMonth || internalMonth;
  const setSelectedMonth = propOnMonthChange || setInternalMonth;
  const [isLoading, setIsLoading] = useState(true);
  const [revenue, setRevenue] = useState({ pinto: 0, retail: 0, addon: 0, delivery: 0, total: 0 });
  const [cogs, setCogs] = useState({ material: 0, packaging: 0, labor: 0, total: 0 });
  const [opex, setOpex] = useState({ ops: 0, marketing: 0, maintenance: 0, delivery: 0, total: 0 });

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

      // COGS & OPEX: from erp_fund_transactions pool OUT
      const { data: txs } = await supabase
        .from('erp_fund_transactions')
        .select('pool_type, direction, amount')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)
        .eq('direction', 'OUT');

      let materialCost = 0, packagingCost = 0, laborCost = 0, opsCost = 0, marketingCost = 0, maintenanceCost = 0, deliveryCost = 0;
      (txs || []).forEach((t: any) => {
        if (t.pool_type === 'MATERIAL') materialCost += t.amount;
        else if (t.pool_type === 'PACKAGING_BILLS') packagingCost += t.amount;
        else if (t.pool_type === 'LABOR') laborCost += t.amount;
        else if (t.pool_type === 'MARKETING') marketingCost += t.amount;
        else if (t.pool_type === 'MAINTENANCE') maintenanceCost += t.amount;
        else if (t.pool_type === 'DELIVERY') deliveryCost += t.amount;
        else if (t.pool_type === 'OPS') opsCost += t.amount;
      });
      setCogs({ 
        material: materialCost, 
        packaging: packagingCost, 
        labor: laborCost, 
        total: materialCost + packagingCost + laborCost 
      });
      setOpex({ 
        ops: opsCost, 
        marketing: marketingCost, 
        maintenance: maintenanceCost, 
        delivery: deliveryCost, 
        total: opsCost + marketingCost + maintenanceCost + deliveryCost 
      });
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
    { label: 'ต้นทุนวัตถุดิบ (40%)', amount: cogs.material, indent: true },
    { label: 'ต้นทุนบิล & ถุงซีล (10%)', amount: cogs.packaging, indent: true },
    { label: 'ต้นทุนแรงงานคนทำ (14%)', amount: cogs.labor, indent: true },
    { label: 'ต้นทุนขายรวม (COGS)', amount: cogs.total, bold: true, color: 'text-red-600' },
  ];
  const opexLines: PLLine[] = [
    { label: 'ค่าจัดส่งและไรเดอร์ (9%)', amount: opex.delivery, indent: true },
    { label: 'งบการตลาด Ads/Content (4%)', amount: opex.marketing, indent: true },
    { label: 'ทุนสำรอง/ซ่อมบำรุง (4%)', amount: opex.maintenance, indent: true },
    { label: 'ค่าดำเนินการส่วนกลาง (Ops)', amount: opex.ops, indent: true },
    { label: 'ค่าใช้จ่ายดำเนินงานรวม (OPEX)', amount: opex.total, bold: true, color: 'text-red-600' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-400/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 font-sans">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-indigo-100 text-indigo-700 shadow-xs shrink-0">
            <FileBarChart size={20} className="text-indigo-700" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">งบกำไรขาดทุน</h2>
            <p className="text-xs text-slate-500 font-medium">P&L Statement — สรุปผลการดำเนินงานแบบเรียลไทม์</p>
          </div>
        </div>
        {propMonth ? (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-indigo-200/80 bg-indigo-50/60 text-xs font-bold text-indigo-950 shadow-xs">
            <Calendar size={15} className="text-indigo-700" />
            <span>รอบบัญชี: {dayjs(selectedMonth).format('MMMM YYYY')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 border border-slate-200 bg-white rounded-xl px-1 shadow-xs">
            <button title="Button" type="button" onClick={() => setSelectedMonth(dayjs(selectedMonth).subtract(1, 'month').format('YYYY-MM'))}
              className="p-2 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors hover:bg-slate-50 text-slate-500"><ChevronLeft size={16} /></button>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              className="text-sm font-bold border-none outline-none bg-transparent px-2 py-1 min-h-[40px] min-w-[130px] text-slate-800 font-mono" title="Input field" />
            <button title="Button" type="button" onClick={() => setSelectedMonth(dayjs(selectedMonth).add(1, 'month').format('YYYY-MM'))}
              className="p-2 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors hover:bg-slate-50 text-slate-500"><ChevronRight size={16} /></button>
          </div>
        )}
      </motion.div>

      {/* 💡 Helper Guide Banner */}
      <motion.div variants={fadeUp} className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 text-xs space-y-1.5 shadow-xs">
        <div className="flex items-center gap-2 font-semibold text-indigo-950">
          <FileBarChart size={15} className="text-indigo-700 shrink-0" />
          <span>โครงสร้างงบกำไรขาดทุน Clean Food CR มาตรฐานใหม่ (04/08/2569)</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-600 font-normal">
          • <strong>ต้นทุนขาย COGS (64%)</strong> = วัตถุดิบ 40% + ค่าบิล & ถุงซีล 10% + ค่าแรงคนทำ 14%<br />
          • <strong>ค่าใช้จ่ายดำเนินงาน OPEX (17%)</strong> = ช่วยส่ง Grab 9% + การตลาด 4% + ซ่อมบำรุง 4% (เป้าหมายกำไรสุทธิ Net Profit 19%)
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp size={15} className="text-emerald-600" />
            <p className="text-xs font-medium text-slate-500">รายได้รวม</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono">฿{fmt(revenue.total)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingDown size={15} className="text-rose-500" />
            <p className="text-xs font-medium text-slate-500">ต้นทุนขาย (COGS)</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-rose-600 font-mono">฿{fmt(cogs.total)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-1.5 mb-1.5">
            <DollarSign size={15} className="text-blue-600" />
            <p className="text-xs font-medium text-slate-500">กำไรขั้นต้น</p>
          </div>
          <p className={`text-xl sm:text-2xl font-bold font-mono ${grossProfit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
            ฿{fmt(grossProfit)} <span className="text-xs font-normal text-slate-400">({grossMargin.toFixed(1)}%)</span>
          </p>
        </div>
        <div className={`rounded-2xl border p-4 shadow-xs ${
          netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
        }`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <DollarSign size={15} className={netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
            <p className="text-xs font-medium text-slate-600">กำไรสุทธิ (Net)</p>
          </div>
          <p className={`text-xl sm:text-2xl font-bold font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ฿{fmt(netProfit)} <span className="text-xs font-normal text-slate-500">({netMargin.toFixed(1)}%)</span>
          </p>
        </div>
      </motion.div>

      {/* P&L Table */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {/* Revenue Section */}
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" /> รายได้จากการขาย (Revenue)
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
            <div className="w-1.5 h-4 bg-rose-500 rounded-full" /> ต้นทุนขาย (COGS)
          </h3>
          <div className="space-y-1.5">
            {cogsLines.map(line => (
              <PLRow key={line.label} {...line} />
            ))}
          </div>
        </div>

        {/* Gross Profit */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-blue-50/60">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-900">กำไรขั้นต้น (Gross Profit)</span>
            <span className={`text-sm font-bold font-mono ${grossProfit >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>
              ฿{fmt(grossProfit)} <span className="text-xs font-normal ml-1">({grossMargin.toFixed(1)}%)</span>
            </span>
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" /> ค่าใช้จ่ายดำเนินงาน (OPEX)
          </h3>
          <div className="space-y-1.5">
            {opexLines.map(line => (
              <PLRow key={line.label} {...line} />
            ))}
          </div>
        </div>

        {/* Net Profit */}
        <div className={`px-4 sm:px-5 py-4 ${
          netProfit >= 0 ? 'bg-emerald-50/80' : 'bg-rose-50/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-slate-900">กำไรสุทธิประจำงวด (Net Profit)</span>
            <span className={`text-base font-bold font-mono ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              ฿{fmt(netProfit)}
              <span className="text-xs font-normal ml-1.5">({netMargin.toFixed(1)}%)</span>
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── P&L Row ───
const PLRow: React.FC<PLLine> = ({ label, amount, indent, bold, color }) => (
  <div className={`flex items-center justify-between py-1.5 ${indent ? 'pl-4 sm:pl-6' : ''}`}>
    <span className={`text-sm ${bold ? 'font-semibold text-slate-900' : 'text-slate-600 font-normal'}`}>{label}</span>
    <span className={`text-sm font-mono ${bold ? 'font-bold text-slate-900' : 'text-slate-700 font-normal'} ${color || ''}`}>
      ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
    </span>
  </div>
);
