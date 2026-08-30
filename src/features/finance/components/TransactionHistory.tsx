import React, { useState } from 'react';
import { POOL_CONFIG } from '../types';
import type { FundTransaction, PoolType } from '../types';
import dayjs from 'dayjs';
import { TrendingUp, TrendingDown, Search, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

interface Props {
  transactions: FundTransaction[];
  buckets?: any[];
  isCEO: boolean;
  selectedMonth: string;
  isDarkMode?: boolean;
  onRefresh?: () => void;
}

export const TransactionHistory: React.FC<Props> = ({ 
  transactions, 
  buckets = [], 
  isCEO, 
  selectedMonth, 
  isDarkMode = false, 
  onRefresh 
}) => {
  const [filterPool, setFilterPool] = useState<PoolType | 'ALL'>('ALL');
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const monthTx = transactions.filter(t => {
    const matchMonth = dayjs(t.created_at).format('YYYY-MM') === selectedMonth;
    const matchPool = filterPool === 'ALL' || t.pool_type === filterPool;
    const matchDir = filterDirection === 'ALL' || t.direction === filterDirection;
    const matchDate = !filterDate || dayjs(t.created_at).format('YYYY-MM-DD') === filterDate;
    const matchSearch = !searchQuery || 
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.amount.toString().includes(searchQuery) ||
      dayjs(t.created_at).format('DD/MM').includes(searchQuery);
    const matchVisibility = isCEO || !t.is_personal;
    return matchMonth && matchPool && matchDir && matchDate && matchSearch && matchVisibility;
  });

  const monthBuckets = buckets.filter(b => {
    const matchMonth = dayjs(b.created_at).format('YYYY-MM') === selectedMonth;
    const matchDate = !filterDate || dayjs(b.created_at).format('YYYY-MM-DD') === filterDate;
    const matchSearch = !searchQuery || 
      b.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.gross_amount.toString().includes(searchQuery);
    return matchMonth && matchDate && matchSearch;
  });

  const totalIn = monthTx.filter(t => t.direction === 'IN').reduce((s, t) => s + t.amount, 0);
  const totalOut = monthTx.filter(t => t.direction === 'OUT').reduce((s, t) => s + t.amount, 0);

  const handleDelete = async (tx: FundTransaction) => {
    if (!isCEO) return toast.error('เฉพาะผู้ดูแลระบบเท่านั้นที่ลบรายการได้');

    const result = await Swal.fire({
      title: 'ยืนยันการลบรายการ?',
      text: tx.category === 'Auto Split' 
        ? 'รายการนี้เป็นการแยกเงินอัตโนมัติ การลบอาจทำให้ยอดรวมบิลไม่ตรง ต้องการดำเนินการต่อหรือไม่?'
        : 'คุณต้องการลบรายการนี้ใช่หรือไม่? ระบบจะปรับยอดเงินในกองทุนคืนให้โดยอัตโนมัติ',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ใช่, ลบรายการนี้',
      cancelButtonText: 'ยกเลิก',
      background: isDarkMode ? '#1e293b' : '#fff',
      color: isDarkMode ? '#f1f5f9' : '#1e293b'
    });

    if (result.isConfirmed) {
      try {
        const { data: pool } = await supabase.from('erp_fund_pools').select('*').eq('pool_type', tx.pool_type).single();
        if (pool) {
          const isIn = tx.direction === 'IN';
          await supabase.from('erp_fund_pools').update({
            current_balance: isIn ? pool.current_balance - tx.amount : pool.current_balance + tx.amount,
            [isIn ? 'total_in' : 'total_out']: isIn ? pool.total_in - tx.amount : pool.total_out - tx.amount
          }).eq('pool_type', tx.pool_type);
        }
        await supabase.from('erp_fund_transactions').delete().eq('id', tx.id);
        toast.success('ลบรายการเรียบร้อย');
        if (onRefresh) onRefresh();
      } catch (err: any) {
        toast.error('เกิดข้อผิดพลาด: ' + err.message);
      }
    }
  };

  const handleRepairSplit = async (bucket: any) => {
    const result = await Swal.fire({
      title: 'ต้องการแยกเงินบิลนี้ใหม่?',
      text: `บิลยอด ฿${bucket.gross_amount.toLocaleString()} จะถูกแยกเข้ากองทุนตามสูตร`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      background: isDarkMode ? '#1e293b' : '#fff',
      color: isDarkMode ? '#f1f5f9' : '#1e293b'
    });

    if (result.isConfirmed) {
      const toastId = toast.loading('กำลังแยกเงิน...');
      try {
        const mat = +(bucket.net_amount * bucket.material_pct / 100).toFixed(2);
        const lab = +(bucket.net_amount * bucket.labor_pct / 100).toFixed(2);
        const ops = +(bucket.net_amount * bucket.ops_pct / 100).toFixed(2);
        const pro = +(bucket.net_amount - mat - lab - ops).toFixed(2);

        const splits: any[] = [
          { pt: 'MATERIAL', amt: mat }, { pt: 'LABOR', amt: lab }, { pt: 'OPS', amt: ops }, { pt: 'PROFIT', amt: pro }
        ];
        if (bucket.delivery_fee > 0) splits.push({ pt: 'DELIVERY', amt: bucket.delivery_fee });

        await supabase.from('erp_fund_transactions').insert(splits.map(s => ({
          pool_type: s.pt, direction: 'IN', amount: s.amt, category: 'Auto Split',
          description: `แยกเงินบิล: ${bucket.description || bucket.source_type}`,
          source_type: 'SPLIT', source_id: bucket.id, created_at: bucket.created_at
        })));

        for (const s of splits) {
          const { data: p } = await supabase.from('erp_fund_pools').select('*').eq('pool_type', s.pt).single();
          if (p) await supabase.from('erp_fund_pools').update({ 
            current_balance: p.current_balance + s.amt, total_in: p.total_in + s.amt 
          }).eq('pool_type', s.pt);
        }

        toast.success('แยกเงินเรียบร้อย', { id: toastId });
        if (onRefresh) onRefresh();
      } catch (err: any) {
        toast.error('ล้มเหลว: ' + err.message, { id: toastId });
      }
    }
  };

  const handleDeleteBucket = async (bucket: any) => {
    const result = await Swal.fire({
      title: 'ลบบิลรายรับนี้?',
      text: 'บิลและรายการที่เกี่ยวข้องจะถูกลบทั้งหมด',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      confirmButtonColor: '#ef4444',
      background: isDarkMode ? '#1e293b' : '#fff',
      color: isDarkMode ? '#f1f5f9' : '#1e293b'
    });

    if (result.isConfirmed) {
      const toastId = toast.loading('กำลังลบ...');
      try {
        const { data: related } = await supabase.from('erp_fund_transactions').select('*').eq('source_id', bucket.id);
        if (related) {
          for (const tx of related) {
            const { data: p } = await supabase.from('erp_fund_pools').select('*').eq('pool_type', tx.pool_type).single();
            if (p) {
              const isIn = tx.direction === 'IN';
              await supabase.from('erp_fund_pools').update({
                current_balance: isIn ? p.current_balance - tx.amount : p.current_balance + tx.amount,
                [isIn ? 'total_in' : 'total_out']: isIn ? p.total_in - tx.amount : p.total_out - tx.amount
              }).eq('pool_type', tx.pool_type);
            }
          }
          await supabase.from('erp_fund_transactions').delete().eq('source_id', bucket.id);
        }
        await supabase.from('erp_revenue_buckets').delete().eq('id', bucket.id);
        toast.success('ลบบิลสำเร็จ', { id: toastId });
        if (onRefresh) onRefresh();
      } catch (err: any) {
        toast.error('ล้มเหลว: ' + err.message, { id: toastId });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 💡 Helper Guide Banner */}
      <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
        isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <RefreshCw size={14} className="text-emerald-600 shrink-0" />
          <span>ประวัติธุรกรรมและการปรับปรุงสมดุลกองทุน</span>
        </div>
        <p className="text-slate-600 text-[11px] leading-relaxed">
          • แสดงบันทึกเงินเข้า (IN) จากการแบ่งรายรับ และเงินออก (OUT) จากการตัดค่าใช้จ่าย<br />
          • ผู้ดูแลระบบ (ADMIN) สามารถกดลบรายการที่บันทึกผิดพลาดได้ ระบบจะปรับยอดเงินคืนเข้ากองทุนเดิมให้โดยอัตโนมัติ
        </p>
      </div>

      {/* Filters Area */}
      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex flex-wrap gap-4 items-center">
           <div className={`flex gap-1 p-1 rounded-xl ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
              <button onClick={() => setFilterPool('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterPool === 'ALL' ? (isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500'}`}>ทั้งหมด</button>
              {(['MATERIAL', 'LABOR', 'OPS', 'PROFIT', 'DELIVERY'] as PoolType[]).map(pt => (
                <button key={pt} onClick={() => setFilterPool(pt)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterPool === pt ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}>
                  {POOL_CONFIG[pt].icon}
                </button>
              ))}
           </div>

           <div className={`flex gap-1 p-1 rounded-xl ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
              <button onClick={() => setFilterDirection('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filterDirection === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>ทั้งหมด</button>
              <button onClick={() => setFilterDirection('IN')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filterDirection === 'IN' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}>เข้า</button>
              <button onClick={() => setFilterDirection('OUT')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filterDirection === 'OUT' ? 'bg-red-500 text-white' : 'text-slate-500'}`}>ออก</button>
           </div>

           <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className={`p-2 rounded-xl text-xs border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
           
           <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ค้นหารายการ..." className={`w-full pl-9 p-2 rounded-xl text-xs border outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-500'}`} />
           </div>
        </div>
        
        <div className="flex gap-4 mt-4 pt-4 border-t border-slate-700/20">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{monthTx.length} รายการ</span>
           <span className="text-[10px] font-bold text-emerald-500 uppercase">เข้า ฿{totalIn.toLocaleString()}</span>
           <span className="text-[10px] font-bold text-red-500 uppercase">ออก ฿{totalOut.toLocaleString()}</span>
           <span className="text-[10px] font-bold text-cyan-500 uppercase ml-auto">สุทธิ ฿{(totalIn - totalOut).toLocaleString()}</span>
        </div>
      </div>

      {/* Bills Section */}
      {monthBuckets.length > 0 && (filterPool === 'ALL' || filterDirection === 'IN') && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <AlertCircle size={14} /> รายการบิลรายรับ ({monthBuckets.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monthBuckets.map(b => {
              const hasTx = transactions.some(t => t.source_id === b.id);
              return (
                <div key={b.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                   <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold">{b.description || `บิล ${b.source_type}`}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{dayjs(b.created_at).format('DD MMM YYYY HH:mm')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-500 underline decoration-emerald-500/30 underline-offset-4">฿{b.gross_amount.toLocaleString()}</p>
                        {!hasTx && <span className="text-[8px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full mt-1 inline-block animate-pulse">ยังไม่ได้แยกเงิน</span>}
                      </div>
                   </div>
                   <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/10">
                      <span className="text-[10px] font-bold text-slate-500">Net: ฿{b.net_amount.toLocaleString()}</span>
                      <div className="flex gap-2">
                        {!hasTx && isCEO && (
                          <button 
                            onClick={() => handleRepairSplit(b)} 
                            className="px-3 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-bold shadow-lg shadow-amber-500/20 hover:scale-105 transition-all flex items-center gap-1"
                          >
                            <RefreshCw size={10} /> แยกเงิน
                          </button>
                        )}
                        {isCEO && (
                          <button 
                            onClick={() => handleDeleteBucket(b)} 
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transactions Section */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
           📊 รายการเคลื่อนไหวเงินในกองทุน
        </h4>
        <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
           {monthTx.length === 0 ? (
             <div className="p-12 text-center text-slate-500 text-xs font-bold uppercase tracking-widest opacity-30">ไม่มีรายการข้อมูล</div>
           ) : (
             <div className="divide-y divide-slate-700/10">
                {monthTx.map(t => {
                  const cfg = POOL_CONFIG[t.pool_type as PoolType];
                  const isIn = t.direction === 'IN';
                  return (
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-500/5 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isIn ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                             {isIn ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                          </div>
                          <div>
                             <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">{t.category || 'ทั่วไป'}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md font-black" style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>{cfg.icon} {isCEO ? cfg.label : cfg.labelPublic}</span>
                             </div>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-slate-500">{dayjs(t.created_at).format(dayjs(t.created_at).format('HH:mm') === '00:00' ? 'DD MMM YYYY' : 'DD/MM/YY HH:mm')}</span>
                                <span className="text-[10px] text-slate-400">|</span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{t.description || 'ไม่มีรายละเอียด'}</span>
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <span className={`text-sm font-black ${isIn ? 'text-emerald-500' : 'text-red-500'}`}>{isIn ? '+' : '-'}฿{t.amount.toLocaleString()}</span>
                          {isCEO && <button onClick={() => handleDelete(t)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>}
                       </div>
                    </div>
                  );
                })}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
