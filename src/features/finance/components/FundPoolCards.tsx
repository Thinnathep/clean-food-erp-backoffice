import React from 'react';
import { POOL_CONFIG } from '../types';
import type { FundPool, FundTransaction, PoolType } from '../types';
import { Lock, TrendingUp, TrendingDown, Target } from 'lucide-react';

interface Props {
  pools: FundPool[];
  isCEO: boolean;
  transactions: FundTransaction[];
  isDarkMode?: boolean;
}

export const FundPoolCards: React.FC<Props> = ({ pools, isCEO, transactions, isDarkMode = false }) => {
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
            {/* Lock badge for profit */}
            {isLocked && (
              <div className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Lock size={14} className="text-red-400" />
              </div>
            )}

            {/* Header */}
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

            {/* Balance */}
            <p className="text-2xl font-bold mb-3" style={{ color: cfg.color }}>
              ฿{pool.current_balance.toLocaleString()}
            </p>

            {/* In/Out */}
            <div className="flex gap-3 text-xs mb-3">
              <span className="flex items-center gap-1 text-emerald-400/70">
                <TrendingUp size={12} /> +฿{monthIn.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-red-400/70">
                <TrendingDown size={12} /> -฿{monthOut.toLocaleString()}
              </span>
            </div>

            {/* Target progress (for OPS pool) */}
            {pool.target_amount > 0 && (
              <div>
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
          </div>
        );
      })}
    </div>
  );
};
