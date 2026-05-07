import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts';
import type { FundTransaction, RevenueBucket } from '../types';
import dayjs from 'dayjs';

interface Props {
  transactions: FundTransaction[];
  buckets: RevenueBucket[];
  isDarkMode: boolean;
}

export const FinanceCharts: React.FC<Props> = ({ transactions, buckets, isDarkMode }) => {
  // 1. Prepare Daily Trend Data (Last 30 days)
  const last30Days = Array.from({ length: 30 }).map((_, i) => {
    const date = dayjs().subtract(29 - i, 'day').format('YYYY-MM-DD');
    const income = buckets
      .filter(b => dayjs(b.created_at).format('YYYY-MM-DD') === date)
      .reduce((sum, b) => sum + b.gross_amount, 0);
    const expense = transactions
      .filter(t => t.direction === 'OUT' && dayjs(t.created_at).format('YYYY-MM-DD') === date)
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      date: dayjs(date).format('DD MMM'),
      income,
      expense
    };
  });

  // 2. Prepare Expense by Category Data
  const expenseByCategory = transactions
    .filter(t => t.direction === 'OUT')
    .reduce((acc: any, t) => {
      const cat = t.category || 'อื่นๆ';
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {});

  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({
    name,
    value: Number(value)
  })).sort((a, b) => b.value - a.value);

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

  const themeColors = {
    text: isDarkMode ? '#94a3b8' : '#64748b',
    grid: isDarkMode ? '#334155' : '#e2e8f0',
    tooltipBg: isDarkMode ? '#1e293b' : '#ffffff',
    tooltipBorder: isDarkMode ? '#334155' : '#e2e8f0',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Cash Flow Trend */}
      <div className={`lg:col-span-2 rounded-2xl border p-5 transition-all ${
        isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h3 className={`text-sm font-bold mb-6 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          📈 แนวโน้มกระแสเงินสด (30 วันล่าสุด)
        </h3>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last30Days}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke={themeColors.text} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                stroke={themeColors.text} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `฿${value.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: themeColors.tooltipBg, 
                  borderColor: themeColors.tooltipBorder,
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="income" 
                name="รายรับ"
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorIncome)" 
              />
              <Area 
                type="monotone" 
                dataKey="expense" 
                name="รายจ่าย"
                stroke="#ef4444" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorExpense)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expense by Category */}
      <div className={`rounded-2xl border p-5 transition-all ${
        isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h3 className={`text-sm font-bold mb-6 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
          🍕 สัดส่วนรายจ่ายรายหมวด
        </h3>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => `฿${Number(value).toLocaleString()}`}
                contentStyle={{ 
                  backgroundColor: themeColors.tooltipBg, 
                  borderColor: themeColors.tooltipBorder,
                  borderRadius: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
           {pieData.slice(0, 4).map((item, index) => (
             <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                   <span className="text-slate-500 truncate max-w-[80px]">{item.name}</span>
                </div>
                <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>฿{item.value.toLocaleString()}</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
