import React from 'react';
import { getPoolConfig } from '../types';
import type { FundPool, FundTransaction, PoolType } from '../types';
import { TrendingUp, TrendingDown, Target, RefreshCw, ChefHat, Rocket, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../config/supabase';
import Swal from 'sweetalert2';

interface Props {
  pools: FundPool[];
  isCEO: boolean;
  transactions: FundTransaction[];
  isDarkMode?: boolean;
  onRefresh?: () => void;
}

export const FundPoolCards: React.FC<Props> = ({ pools, isCEO, transactions, isDarkMode = false, onRefresh }) => {
  const [actualValues, setActualValues] = React.useState<Record<string, string>>({});

  const handleAdjust = async (pool: FundPool, actual: number) => {
    const diff = actual - pool.current_balance;
    if (diff === 0) return;

    const result = await Swal.fire({
      title: 'ปรับยอดเงินให้ตรงธนาคาร?',
      text: `ระบบจะบันทึกรายการปรับสมดุล ${diff > 0 ? '+' : ''}฿${diff.toLocaleString(undefined, { minimumFractionDigits: 2 })} เพื่อให้ยอดตรงกับเงินจริง`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการปรับยอด',
      cancelButtonText: 'ยกเลิก',
      background: isDarkMode ? '#1e293b' : '#fff',
      color: isDarkMode ? '#f1f5f9' : '#1e293b'
    });

    if (result.isConfirmed) {
      const toastId = toast.loading('กำลังปรับยอด...');
      try {
        const { error: txErr } = await supabase.from('erp_fund_transactions').insert({
          pool_type: pool.pool_type,
          direction: diff > 0 ? 'IN' : 'OUT',
          amount: Math.abs(diff),
          category: 'Adjustment',
          description: `ปรับยอดให้ตรงธนาคาร (Diff: ${diff.toFixed(2)})`,
          source_type: 'MANUAL',
          created_at: new Date().toISOString()
        });
        if (txErr) throw txErr;

        const { error: poolErr } = await supabase.from('erp_fund_pools').update({
          current_balance: actual,
          [diff > 0 ? 'total_in' : 'total_out']: diff > 0 ? (pool.total_in || 0) + diff : (pool.total_out || 0) + Math.abs(diff)
        }).eq('id', pool.id);
        if (poolErr) throw poolErr;

        toast.success('ปรับยอดเงินตรงกับธนาคารแล้ว', { id: toastId });
        setActualValues(prev => ({ ...prev, [pool.id]: '' }));
        if (onRefresh) onRefresh();
      } catch (err: any) {
        toast.error('ล้มเหลว: ' + err.message, { id: toastId });
      }
    }
  };

  // Group pools into 3 Financial Zones
  const productionPoolTypes = ['MATERIAL', 'PACKAGING_BILLS', 'LABOR'];
  const operationsPoolTypes = ['DELIVERY', 'MARKETING', 'MAINTENANCE'];
  const profitPoolTypes = ['PROFIT', 'OPS'];

  const productionPools = pools.filter(p => productionPoolTypes.includes(p.pool_type));
  const operationsPools = pools.filter(p => operationsPoolTypes.includes(p.pool_type));
  const profitPools = pools.filter(p => profitPoolTypes.includes(p.pool_type) || (!productionPoolTypes.includes(p.pool_type) && !operationsPoolTypes.includes(p.pool_type)));

  const renderCard = (pool: FundPool) => {
    const pt = pool.pool_type as PoolType;
    const cfg = getPoolConfig(pt);
    const isLocked = false; // Allow CEO/Admin to reconcile and adjust any pool to match bank balance
    const monthIn = transactions.filter(t => t.pool_type === pt && t.direction === 'IN').reduce((s, t) => s + t.amount, 0);
    const monthOut = transactions.filter(t => t.pool_type === pt && t.direction === 'OUT').reduce((s, t) => s + t.amount, 0);
    const targetPct = pool.target_amount > 0 ? Math.min((pool.current_balance / pool.target_amount) * 100, 100) : 0;
    const isLowBalance = pool.target_amount > 0 && pool.current_balance < (pool.target_amount * 0.2);

    return (
      <div
        key={pool.id}
        className={`relative rounded-3xl border p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 flex flex-col justify-between ${
          isDarkMode 
            ? 'bg-slate-900/70 border-slate-800/80 shadow-lg shadow-black/40' 
            : 'bg-white border-slate-200/80 shadow-sm shadow-slate-200/50'
        }`}
        style={{
          borderColor: isLowBalance ? '#f43f5e' : (isDarkMode ? `${cfg.color}30` : `${cfg.color}40`),
        }}
      >
        {/* Top Accent Glow Bar */}
        <div 
          className="absolute top-0 left-6 right-6 h-1 rounded-b-full transition-all"
          style={{ backgroundColor: cfg.color }}
        />

        {/* Header info */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm"
                style={{ backgroundColor: cfg.bgColor, border: `1px solid ${cfg.borderColor}` }}
              >
                {cfg.icon}
              </div>
              <div>
                <h4 className={`text-sm font-bold tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {isCEO ? (pool.display_name || cfg.label) : (pool.display_name_public || cfg.labelPublic)}
                </h4>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {cfg.defaultPct}% {pt === 'DELIVERY' ? 'งบส่ง Grab + ค่าส่ง' : 'ของรายได้สุทธิ'}
                </p>
              </div>
            </div>

            {pt === 'PROFIT' ? (
              <span title="กองทุนกำไรสุทธิ & ปันผล (CEO)" className="px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-700 border border-pink-500/20 text-[10px] font-bold">
                19% CEO
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bgColor, color: cfg.color }}>
                {pt}
              </span>
            )}
          </div>

          {/* Balance display */}
          <div className="my-3">
            <p className="text-xs uppercase font-bold text-slate-800 dark:text-slate-200 tracking-wider mb-0.5">ยอดเงินคงเหลือ</p>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">฿</span>
              <span className="text-2xl lg:text-3xl font-extrabold tracking-tight font-mono" style={{ color: cfg.color }}>
                {pool.current_balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Month In/Out Breakdown */}
          <div className={`p-2.5 rounded-2xl border text-xs grid grid-cols-2 gap-2 mb-3 ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                <TrendingUp size={12} /> รับเดือนนี้
              </span>
              <p className={`font-mono font-bold text-xs mt-0.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                +฿{monthIn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-rose-700 dark:text-rose-400 font-bold flex items-center gap-0.5">
                <TrendingDown size={12} /> จ่ายเดือนนี้
              </span>
              <p className={`font-mono font-bold text-xs mt-0.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                -฿{monthOut.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Target progress if set */}
          {pool.target_amount > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1"><Target size={12} /> เป้า ฿{pool.target_amount.toLocaleString()}</span>
                <span className={targetPct >= 100 ? 'text-emerald-600 font-bold' : 'font-bold'}>{targetPct.toFixed(0)}%</span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${targetPct}%`, backgroundColor: cfg.color }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Adjustment Tool */}
        {!isLocked && (
          <div className={`pt-2.5 mt-2 border-t flex items-center gap-1.5 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <input
              type="number"
              placeholder="เงินจริง..."
              value={actualValues[pool.id] || ''}
              onChange={e => setActualValues(prev => ({ ...prev, [pool.id]: e.target.value }))}
              className={`flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-xl border outline-none font-mono ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500'
              }`}
            />
            <button
              onClick={() => {
                const actual = parseFloat(actualValues[pool.id]);
                if (!isNaN(actual)) handleAdjust(pool, actual);
              }}
              disabled={!actualValues[pool.id] || parseFloat(actualValues[pool.id]) === pool.current_balance}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                !actualValues[pool.id] || parseFloat(actualValues[pool.id]) === pool.current_balance
                  ? 'opacity-40 cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20 active:scale-95'
              }`}
              title="บันทึกปรับยอดให้ตรงธนาคาร"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Zone 1: Direct Kitchen Costs (64%) */}
      <div>
        <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
          <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800 shadow-xs">
            <ChefHat size={16} />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900">
            1. ต้นทุนตรงการผลิตอาหาร (Direct Production — 64%)
          </h3>
          <span className="text-xs px-3 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
            วัตถุดิบ 40% + บิล/ถุง 10% + ค่าแรง 14%
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {productionPools.map(renderCard)}
        </div>
      </div>

      {/* Zone 2: Operations & Growth (17%) */}
      <div>
        <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
          <div className="p-1.5 rounded-xl bg-sky-100 text-sky-800 shadow-xs">
            <Rocket size={16} />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900">
            2. การดำเนินงานและการเติบโต (Operations & Growth — 17%)
          </h3>
          <span className="text-xs px-3 py-0.5 rounded-full font-bold bg-sky-100 text-sky-900 border border-sky-300 shadow-xs">
            ช่วยส่ง Grab 9% + การตลาด 4% + ซ่อมบำรุง 4%
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {operationsPools.map(renderCard)}
        </div>
      </div>

      {/* Zone 3: Bottom Line & Reserves (19% 🔒) */}
      <div>
        <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
          <div className="p-1.5 rounded-xl bg-rose-100 text-rose-800 shadow-xs">
            <ShieldCheck size={16} />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900">
            3. ผลตอบแทนสุทธิและการเงิน (Bottom Line & Reserves — 19% 🔒)
          </h3>
          <span className="text-xs px-3 py-0.5 rounded-full font-bold bg-rose-100 text-rose-900 border border-rose-300 shadow-xs">
            กำไรสุทธิ 19%
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profitPools.map(renderCard)}
        </div>
      </div>
    </div>
  );
};
