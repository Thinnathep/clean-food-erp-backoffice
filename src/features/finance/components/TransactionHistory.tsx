import React, { useState } from 'react';
import { POOL_CONFIG } from '../types';
import type { FundTransaction, PoolType } from '../types';
import dayjs from 'dayjs';
import { TrendingUp, TrendingDown, Filter, Search } from 'lucide-react';

interface Props {
  transactions: FundTransaction[];
  isCEO: boolean;
  selectedMonth: string;
  isDarkMode?: boolean;
}

export const TransactionHistory: React.FC<Props> = ({ transactions, isCEO, selectedMonth, isDarkMode = false }) => {
  const [filterPool, setFilterPool] = useState<PoolType | 'ALL'>('ALL');
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const monthTx = transactions.filter(t => {
    const matchMonth = dayjs(t.created_at).format('YYYY-MM') === selectedMonth;
    const matchPool = filterPool === 'ALL' || t.pool_type === filterPool;
    const matchDir = filterDirection === 'ALL' || t.direction === filterDirection;
    const matchSearch = !searchQuery || 
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchVisibility = isCEO || !t.is_personal;
    return matchMonth && matchPool && matchDir && matchSearch && matchVisibility;
  });

  const totalIn = monthTx.filter(t => t.direction === 'IN').reduce((s, t) => s + t.amount, 0);
  const totalOut = monthTx.filter(t => t.direction === 'OUT').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className={`rounded-2xl border transition-all p-4 ${
        isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Filter size={14} />
            <span>กรอง:</span>
          </div>

          {/* Pool filter */}
          <div className={`flex gap-1 rounded-lg p-1 ${isDarkMode ? 'bg-slate-900/40' : 'bg-slate-100'}`}>
            <button onClick={() => setFilterPool('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filterPool === 'ALL' 
                  ? isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}>ทั้งหมด</button>
            {(['MATERIAL', 'LABOR', 'OPS', 'PROFIT'] as PoolType[]).map(pt => {
              const cfg = POOL_CONFIG[pt];
              if (!isCEO && (pt === 'LABOR' || pt === 'PROFIT')) return null;
              return (
                <button key={pt} onClick={() => setFilterPool(pt)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filterPool === pt ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  style={filterPool === pt ? { backgroundColor: `${cfg.color}30`, color: cfg.color } : undefined}>
                  {cfg.icon}
                </button>
              );
            })}
          </div>

          {/* Direction filter */}
          <div className={`flex gap-1 rounded-lg p-1 transition-all ${isDarkMode ? 'bg-slate-900/40' : 'bg-slate-200'}`}>
            <button onClick={() => setFilterDirection('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filterDirection === 'ALL' 
                  ? isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm' 
                  : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
              }`}>ทั้งหมด</button>
            <button onClick={() => setFilterDirection('IN')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filterDirection === 'IN' 
                  ? isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500 text-white' 
                  : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
              }`}>เข้า</button>
            <button onClick={() => setFilterDirection('OUT')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filterDirection === 'OUT' 
                  ? isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-500 text-white' 
                  : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'
              }`}>ออก</button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหารายการ..."
              className={`w-full pl-9 pr-3 py-2 border rounded-xl text-sm outline-none transition-all ${
                isDarkMode 
                  ? 'bg-slate-900/40 border-slate-700/50 text-slate-300 focus:border-emerald-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-600 focus:border-emerald-500'
              }`} />
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-6 mt-3 pt-3 border-t border-slate-700/30">
          <span className="text-xs text-slate-500">{monthTx.length} รายการ</span>
          <span className="text-xs text-emerald-400/70 flex items-center gap-1">
            <TrendingUp size={12} /> เข้า ฿{totalIn.toLocaleString()}
          </span>
          <span className="text-xs text-red-400/70 flex items-center gap-1">
            <TrendingDown size={12} /> ออก ฿{totalOut.toLocaleString()}
          </span>
          <span className={`text-xs font-bold ${totalIn - totalOut >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
            สุทธิ ฿{(totalIn - totalOut).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Transactions List */}
      <div className={`rounded-2xl border overflow-hidden transition-all ${
        isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {monthTx.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <TrendingUp size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">ไม่มีรายการในเดือนนี้</p>
          </div>
        ) : (
          <div className={`divide-y ${isDarkMode ? 'divide-slate-700/30' : 'divide-slate-100'}`}>
            {monthTx.map(t => {
              const pt = t.pool_type as PoolType;
              const cfg = POOL_CONFIG[pt];
              const isIn = t.direction === 'IN';
              return (
                <div key={t.id} className={`flex items-center justify-between p-4 transition-all ${
                  isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border`}
                      style={{
                        backgroundColor: isIn ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        borderColor: isIn ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                      }}>
                      {isIn ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-red-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{t.category || t.description || '—'}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
                          {cfg.icon} {isCEO ? cfg.label : cfg.labelPublic}
                        </span>
                        {t.is_personal && isCEO && (
                          <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md">🔒 ส่วนตัว</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {dayjs(t.created_at).format('DD/MM/YY HH:mm')}
                        {t.description && t.description !== t.category && ` · ${t.description}`}
                      </p>
                      {isCEO && t.private_note && (
                        <p className="text-[10px] text-red-400/60 mt-0.5">🔑 {t.private_note}</p>
                      )}
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${isIn ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isIn ? '+' : '-'}฿{t.amount.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
