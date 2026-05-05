import React, { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabase';
import dayjs from 'dayjs';
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export const FinanceDashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_financial_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      toast.error('ไม่สามารถโหลดข้อมูลบัญชีได้: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return toast.error('กรุณากรอกจำนวนเงินและหมวดหมู่');

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('erp_financial_transactions').insert({
        type,
        amount: Number(amount),
        category,
        notes,
        created_at: dayjs(selectedDate).toISOString(),
      });

      if (error) throw error;
      
      toast.success('บันทึกข้อมูลเรียบร้อยแล้ว');
      setAmount('');
      setCategory('');
      setNotes('');
      fetchTransactions();
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันการลบรายการนี้?')) return;
    try {
      const { error } = await supabase.from('erp_financial_transactions').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบรายการเรียบร้อยแล้ว');
      fetchTransactions();
    } catch (err: any) {
      toast.error('ลบไม่สำเร็จ: ' + err.message);
    }
  };

  const todayIncome = transactions.filter(t => t.type === 'INCOME' && dayjs(t.created_at).isSame(dayjs(), 'day')).reduce((acc, t) => acc + Number(t.amount), 0);
  const todayExpense = transactions.filter(t => t.type === 'EXPENSE' && dayjs(t.created_at).isSame(dayjs(), 'day')).reduce((acc, t) => acc + Number(t.amount), 0);
  const monthIncome = transactions.filter(t => t.type === 'INCOME' && dayjs(t.created_at).isSame(dayjs(), 'month')).reduce((acc, t) => acc + Number(t.amount), 0);
  const monthExpense = transactions.filter(t => t.type === 'EXPENSE' && dayjs(t.created_at).isSame(dayjs(), 'month')).reduce((acc, t) => acc + Number(t.amount), 0);

  return (
    <div className="flex-1 p-6 md:p-8 bg-slate-50 overflow-y-auto h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal text-slate-800 flex items-center gap-2">
            <Wallet className="text-emerald-500" /> ระบบบัญชีและการเงิน
          </h1>
          <p className="text-sm font-normal text-slate-500 mt-1">บันทึกรายรับ-รายจ่าย และสรุปยอด</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-normal text-slate-400 uppercase">รายรับวันนี้</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">฿{todayIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-normal text-slate-400 uppercase">รายจ่ายวันนี้</p>
          <p className="text-2xl font-bold text-red-500 mt-1">฿{todayExpense.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-normal text-slate-400 uppercase">รายรับเดือนนี้</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">฿{monthIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-normal text-slate-400 uppercase">รายจ่ายเดือนนี้</p>
          <p className="text-2xl font-bold text-red-500 mt-1">฿{monthExpense.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-fit">
          <h2 className="text-lg font-normal text-slate-800 mb-6 flex items-center gap-2">
            <Plus size={20} className="text-slate-400" /> เพิ่มรายการใหม่
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType('INCOME')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                รายรับ
              </button>
              <button
                type="button"
                onClick={() => setType('EXPENSE')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'EXPENSE' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                รายจ่าย
              </button>
            </div>

            <div>
              <label className="block text-xs font-normal text-slate-500 mb-1">วันที่</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-slate-500 mb-1">จำนวนเงิน (บาท)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 text-lg font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-slate-500 mb-1">หมวดหมู่</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={type === 'INCOME' ? 'เช่น ค่าอาหาร, ค่าส่ง' : 'เช่น ค่าวัตถุดิบ, ค่าแก๊ส'}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-slate-500 mb-1">รายละเอียดเพิ่มเติม</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="โน้ตเพิ่มเติม (ไม่บังคับ)..."
                rows={2}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-xl text-white font-normal transition-all shadow-lg mt-4 ${type === 'INCOME' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'} disabled:opacity-50`}
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
            </button>
          </form>
        </div>

        {/* History */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-normal text-slate-800 flex items-center gap-2">
              <Calendar size={20} className="text-slate-400" /> ประวัติรายการล่าสุด
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center py-10 opacity-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                <Wallet size={48} className="mb-4" />
                <p>ยังไม่มีรายการบันทึกบัญชี</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-300 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                        {t.type === 'INCOME' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{t.category}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{dayjs(t.created_at).locale('th').format('DD MMM YYYY')}</span>
                          {t.notes && <span className="max-w-[150px] truncate border-l border-slate-200 pl-2">📝 {t.notes}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className={`text-lg font-bold ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {t.type === 'INCOME' ? '+' : '-'}฿{Number(t.amount).toLocaleString()}
                      </p>
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
