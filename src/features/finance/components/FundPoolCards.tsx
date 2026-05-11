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
      text: `ระบบจะบันทึกรายการปรับสมดุล ${diff > 0 ? '+' : ''}฿${diff.toLocaleString()} เพื่อให้ยอดตรงกับเงินจริง`,
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
          description: `ปรับยอดให้ตรงธนาคาร (Diff: ${diff})`,
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {pools.map(pool => {
        const pt = pool.pool_type as PoolType;
        const cfg = POOL_CONFIG[pt];
        const isLocked = pt === 'PROFIT';
        const monthIn = transactions.filter(t => t.pool_type === pt && t.direction === 'IN').reduce((s, t) => s + t.amount, 0);
        const monthOut = transactions.filter(t => t.pool_type === pt && t.direction === 'OUT').reduce((s, t) => s + t.amount, 0);
        const targetPct = pool.target_amount > 0 ? Math.min((pool.current_balance / pool.target_amount) * 100, 100) : 0;

        return (
          <div
            key={pool.id}
            className="relative rounded-2xl border p-5 transition-all hover:scale-[1.02] group"
            style={{
              backgroundColor: isDarkMode ? `${cfg.color}08` : '#ffffff',
              borderColor: isDarkMode ? `${cfg.color}25` : `${cfg.color}30`,
            }}
          >
            {isLocked && (
              <div className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Lock size={14} className="text-red-400" />
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{cfg.icon}</span>
              <div>
                <p className={`text-sm font-bold transition-colors ${isDarkMode ? 'text-slate-200' : 'text-slate-950'}`}>
                  {isCEO ? pool.display_name : pool.display_name_public}
                </p>
                {isCEO && pool.display_name !== pool.display_name_public && (
                  <p className={`text-[10px] transition-colors ${isDarkMode ? 'text-slate-600' : 'text-slate-500'}`}>
                    ({pool.display_name_public})
                  </p>
                )}
              </div>
            </div>

            <p className="text-2xl font-bold mb-3" style={{ color: cfg.color }}>
              ฿{pool.current_balance.toLocaleString()}
            </p>

            <div className="flex gap-3 text-xs mb-4">
              <span className="flex items-center gap-1 text-emerald-400/70">
                <TrendingUp size={12} /> +฿{monthIn.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-red-400/70">
                <TrendingDown size={12} /> -฿{monthOut.toLocaleString()}
              </span>
            </div>

            {/* Target progress (for OPS pool) */}
            {pool.target_amount > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span className="flex items-center gap-1"><Target size={10} /> เป้า ฿{pool.target_amount.toLocaleString()}</span>
                  <span>{targetPct.toFixed(0)}%</span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${targetPct}%`, backgroundColor: cfg.color }}
                  />
                </div>
              </div>
            )}

            {/* Adjustment UI */}
            {!isLocked && (
              <div className={`pt-3 mt-3 border-t flex items-center gap-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <input
                  type="number"
                  placeholder="ยอดจริง"
                  value={actualValues[pool.id] || ''}
                  onChange={e => setActualValues(prev => ({ ...prev, [pool.id]: e.target.value }))}
                  className={`flex-1 min-w-0 text-xs p-1.5 rounded-lg border outline-none ${
                    isDarkMode ? 'bg-slate-900/50 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200'
                  }`}
                />
                <button
                  onClick={() => {
                    const actual = parseFloat(actualValues[pool.id]);
                    if (!isNaN(actual)) handleAdjust(pool, actual);
                  }}
                  disabled={!actualValues[pool.id] || parseFloat(actualValues[pool.id]) === pool.current_balance}
                  className={`p-1.5 rounded-lg transition-all ${
                    !actualValues[pool.id] || parseFloat(actualValues[pool.id]) === pool.current_balance
                      ? 'opacity-50 cursor-not-allowed bg-slate-200 text-slate-400'
                      : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                  }`}
                  title="ปรับยอดเงินให้ตรง"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
