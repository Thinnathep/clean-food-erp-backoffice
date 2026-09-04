import React, { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabase';
import { getPoolConfig } from '../types';
import type { PoolType, FundPool, ExpenseCategory } from '../types';
import { fetchInventoryItems, recordStockIn } from '../../inventory/api';
import type { InventoryItem } from '../../../types';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import { 
  TrendingDown, X, 
  Calculator, Box, 
  Calendar, PlusCircle, 
  AlertCircle, History as HistoryIcon,
  Loader2, RefreshCw, Store
} from 'lucide-react';

interface Props {
  onSaved: () => void;
  isDarkMode?: boolean;
}

export const ExpenseRecorder: React.FC<Props> = ({ onSaved, isDarkMode = false }) => {
  const [pools, setPools] = useState<FundPool[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolType | ''>('');
  const [selectedCat, setSelectedCat] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [continuousEntry, setContinuousEntry] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [sessionEntries, setSessionEntries] = useState<any[]>([]);

  // Inventory Integration State
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isStockIn, setIsStockIn] = useState(false);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState('');
  const [stockInQty, setStockInQty] = useState('');

  // Reconcile State
  const [poolActuals, setPoolActuals] = useState<Record<string, string>>({
    MATERIAL: '',
    LABOR: '',
    OPS: '',
    PROFIT: '',
    DELIVERY: ''
  });
  const [showReconcile, setShowReconcile] = useState(false);

  useEffect(() => {
    fetchMeta();
    fetchInventory();
  }, []);

  const fetchMeta = async () => {
    const { data: pData } = await supabase.from('erp_fund_pools').select('*').order('sort_order');
    const { data: cData } = await supabase.from('erp_expense_categories').select('*').eq('is_active', true).order('sort_order');
    setPools(pData || []);
    setCategories(cData || []);
  };

  const fetchInventory = async () => {
    try {
      const items = await fetchInventoryItems();
      setInventoryItems(items);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

  const activePoolData = pools.find(p => p.pool_type === selectedPool);
  const filteredCats = categories.filter(c => c.pool_type === selectedPool || !selectedPool);
  const totalCash = pools.reduce((sum, p) => sum + (p.current_balance || 0), 0);

  const handleCategoryChange = (catName: string) => {
    setSelectedCat(catName);
    const cat = categories.find(c => c.name === catName);
    if (cat && cat.pool_type) {
      setSelectedPool(cat.pool_type as PoolType);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if we have an expense OR adjustments
    const hasExpense = selectedPool && amount && Number(amount) > 0;
    const hasAdjustments = Object.values(poolActuals).some(v => v !== '');
    
    if (!hasExpense && !hasAdjustments) {
      return toast.error('กรุณากรอกจำนวนเงินรายจ่าย หรือยอดเงินสดจริงเพื่อปรับยอด');
    }
    
    // ── Calculate Adjustments ──
    const adjustments: { pool: PoolType; diff: number; label: string }[] = [];
    Object.entries(poolActuals).forEach(([pt, actual]) => {
      if (!actual) return;
      const pool = pools.find(p => p.pool_type === pt);
      const diff = Number(actual) - (pool?.current_balance || 0);
      if (diff !== 0) {
        adjustments.push({ pool: pt as PoolType, diff, label: getPoolConfig(pt as PoolType).label.split('/')[0] });
      }
    });

    // ── Show Summary Modal ──
    const summaryHtml = `
      <div class="text-left space-y-4">
        ${hasExpense ? `
        <div class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
          <p class="text-[10px] font-black text-red-500 uppercase mb-1">รายการรายจ่าย</p>
          <div class="flex justify-between items-center">
            <span class="text-sm font-bold text-slate-400">${selectedCat}</span>
            <span class="text-lg font-black text-red-500">฿${Number(amount).toLocaleString()}</span>
          </div>
          <p class="text-[10px] text-slate-500 mt-1">${description || 'บันทึกรายจ่ายทั่วไป'}</p>
        </div>
        ` : ''}

        ${adjustments.length > 0 ? `
          <div class="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p class="text-[10px] font-black text-blue-500 uppercase mb-2">รายการปรับยอดกองทุน (Reconcile)</p>
            <div class="space-y-2">
              ${adjustments.map(adj => `
                <div class="flex justify-between items-center text-xs">
                  <span class="font-bold text-slate-400">${adj.label}</span>
                  <span class="font-black ${adj.diff > 0 ? 'text-blue-500' : 'text-amber-500'}">
                    ${adj.diff > 0 ? '+' : ''}฿${adj.diff.toLocaleString()}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="pt-2 flex justify-between items-center border-t border-slate-700/10">
          <span class="text-xs font-bold text-slate-500 uppercase">เงินสดรวมหลังบันทึก</span>
          <span class="text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}">
            ฿${(totalCash - Number(amount) + adjustments.reduce((s, a) => s + a.diff, 0)).toLocaleString()}
          </span>
        </div>
      </div>
    `;

    const confirm = await Swal.fire({
      title: 'ยืนยันการบันทึก?',
      html: summaryHtml,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันและบันทึก',
      cancelButtonText: 'แก้ไขข้อมูล',
      background: isDarkMode ? '#1e293b' : '#fff',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      customClass: {
        confirmButton: 'bg-emerald-500 hover:bg-emerald-600',
        cancelButton: 'bg-slate-600 hover:bg-slate-700'
      }
    });

    if (!confirm.isConfirmed) return;

    setIsSubmitting(true);
    try {
      if (hasExpense) {
        const amt = Number(amount);
        
        // 1. Record Main Expense
        const { data: tx, error: txErr } = await supabase.from('erp_fund_transactions').insert({
          pool_type: selectedPool,
          direction: 'OUT',
          amount: amt,
          category: selectedCat,
          description: `${description}${vendor ? ` (จ่ายให้: ${vendor})` : ''}${notes ? ` [หมายเหตุ: ${notes}]` : ''}`,
          source_type: 'EXPENSE',
          receipt_url: receiptUrl,
          created_at: date ? dayjs(date).toISOString() : undefined
        }).select().single();

        if (txErr) throw txErr;

        // 2. Update Expense Pool Balance
        const targetPool = pools.find(p => p.pool_type === selectedPool);
        if (targetPool) {
          await supabase.from('erp_fund_pools').update({ 
            current_balance: (targetPool.current_balance || 0) - amt,
            total_out: (targetPool.total_out || 0) + amt
          }).eq('id', targetPool.id);
        }
        // 3. Inventory Stock In (Optional)
        if (isStockIn && selectedInventoryItemId && stockInQty) {
          const invItem = inventoryItems.find(i => i.id === selectedInventoryItemId);
          if (invItem) {
            const qty = Number(stockInQty);
            const unitCost = amt / qty;
            await recordStockIn({
              inventory_item_id: selectedInventoryItemId,
              qty,
              unit_cost: unitCost,
              received_at: new Date().toISOString(),
              receipt_no: description || 'EXP-' + tx.id.slice(0, 8)
            }, invItem);
            toast.success('รับสินค้าเข้าสต็อกเรียบร้อย');
          }
        }
      }

      // 4. Record & Update Adjustments
      for (const adj of adjustments) {
        // Log Adjustment Transaction
        await supabase.from('erp_fund_transactions').insert({
          pool_type: adj.pool,
          direction: adj.diff > 0 ? 'IN' : 'OUT',
          amount: Math.abs(adj.diff),
          category: 'Adjustment',
          description: `ปรับยอดให้ตรงธนาคาร (ขณะบันทึกรายจ่าย)`,
          source_type: 'MANUAL',
          created_at: date ? dayjs(date).toISOString() : undefined
        });

        // Update Pool Balance
        const pObj = pools.find(p => p.pool_type === adj.pool);
        if (pObj) {
           await supabase.from('erp_fund_pools').update({
             current_balance: pObj.current_balance + adj.diff,
             [adj.diff > 0 ? 'total_in' : 'total_out']: adj.diff > 0 ? (pObj.total_in || 0) + adj.diff : (pObj.total_out || 0) + Math.abs(adj.diff)
           }).eq('id', pObj.id);
        }
      }

      if (hasExpense) {
        setSessionEntries(prev => [{
          id: Date.now(),
          vendorName: vendor,
          amount: Number(amount),
          date: date,
          cat: selectedCat
        }, ...prev].slice(0, 5));
      }

      toast.success('บันทึกรายจ่ายเรียบร้อย');
      setAmount(''); 
      setDescription('');
      setPoolActuals({ MATERIAL: '', LABOR: '', OPS: '', PROFIT: '', DELIVERY: '' });
      setShowReconcile(false);
      if (!continuousEntry) {
        setNotes('');
        setVendor('');
        setReceiptUrl(null);
        setSelectedPool('');
        setSelectedCat('');
        setDate(dayjs().format('YYYY-MM-DD'));
      }
      setIsStockIn(false); setSelectedInventoryItemId(''); setStockInQty('');
      onSaved();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Theme helpers ──
  const card = isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const inputBase = isDarkMode
    ? 'bg-slate-900/60 border-slate-700 text-slate-200 placeholder-slate-600 focus:border-emerald-500'
    : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-emerald-500';
  const heading = isDarkMode ? 'text-white' : 'text-slate-900';
  const subtext = isDarkMode ? 'text-slate-300' : 'text-slate-700';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Form */}
      <div className={`lg:col-span-2 rounded-2xl border p-6 transition-all ${card}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold flex items-center gap-2 ${heading}`}>
            <TrendingDown size={20} className="text-red-500" /> บันทึกรายจ่าย
          </h3>
        </div>

        {/* 💡 Helper Guide Banner */}
        <div className="mb-5 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 text-xs space-y-2">
          <div className="flex items-center gap-2 text-rose-950 dark:text-rose-200 font-bold text-sm">
            <TrendingDown size={16} className="text-rose-700 dark:text-rose-400 shrink-0" />
            <span>คำแนะนำ: เลือกระบุกองทุนที่ต้องการตัดเงินตามมาตรฐาน 7 กองทุน (04/08/2569)</span>
          </div>
          <p className="text-slate-900 dark:text-slate-100 text-xs font-medium leading-relaxed">
            • <strong className="font-bold text-slate-950 dark:text-white">วัตถุดิบ (40%):</strong> ซื้อเนื้อสัตว์ ผักสด เครื่องปรุง ซอส ข้าว วัตถุดิบในครัว<br />
            • <strong className="font-bold text-slate-950 dark:text-white">ค่าบิล & ถุงซีล (10%):</strong> ค่าถุงซีล 2 ชั้น ค่าน้ำ ค่าไฟ ค่าแก๊ส น้ำยาทำความสะอาด<br />
            • <strong className="font-bold text-slate-950 dark:text-white">ค่าแรงคนทำ (14%):</strong> จ่ายค่าทำอาหารตามจำนวนแพ็คที่ผลิต<br />
            • <strong className="font-bold text-slate-950 dark:text-white">ช่วยส่ง Grab (9%):</strong> จ่ายค่ารอบส่งไรเดอร์ตามรอบจัดส่งจริง<br />
            • <strong className="font-bold text-slate-950 dark:text-white">งบการตลาด (4%):</strong> ค่ายิงแอด ทำคอนเทนต์ โฆษณา<br />
            • <strong className="font-bold text-slate-950 dark:text-white">ทุนสำรอง/ซ่อมบำรุง (4%):</strong> ซ่อมบำรุงเครื่องซีล ตู้เย็น เตาอบ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Cash Status Card with Reconcile */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
          }`}>
             <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                      <Calculator size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">เงินสดหน้าร้านพร้อมใช้ (รวมทุกกอง)</p>
                      <p className={`text-2xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        ฿{totalCash.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                   </div>
                </div>
                <div className="text-right">
                   <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                     Active Mode
                   </span>
                </div>
             </div>
          </div>

          {/* Pool Selection & Multi-Pool Reconcile */}
          <div>
            <div className="flex items-center justify-between mb-3">
               <label className={`block text-xs font-bold uppercase tracking-wider ${subtext}`}>หักเงินจากกองทุน</label>
               {!showReconcile && (
                 <button 
                   type="button"
                   onClick={() => setShowReconcile(true)}
                   className={`text-[10px] font-bold flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                     isDarkMode ? 'border-slate-700 text-slate-200 hover:text-white' : 'border-slate-300 text-slate-700 hover:text-slate-900'
                   }`}
                 >
                   <RefreshCw size={10} />
                   🔍 เช็คยอดธนาคาร
                 </button>
               )}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {((pools.length > 0 ? pools.map(p => p.pool_type as PoolType) : ['MATERIAL', 'PACKAGING_BILLS', 'LABOR', 'DELIVERY', 'MARKETING', 'MAINTENANCE', 'PROFIT'] as PoolType[])).map(pt => {
                const cfg = getPoolConfig(pt);
                const pool = pools.find(p => p.pool_type === pt);
                const actual = poolActuals[pt];
                const diff = actual ? Number(actual) - (pool?.current_balance || 0) : 0;

                return (
                  <div key={pt} className="space-y-2">
                    <button type="button" onClick={() => setSelectedPool(pt)}
                      className={`w-full flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                        selectedPool === pt 
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' 
                          : isDarkMode ? 'border-slate-700 bg-slate-900/40 opacity-70 hover:opacity-100' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}>
                      <span className="text-xl mb-1">{cfg.icon}</span>
                      <span className={`text-[11px] font-bold ${selectedPool === pt ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {cfg.label.split('/')[0]}
                      </span>
                      <span className="text-[10px] font-bold font-mono text-slate-700 mt-0.5">฿{(pool?.current_balance || 0).toLocaleString()}</span>
                    </button>

                    {showReconcile && (
                      <div className="space-y-1">
                        <div className="relative">
                           <input 
                             type="number"
                             value={actual}
                             onChange={e => setPoolActuals(prev => ({ ...prev, [pt]: e.target.value }))}
                             placeholder="ยอดจริง..."
                             className={`w-full p-2 rounded-xl text-[10px] font-black text-center border outline-none transition-all ${
                               isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-500 shadow-sm'
                             }`}
                           />
                        </div>
                        {actual && (
                          <div className={`text-[9px] font-black text-center ${diff === 0 ? 'text-emerald-500' : diff > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                            {diff === 0 ? '✓ ตรงเป๊ะ' : `${diff > 0 ? '+' : ''}${diff.toLocaleString()}`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {showReconcile && (
              <div className="mt-4 flex justify-center gap-3">
                 <button 
                   type="button"
                   onClick={() => setShowReconcile(false)}
                   className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                     isDarkMode ? 'border-slate-700 text-slate-200 hover:text-white' : 'border-slate-300 text-slate-700 font-bold hover:text-slate-900'
                   }`}
                 >
                    ยกเลิก
                 </button>
                 <button 
                   type="button"
                   onClick={() => (document.getElementById('submit-expense-btn') as HTMLButtonElement)?.click()}
                   className="flex items-center gap-2 px-8 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
                 >
                    <Calculator size={16} />
                    🔍 สรุปและปรับยอด
                 </button>
              </div>
            )}
          </div>

          {/* Category & Amount */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-xs font-bold mb-1 ${subtext}`}>วันที่จ่าย</label>
              <div className="relative">
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className={`w-full p-2.5 pl-10 border rounded-xl text-sm outline-none transition-all ${inputBase}`} />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-bold mb-1 ${subtext}`}>หมวดหมู่</label>
              <select value={selectedCat} onChange={e => handleCategoryChange(e.target.value)}
                className={`w-full p-2.5 border rounded-xl text-sm outline-none transition-all ${inputBase}`}>
                <option value="">เลือกหมวดหมู่...</option>
                {filteredCats.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-bold mb-1 ${subtext}`}>จำนวนเงิน (฿)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full p-2.5 border rounded-xl text-lg font-bold text-red-500 outline-none transition-all ${inputBase}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ${subtext}`}>จ่ายให้ใคร / ร้านค้า (ถ้าจำได้)</label>
            <div className="relative">
              <input type="text" value={vendor} onChange={e => setVendor(e.target.value)}
                placeholder="เช่น ตลาดไท, แม็คโคร, ค่าน้ำแข็ง..."
                className={`w-full p-2.5 pl-10 border rounded-xl text-sm outline-none transition-all ${inputBase}`} />
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            </div>
          </div>

          {/* Inventory Link (Only for MATERIAL) */}
          {selectedPool === 'MATERIAL' && (
             <div className={`p-4 rounded-2xl border transition-all ${
               isStockIn 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : isDarkMode ? 'bg-slate-900/40 border-slate-700/30 opacity-80' : 'bg-slate-50 border-slate-200 opacity-80'
             }`}>
                <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                      <Box size={18} className={isStockIn ? 'text-emerald-500' : 'text-slate-400'} />
                      <p className={`text-sm font-bold ${isStockIn ? 'text-emerald-500' : isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>เชื่อมสต็อก (Stock In)</p>
                   </div>
                   <button 
                     type="button"
                     onClick={() => setIsStockIn(!isStockIn)}
                     className={`w-10 h-5 rounded-full relative transition-all ${isStockIn ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                   >
                     <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isStockIn ? 'left-5' : 'left-0.5'}`} />
                   </button>
                </div>
                
                {isStockIn && (
                   <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div>
                         <label className="block text-[10px] font-bold text-slate-500 mb-1">เลือกวัตถุดิบ</label>
                         <select 
                            value={selectedInventoryItemId} 
                            onChange={e => setSelectedInventoryItemId(e.target.value)}
                            className={`w-full p-2 text-xs border rounded-lg outline-none focus:border-emerald-500 transition-all ${
                              isDarkMode ? 'bg-slate-950/50 border-slate-800 text-slate-300' : 'bg-white border-slate-200'
                            }`}
                          >
                            <option value="">-- ค้นหาวัตถุดิบ --</option>
                            {inventoryItems.map(item => (
                               <option key={item.id} value={item.id}>{item.name} ({item.storage_unit})</option>
                            ))}
                         </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">จำนวนที่รับเข้า</label>
                            <div className="flex items-center gap-2">
                               <input 
                                 type="number" 
                                 value={stockInQty} 
                                 onChange={e => setStockInQty(e.target.value)}
                                 className={`w-full p-2 text-xs border rounded-lg outline-none transition-all ${
                                   isDarkMode ? 'bg-slate-950/50 border-slate-800 text-slate-300' : 'bg-white border-slate-200'
                                 }`}
                                 placeholder="0"
                               />
                               <span className="text-[10px] text-slate-400">
                                  {inventoryItems.find(i => i.id === selectedInventoryItemId)?.storage_unit || '-'}
                               </span>
                            </div>
                         </div>
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">เฉลี่ยต้นทุน</label>
                            <p className={`text-xs font-bold pt-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                               ฿{(Number(amount) / (Number(stockInQty) || 1)).toFixed(2)} / หน่วย
                            </p>
                         </div>
                      </div>
                   </div>
                )}
             </div>
          )}

          {/* Details */}
          <div>
            <label className={`block text-xs font-bold mb-1 ${subtext}`}>รายละเอียดรายจ่าย</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="เช่น ซื้อไก่ 50kg ตลาดไท"
              className={`w-full p-2.5 border rounded-xl text-sm outline-none transition-all ${inputBase}`} />
          </div>

          {/* Receipt Upload UI */}
          <div className={`p-4 rounded-xl border border-dashed flex flex-col items-center justify-center transition-all ${
            receiptUrl 
              ? isDarkMode ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-emerald-500 bg-emerald-50/50' 
              : isDarkMode ? 'border-slate-700 bg-slate-900/40' : 'border-slate-300 bg-slate-50'
          }`}>
             {receiptUrl ? (
                <div className="relative w-full flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-white border border-emerald-100 flex items-center justify-center overflow-hidden">
                         <img src={receiptUrl || undefined} alt="Receipt" className="object-cover w-full h-full" />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-emerald-700">อัปโหลดใบเสร็จแล้ว</p>
                         <p className="text-[10px] text-slate-500">receipt_image.jpg</p>
                      </div>
                   </div>
                   <button onClick={() => setReceiptUrl(null)} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition-all">
                      <X size={16} />
                   </button>
                </div>
             ) : (
                <button type="button" onClick={() => setReceiptUrl('https://placehold.co/400x600?text=Receipt+Preview')}
                  className={`flex flex-col items-center gap-2 transition-colors ${
                     isDarkMode ? 'text-slate-500 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-500'
                   }`}>
                   <PlusCircle size={24} />
                   <span className="text-xs font-medium">แนบไฟล์ใบเสร็จ (JPG/PNG)</span>
                </button>
             )}
          </div>

          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setContinuousEntry(!continuousEntry)}
              className={`flex-1 py-3.5 border rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                continuousEntry 
                  ? 'bg-red-500/10 border-red-500 text-red-600' 
                  : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${continuousEntry ? 'bg-red-500 border-red-500' : 'border-slate-400'}`}>
                 {continuousEntry && <span className="text-white text-[10px]">✓</span>}
              </div>
              บันทึกต่อเนื่อง
            </button>
            <button type="submit" id="submit-expense-btn" 
              disabled={isSubmitting || (!amount && !showReconcile) || (!selectedPool && !showReconcile)}
              className="flex-[2] py-3.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : '💸 ยืนยันบันทึก'}
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Context */}
      <div className="space-y-6">
        {/* Budget Status */}
        <div className={`rounded-2xl border p-5 transition-all ${card}`}>
          <h3 className={`text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2 ${subtext}`}>
            <Calculator size={14} /> สถานะงบประมาณรายเดือน
          </h3>
          <div className="space-y-5">
            {pools.map(p => {
              const cfg = getPoolConfig(p.pool_type);
              const spent = p.total_out || 0;
              const target = p.target_amount || 1;
              const pct = Math.min(100, (spent / target) * 100);
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      ฿{spent.toLocaleString()} / ฿{target.toLocaleString()}
                    </span>
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden flex ${isDarkMode ? 'bg-slate-900' : 'bg-slate-200'}`}>
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-end">
                    <span className={`text-[10px] font-bold ${pct > 90 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                      {pct.toFixed(1)}% ของงบที่ตั้งไว้
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warning Card */}
        {activePoolData && activePoolData.current_balance < (activePoolData.target_amount * 0.2) && (
           <div className={`border-2 rounded-2xl p-4 flex gap-3 shadow-sm transition-all ${
             isDarkMode ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-300'
           }`}>
              <AlertCircle className={`shrink-0 ${isDarkMode ? 'text-rose-400' : 'text-rose-700'}`} size={20} />
              <div>
                 <p className={`text-xs font-black uppercase ${
                   isDarkMode ? 'text-rose-300' : 'text-rose-900'
                 }`}>คำเตือน: เงินกองทุนต่ำมาก</p>
                 <p className={`text-xs mt-1 leading-relaxed ${
                   isDarkMode ? 'text-slate-200' : 'text-slate-800'
                 }`}>
                    ยอดเงินในกอง <span className={`font-black ${isDarkMode ? 'text-rose-400' : 'text-rose-700'}`}>{activePoolData.display_name === 'ค่าดำเนินการ' ? 'ค่าบิล & ถุงซีล' : activePoolData.display_name}</span> เหลือเพียง <span className={`font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>฿{activePoolData.current_balance.toLocaleString(undefined, { minimumFractionDigits: activePoolData.current_balance % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}</span> ซึ่งต่ำกว่า 20% ของงบประมาณที่ควรมี
                 </p>
              </div>
           </div>
        )}

        {/* Session History (Quick Check) */}
        {sessionEntries.length > 0 && (
          <div className={`p-5 rounded-2xl border border-dashed transition-all ${card}`}>
             <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-3 flex items-center gap-2">
                <HistoryIcon size={14} /> เพิ่งบันทึกไป (เซสชั่นนี้)
             </h4>
             <div className="space-y-2">
                {sessionEntries.map(entry => (
                   <div key={entry.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800">
                      <div>
                         <p className={`font-bold ${heading}`}>{entry.cat || 'ค่าใช้จ่าย'} {entry.vendorName && `(${entry.vendorName})`}</p>
                         <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium">{dayjs(entry.date).format('DD/MM/YYYY')}</p>
                      </div>
                      <p className="font-bold text-red-600 font-mono">฿{entry.amount.toLocaleString()}</p>
                   </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
