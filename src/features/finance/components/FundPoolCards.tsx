import React from 'react';
import { POOL_CONFIG } from '../types';
import type { FundPool, FundTransaction, PoolType } from '../types';
import { Lock, TrendingUp, TrendingDown, Target, RefreshCw } from 'lucide-react';
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      {pools.map(pool => {
        const pt = pool.pool_type as PoolType;
        const cfg = POOL_CONFIG[pt] || {
          label: pool.display_name,
          labelPublic: pool.display_name_public,
          color: '#10b981',
          bgColor: 'rgba(16,185,129,0.08)',
          borderColor: 'rgba(16,185,129,0.25)',
          icon: '💰',
          defaultPct: 0,
          description: ''
        };
        const isLocked = pt === 'PROFIT';
        const monthIn = transactions.filter(t => t.pool_type === pt && t.direction === 'IN').reduce((s, t) => s + t.amount, 0);
        const monthOut = transactions.filter(t => t.pool_type === pt && t.direction === 'OUT').reduce((s, t) => s + t.amount, 0);
        const targetPct = pool.target_amount > 0 ? Math.min((pool.current_balance / pool.target_amount) * 100, 100) : 0;
        const isLowBalance = pool.target_amount > 0 && pool.current_balance < (pool.target_amount * 0.2);

        return (
          <div
            key={pool.id}
            className={`relative rounded-3xl border p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between ${
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
                    <h4 className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                      {isCEO ? (pool.display_name === 'ค่าดำเนินการ' ? 'ค่าบิล & Ops' : pool.display_name) : pool.display_name_public}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400">
                      {cfg.defaultPct}% {pt === 'DELIVERY' ? 'ของค่าส่ง' : 'ของรายได้สุทธิ'}
                    </p>
                  </div>
                </div>

                {isLocked ? (
                  <span title="กองทุนสำรองธุรกิจ (CEO Locked)" className="p-1.5 rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20 text-xs">
                    <Lock size={13} />
                  </span>
                ) : (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bgColor, color: cfg.color }}>
                    {pt}
                  </span>
                )}
              </div>

              {/* Balance display */}
              <div className="my-3">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">ยอดเงินคงเหลือ</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-slate-400">฿</span>
                  <span className="text-2xl lg:text-3xl font-black tracking-tight font-mono" style={{ color: cfg.color }}>
                    {pool.current_balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Month In/Out Breakdown */}
              <div className={`p-2.5 rounded-2xl border text-xs grid grid-cols-2 gap-2 mb-3 ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-100'
              }`}>
                <div>
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                    <TrendingUp size={10} /> รับเดือนนี้
                  </span>
                  <p className={`font-mono font-bold text-[11px] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    +฿{monthIn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-rose-500 font-bold flex items-center gap-0.5">
                    <TrendingDown size={10} /> จ่ายเดือนนี้
                  </span>
                  <p className={`font-mono font-bold text-[11px] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    -฿{monthOut.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              {/* Target progress if set */}
              {pool.target_amount > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                    <span className="flex items-center gap-1"><Target size={10} /> เป้า ฿{pool.target_amount.toLocaleString()}</span>
                    <span className={targetPct >= 100 ? 'text-emerald-500' : ''}>{targetPct.toFixed(0)}%</span>
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
      })}
    </div>
  );
};
